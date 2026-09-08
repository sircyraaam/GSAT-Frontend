/* GSAT — SAM / REM Assignment (Admin)
   Panels and row markup live in public/sam-assignment.html. Same shape as the
   SAS Assignment page: pick a manager on the left, see what they hold, move a
   sub-territory across from the right. Each list refreshes on its own, so
   typing in a filter never loses the caret. */
GSAT.page('sam-assignment', function (S) {
  'use strict';
  var $ = jQuery;

  var M = GSAT.MAP();
  var allSam = [];
  M.forEach(function (m) { if (allSam.indexOf(m[5]) < 0) allSam.push(m[5]); });
  allSam.sort();

  var selected = allSam[0] || '';

  /* One row per sub-territory: the master list holds one row per area, so the
     areas are counted up and the manager comes from the override if there is one. */
  function subTerritories() {
    var seen = {}, order = [];

    M.forEach(function (m) {
      var key = m[0] + '|' + m[1];
      if (!seen[key]) {
        seen[key] = { key: key, territory: m[0], subTerritory: m[1], areas: 0, defaultSam: m[5] };
        order.push(key);
      }
      seen[key].areas += 1;
    });

    return order.map(function (key) {
      var row = seen[key];
      var override = S.samOverrides[key];
      return {
        key: key, territory: row.territory, subTerritory: row.subTerritory, areas: row.areas,
        defaultSam: row.defaultSam,
        // '' is a removal — the sub-territory is left with no manager
        sam: (override === undefined) ? row.defaultSam : override,
        moved: override !== undefined && override !== '' && override !== row.defaultSam
      };
    });
  }

  function areasLabel(n) { return n + (n === 1 ? ' area' : ' areas'); }

  /* ---------------- managers ---------------- */
  function renderManagers() {
    var all = subTerritories();
    var query = $('#sam-filter').val().trim().toLowerCase();
    var $list = $('#manager-list').empty();

    allSam.filter(function (name) { return !query || name.toLowerCase().indexOf(query) >= 0; })
      .forEach(function (name) {
        var mine = all.filter(function (s) { return s.sam === name; });
        var territories = [];
        mine.forEach(function (s) { if (territories.indexOf(s.territory) < 0) territories.push(s.territory); });

        var $row = GSAT.tpl('tpl-manager-row');
        $row.attr('data-name', name).toggleClass('on', name === selected);
        GSAT.bind($row, {
          name: name, count: mine.length,
          scope: territories.length === 1 ? territories[0]
            : (territories.length ? territories.length + ' territories' : 'Nothing assigned')
        });
        $list.append($row);
      });
  }

  /* ---------------- what the selection holds ---------------- */
  function renderMine() {
    var mine = subTerritories().filter(function (s) { return s.sam === selected; });
    var $list = $('#mine-list').empty();

    $('#mine-empty').prop('hidden', !!mine.length);

    mine.forEach(function (s) {
      var $row = GSAT.bind(GSAT.tpl('tpl-mine-row'), {
        subTerritory: s.subTerritory,
        where: s.territory + ' · ' + areasLabel(s.areas)
      });
      $row.attr('data-key', s.key).attr('data-sub', s.subTerritory).attr('data-default', s.defaultSam);
      $row.find('.gsat-chip-moved').prop('hidden', !s.moved);
      $list.append($row);
    });

    var areas = mine.reduce(function (n, s) { return n + s.areas; }, 0);
    GSAT.bind($('body'), {
      selectedSam: selected || 'No manager selected',
      subCount: mine.length + (mine.length === 1 ? ' sub-territory' : ' sub-territories') +
        ' · ' + areasLabel(areas)
    });
  }

  /* ---------------- the pool to move from ---------------- */
  function renderPool() {
    var query = $('#sub-search').val().trim().toLowerCase();
    var $list = $('#pool-list').empty();

    var matches = subTerritories().filter(function (s) {
      return !query || (s.subTerritory + ' ' + s.territory).toLowerCase().indexOf(query) >= 0;
    });

    $('#pool-empty').prop('hidden', !!matches.length);

    matches.forEach(function (s) {
      var alreadyMine = s.sam === selected;
      var $row = GSAT.bind(GSAT.tpl('tpl-pool-row'), {
        subTerritory: s.subTerritory,
        owner: (alreadyMine ? 'Already with ' + selected
          : (s.sam ? 'Currently ' + s.sam : 'No manager')) +
          ' · ' + areasLabel(s.areas)
      });
      $row.attr('data-key', s.key).attr('data-sub', s.subTerritory);
      $row.find('.sub-assign').prop('hidden', alreadyMine);
      $row.find('.sub-assigned').prop('hidden', !alreadyMine);
      $list.append($row);
    });
  }

  function renderSummary() {
    var rows = subTerritories();
    var moved = rows.filter(function (s) { return s.moved; }).length;
    GSAT.bind($('body'), {
      summary: rows.length + ' sub-territories · ' + allSam.length + ' managers' +
        (moved ? ' · ' + moved + ' reassigned' : '')
    });
  }

  function renderAll() {
    renderManagers();
    renderMine();
    renderPool();
    renderSummary();
  }
  renderAll();

  /* ---------------- events ---------------- */
  $('#sam-filter').on('input', renderManagers);
  $('#sub-search').on('input', renderPool);

  $('#manager-list').on('click', '.gsat-person-row', function () {
    selected = $(this).attr('data-name');
    renderAll();
  });

  function rowOf(key) {
    return subTerritories().filter(function (s) { return s.key === key; })[0];
  }

  function esc(text) { return $('<div>').text(text == null ? '' : text).html(); }

  /* Both moves reach every area under the sub-territory, so each one is
     confirmed before it is written. */
  $('#pool-list').on('click', '.sub-assign', function () {
    var key = $(this).closest('.gsat-person-row').attr('data-key');
    var s = rowOf(key);
    if (!s || s.sam === selected) return;

    var to = selected;
    GSAT.ask({
      title: 'Move this sub-territory?',
      html: '<b>' + esc(s.subTerritory) + '</b> moves from <b>' + esc(s.sam) +
        '</b> to <b>' + esc(to) + '</b>.<br>' + areasLabel(s.areas) + ' come with it.',
      confirmText: 'Yes, assign',
      confirmClass: 'btn-success'
    }).then(function (ok) {
      if (!ok) return;
      S.samOverrides[key] = to;
      GSAT.save();
      GSAT.log('Assign', 'SAM / REM Assignment', s.subTerritory,
        'Sub-territory assigned to ' + to + (s.sam ? ', taken from ' + s.sam : ', previously unmanaged') +
        '. ' + areasLabel(s.areas) + ' moved with it.');
      renderAll();
      GSAT.banner('ok', s.subTerritory + ' now managed by ' + to + '.');
    });
  });

  $('#mine-list').on('click', '.sub-remove', function () {
    var key = $(this).closest('.gsat-person-row').attr('data-key');
    var s = rowOf(key);
    if (!s) return;

    var from = s.sam;
    GSAT.ask({
      title: 'Remove this sub-territory?',
      html: '<b>' + esc(s.subTerritory) + '</b> is taken off <b>' + esc(from) + '</b>.<br>' +
        'Its ' + areasLabel(s.areas) + ' stay without a manager until one picks it up.',
      icon: 'warning',
      confirmText: 'Yes, remove',
      confirmClass: 'btn-outline-danger'
    }).then(function (ok) {
      if (!ok) return;
      S.samOverrides[key] = '';
      GSAT.save();
      GSAT.log('Remove', 'SAM / REM Assignment', s.subTerritory,
        'Sub-territory taken off ' + from + '. Its ' + areasLabel(s.areas) + ' are left unmanaged.');
      renderAll();
      GSAT.banner('warn', s.subTerritory + ' removed from ' + from + '.');
    });
  });
});
