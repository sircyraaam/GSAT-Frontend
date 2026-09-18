/* GSAT — Dashboard (role-aware: SAS / Admin / SAM)
   The three dashboards are all present in public/dashboard.html; app.js has
   already removed the ones this role cannot see by the time we get here. */
GSAT.page('dashboard', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;
  var role = GSAT.role();

  /* shared: fill a container with bar rows */
  function drawBars($into, rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    $into.empty();
    rows.forEach(function (r) {
      var $row = GSAT.tpl('tpl-bar-row');
      GSAT.bind($row, { label: r.label, value: r.value });
      $row.find('.gsat-bar').css('width', Math.round(r.value / max * 100) + '%');
      $into.append($row);
    });
  }

  /* ---------------------------- SAS ---------------------------- */
  function renderSas() {
    var counts = { total: 0 };
    D.STATUS_ORDER.forEach(function (k) {
      counts[k] = D.BASE_STATUS[k] + S.records.filter(function (r) { return r.status === k; }).length;
      counts.total += counts[k];
    });

    GSAT.bind($('body'), {
      sasTotal: counts.total, sasPending: counts.Pending,
      sasOngoing: counts.Ongoing, sasCompleted: counts.Completed,
      donutTotal: counts.total
    });

    // donut: one conic-gradient slice per status
    var acc = 0;
    var slices = D.STATUS_ORDER.map(function (k) {
      var from = acc / counts.total * 100;
      acc += counts[k];
      return D.STATUS_COLOR[k] + ' ' + from.toFixed(1) + '% ' + (acc / counts.total * 100).toFixed(1) + '%';
    });
    $('#status-donut').css('background', 'conic-gradient(' + slices.join(',') + ')');

    var $legend = $('#status-legend').empty();
    D.STATUS_ORDER.forEach(function (k) {
      var $row = GSAT.tpl('tpl-legend-row');
      GSAT.bind($row, { label: k, value: counts[k] });
      $row.find('.legend-dot').css('background', D.STATUS_COLOR[k]);
      $legend.append($row);
    });

    // monthly bars
    var maxMonth = Math.max.apply(null, D.MONTHLY.map(function (m) { return m.value; }));
    var $bars = $('#month-bars').empty(), $labels = $('#month-labels').empty();
    D.MONTHLY.forEach(function (m) {
      var $col = GSAT.tpl('tpl-month-col');
      GSAT.bind($col, { value: m.value });
      $col.find('.gsat-vbar').css('height', Math.round(m.value / maxMonth * 150) + 'px');
      $bars.append($col);
      $labels.append(GSAT.bind(GSAT.tpl('tpl-month-label'), { label: m.label }));
    });

    drawBars($('#territory-bars'), D.TERRITORIES.map(function (t) {
      return {
        label: t.code,
        value: S.records.filter(function (r) { return r.territory === t.code; }).length + (D.BASE_TERR[t.code] || 0)
      };
    }));

    var $recent = $('#recent-records').empty();
    S.records.slice(-4).reverse().forEach(function (r) {
      var $row = GSAT.tpl('tpl-recent-row');
      GSAT.bind($row, { code: r.code, tradeArea: r.tradeArea });
      GSAT.chip($row.find('.gsat-chip'), r.status);
      $recent.append($row);
    });
  }

  /* --------------------------- ADMIN --------------------------- */
  function renderAdmin() {
    var draft = {};

    function unassignedSites() {
      return S.records.filter(function (r) { return !S.assignments[r.code] && r.status === 'Pending'; });
    }

    function renderLoad() {
      drawBars($('#admin-load'), D.SAS_TEAM.map(function (p) {
        var extra = Object.keys(S.assignments).filter(function (c) { return S.assignments[c] === p.name; }).length;
        return { label: p.name, value: p.load + extra };
      }));
    }

    function renderUnassigned() {
      var rows = unassignedSites();

      GSAT.bind($('body'), {
        admUnassigned: rows.length,
        admSpecialists: D.SAS_TEAM.length,
        admManagers: D.MANAGERS.length
      });

      $('#unassigned-wrap').prop('hidden', !rows.length);
      $('#unassigned-empty').prop('hidden', !!rows.length);

      var $body = $('#unassigned-body').empty();
      rows.forEach(function (r) {
        var $row = GSAT.tpl('tpl-unassigned-row');
        $row.attr('data-code', r.code);
        GSAT.bind($row, {
          code: r.code, tradeArea: r.tradeArea,
          where: r.municipality + ' · ' + r.territory
        });
        GSAT.options($row.find('.assign-pick'), D.SAS_TEAM.map(function (p) { return p.name; }), '', 'Select SAS');
        $body.append($row);
      });
    }

    renderUnassigned();
    renderLoad();

    var $coverage = $('#admin-coverage').empty();
    D.MANAGERS.forEach(function (m) {
      $coverage.append(GSAT.bind(GSAT.tpl('tpl-coverage-row'), {
        code: m.code, manager: m.manager, specialists: m.specialists
      }));
    });

    $('#unassigned-body').on('change', '.assign-pick', function () {
      var $row = $(this).closest('tr');
      draft[$row.attr('data-code')] = $(this).val();
      $row.find('.assign-btn').prop('disabled', !$(this).val());
    });

    $('#unassigned-body').on('click', '.assign-btn', function () {
      var code = $(this).closest('tr').attr('data-code');
      var who = draft[code];
      if (!who) return;

      S.assignments[code] = who;
      GSAT.save();
      GSAT.log('Assign', 'Dashboard', code, 'Site assigned to ' + who + '.');
      renderUnassigned();
      renderLoad();
      GSAT.banner('ok', code + ' assigned to ' + who + '.');
    });
  }

  /* ---------------------------- SAM ---------------------------- */
  function renderSam() {
    var territory = GSAT.samTerritory();
    var scoped = GSAT.mappedRecords().filter(function (r) { return r.territory === territory; });
    var queue = S.records.filter(function (r) {
      var m = GSAT.mapLookup(r.municipality);
      return r.status === 'For SAM Approval' && m && m.territory === territory;
    });

    var M = GSAT.MAP();
    var names = [];
    M.forEach(function (m) { if (m[0] === territory && names.indexOf(m[6]) < 0) names.push(m[6]); });

    GSAT.bind($('body'), {
      samTerritory: territory,
      samQueue: queue.length,
      samApproved: S.decisions.filter(function (d) { return d.action === 'Approved'; }).length,
      samReturned: S.decisions.filter(function (d) { return d.action === 'Returned'; }).length,
      samScoped: scoped.length,
      samSasCount: names.length,
      samDecisionCount: S.decisions.length
    });

    var $queue = $('#sam-queue').empty();
    $('#sam-queue-empty').prop('hidden', !!queue.length);
    queue.forEach(function (q) {
      var m = GSAT.mapLookup(q.municipality);
      $queue.append(GSAT.bind(GSAT.tpl('tpl-queue-row'), {
        code: q.code, tradeArea: q.tradeArea,
        where: q.municipality + ' · ' + q.territory,
        sas: GSAT.assignedTo(S.assignments[q.code], m ? m.sas : 'Unassigned')
      }));
    });

    $('#sam-specialists-empty').prop('hidden', !!names.length);
    drawBars($('#sam-specialists'), names.map(function (n) {
      return {
        label: n,
        value: M.filter(function (m) { return m[0] === territory && m[6] === n; }).length
      };
    }));

    var $decisions = $('#sam-decisions').empty();
    $('#sam-decisions-empty').prop('hidden', !!S.decisions.length);
    S.decisions.forEach(function (d) {
      var $row = GSAT.bind(GSAT.tpl('tpl-decision-row'), {
        code: d.code, when: d.when, reason: d.reason ? 'Reason: ' + d.reason : ''
      });
      GSAT.chip($row.find('.gsat-chip'), d.action);
      $row.find('.js-reason').prop('hidden', !d.reason);
      $decisions.append($row);
    });

    /* status mix: one bar split by status, then the legend that names the
       parts. Six separate bar rows made the reader add them up before the
       shape of the territory showed — the proportions are the point here. */
    var mix = ['Pending', 'Ongoing', 'For SAM Approval', 'Approved', 'Completed', 'Fall-Out']
      .map(function (k) {
        return {
          label: k,
          color: D.STATUS_COLOR[k] || '#6f42c1',
          value: scoped.filter(function (r) { return r.status === k; }).length
        };
      });
    var mixTotal = mix.reduce(function (n, s) { return n + s.value; }, 0);

    // an empty territory leaves the track showing rather than a bar of nothing
    var $bar = $('#sam-mix-bar').empty();
    mix.forEach(function (s) {
      if (!s.value) return;
      $('<span>')
        .attr('title', s.label + ': ' + s.value)
        .css({ background: s.color, width: (s.value / mixTotal * 100) + '%' })
        .appendTo($bar);
    });

    var $mix = $('#sam-status-mix').empty();
    mix.forEach(function (s) {
      var $row = GSAT.tpl('tpl-legend-row');
      GSAT.bind($row, { label: s.label, value: s.value });
      $row.find('.legend-dot').css('background', s.color);
      $mix.append($row);
    });
  }

  /* ---------------------------- REM ----------------------------
     A region is several territories, so everything here counts across the list
     GSAT.remTerritories() returns rather than matching one string. */
  function renderRem() {
    var region = GSAT.remRegion();
    var M = GSAT.MAP().filter(function (m) { return GSAT.inRemRegion(m[0]); });
    var scoped = GSAT.mappedRecords().filter(function (r) { return GSAT.inRemRegion(r.territory); });

    /* one row per sub-territory, so a manager holding several is visible as
       several rows — the SAM override is what counts, not the master list */
    var seen = {}, subs = [];
    M.forEach(function (m) {
      var key = m[0] + '|' + m[1];
      if (!seen[key]) {
        seen[key] = { territory: m[0], subTerritory: m[1], sam: GSAT.effSam(m), areas: 0 };
        subs.push(seen[key]);
      }
      seen[key].areas += 1;
    });

    var sams = [], specialists = [];
    subs.forEach(function (s) { if (s.sam && sams.indexOf(s.sam) < 0) sams.push(s.sam); });
    M.forEach(function (m) { if (specialists.indexOf(m[6]) < 0) specialists.push(m[6]); });
    specialists.sort();

    // franchisable already means Franchise-Owned *and* past approval, so a
    // Company-Owned site and one still in assessment both stay out of this list
    var unnamed = scoped.filter(function (r) { return r.franchisable && !r.franchisee; });

    GSAT.bind($('body'), {
      remRegion: region.region,
      remScope: region.territories.length ? region.territories.join(' · ') : 'All territories',
      remTerritoryCount: region.territories.length + ' territories',
      remSites: scoped.length,
      remSamCount: sams.length,
      remSasCount: specialists.length,
      remSubCount: subs.length,
      remNoFranchisee: unnamed.length
    });

    var $managers = $('#rem-managers').empty();
    $('#rem-managers-empty').prop('hidden', !!subs.length);
    subs.forEach(function (s) {
      var $row = GSAT.bind(GSAT.tpl('tpl-rem-manager-row'), {
        subTerritory: s.subTerritory,
        manager: s.sam || 'No manager',
        territory: s.territory,
        areas: s.areas + (s.areas === 1 ? ' area' : ' areas')
      });
      // a sub-territory nobody holds reads as an absence, not as a name
      $row.find('.gsat-cov-sam').toggleClass('none', !s.sam);
      $managers.append($row);
    });

    $('#rem-specialists-empty').prop('hidden', !!specialists.length);
    drawBars($('#rem-specialists'), specialists.map(function (n) {
      return { label: n, value: M.filter(function (m) { return m[6] === n; }).length };
    }));

    var $unnamed = $('#rem-unnamed').empty();
    $('#rem-unnamed-empty').prop('hidden', !!unnamed.length);
    unnamed.forEach(function (r) {
      var $row = GSAT.tpl('tpl-recent-row');
      GSAT.bind($row, { code: r.code, tradeArea: r.tradeArea });
      GSAT.chip($row.find('.gsat-chip'), r.status);
      $unnamed.append($row);
    });
  }

  if (role === 'Admin') renderAdmin();
  else if (role === 'SAM') renderSam();
  else if (role === 'REM') renderRem();
  else renderSas();
});
