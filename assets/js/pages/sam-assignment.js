GSAT.page('sam-assignment', function (S) {
  'use strict';
  var $ = jQuery;

  var allSam = [];
  function addSam(name) {
    if (name && allSam.indexOf(name) < 0) allSam.push(name);
  }
  GSAT.MAP().forEach(function (row) { addSam(row[5]); });
  S.records.forEach(function (record) { addSam(S.samAssignments[record.code]); });
  allSam = allSam.filter(function (name) { return name !== 'Unassigned' && name !== 'Unmapped'; });
  allSam.sort();

  var selected = allSam[0] || '';

  function sites() {
    return S.records.map(function (record) {
      var mapped = GSAT.mapLookup(record.municipality);
      return {
        code: record.code,
        tradeArea: record.tradeArea,
        municipality: record.municipality,
        territory: mapped ? mapped.territory : record.territory,
        subTerritory: record.subTerritory || (mapped ? mapped.subTerritory : 'Not in mapping'),
        status: record.status,
        sam: GSAT.assignedTo(S.samAssignments[record.code], mapped ? mapped.sam : 'Unassigned'),
        sas: GSAT.assignedTo(S.assignments[record.code],
          record.createdBy || (mapped ? mapped.sas : 'Unassigned'))
      };
    });
  }

  /* 'Unassigned' and 'Unmapped' are placeholders, not people. */
  function hasOwner(site) {
    return !!site.sam && allSam.indexOf(site.sam) >= 0;
  }

  function siteOf(code) {
    return sites().filter(function (site) { return site.code === code; })[0];
  }

  function renderManagers() {
    var all = sites();
    var query = $('#sam-filter').val().trim().toLowerCase();
    var $list = $('#manager-list').empty();

    allSam.filter(function (name) { return !query || name.toLowerCase().indexOf(query) >= 0; })
      .forEach(function (name) {
        var mine = all.filter(function (site) { return site.sam === name; });
        var territories = [];
        mine.forEach(function (site) { if (territories.indexOf(site.territory) < 0) territories.push(site.territory); });

        var $row = GSAT.tpl('tpl-manager-row');
        $row.attr('data-name', name).toggleClass('on', name === selected);
        GSAT.bind($row, {
          name: name, count: mine.length,
          scope: territories.length === 1 ? territories[0]
            : (territories.length ? territories.length + ' territories' : 'No sites assigned')
        });
        $list.append($row);
      });
  }

  function renderSites() {
    var mine = sites().filter(function (site) { return site.sam === selected; });
    var $list = $('#site-list').empty();

    $('#site-empty').prop('hidden', !!mine.length);

    mine.slice(0, 40).forEach(function (site) {
      var $row = GSAT.bind(GSAT.tpl('tpl-site-row'), {
        code: site.code,
        tradeArea: site.tradeArea,
        sas: 'SAS: ' + site.sas,
        where: [site.municipality, site.subTerritory, site.status].filter(Boolean).join(' · ')
      });
      $row.attr('data-code', site.code);
      $list.append($row);
    });

    GSAT.bind($('body'), {
      selectedSam: selected || 'No manager selected',
      siteCount: mine.length + (mine.length === 1 ? ' site assigned' : ' sites assigned')
    });
  }

  function renderResults() {
    var query = $('#site-search').val().trim().toLowerCase();
    var $list = $('#result-list').empty();
    var matches = query.length < 2 ? [] : sites().filter(function (site) {
      return (site.code + ' ' + site.tradeArea + ' ' + site.municipality).toLowerCase().indexOf(query) >= 0;
    }).slice(0, 25);

    $('#result-hint').prop('hidden', query.length >= 2);
    $('#result-empty').prop('hidden', query.length < 2 || !!matches.length);

    matches.forEach(function (site) {
      var alreadyMine = site.sam === selected;
      var $row = GSAT.bind(GSAT.tpl('tpl-result-row'), {
        code: site.code,
        tradeArea: site.tradeArea,
        owner: hasOwner(site)
          ? (alreadyMine ? 'Assigned to ' + selected : 'Currently assigned to ' + site.sam)
          : 'Unassigned'
      });
      $row.attr('data-code', site.code);
      $row.find('.site-reassign').prop('hidden', alreadyMine);
      $row.find('.site-assigned').prop('hidden', !alreadyMine);
      $list.append($row);
    });
  }

  function renderSummary() {
    var assigned = sites().filter(hasOwner).length;
    GSAT.bind($('body'), {
      summary: S.records.length + ' created sites · ' + assigned + ' assigned · ' + allSam.length + ' SAMs'
    });
  }

  function renderAll() {
    renderManagers();
    renderSites();
    renderResults();
    renderSummary();
  }
  renderAll();

  $('#sam-filter').on('input', renderManagers);
  $('#site-search').on('input', renderResults);

  $('#manager-list').on('click', '.gsat-person-row', function () {
    selected = $(this).attr('data-name');
    $('#site-search').val('');
    renderAll();
  });

  /* Moves a site to `to`, or removes its assignment when `to` is ''. Both go
     through the same write so the audit trail reads the same either way. */
  function applyAssignment(site, to, note) {
    var previous = site.sam || 'Unassigned';
    S.samAssignments[site.code] = to;
    GSAT.save();
    GSAT.log('Assign', 'SAM Assignment', site.code, note);
    renderAll();
    GSAT.banner('ok', site.code + (to ? ' reassigned to ' + to + '.' : ' removed from ' + previous + '.'));
  }

  $('#site-list').on('click', '.site-move', function () {
    var site = siteOf($(this).closest('.gsat-person-row').attr('data-code'));
    if (!site) return;

    var others = allSam.filter(function (name) { return name !== site.sam; });
    if (!others.length) {
      GSAT.banner('warn', 'There is no other SAM to reassign ' + site.code + ' to.');
      return;
    }

    GSAT.askPick({
      title: 'Reassign this site?',
      html: '<b>' + GSAT.esc(site.code) + '</b> — ' + GSAT.esc(site.tradeArea) +
        '<br>is currently assigned to <b>' + GSAT.esc(site.sam || 'Unassigned') + '</b>.',
      label: 'Reassign to',
      placeholder: 'Select a SAM',
      choices: others,
      confirmText: 'Yes, reassign',
      confirmClass: 'btn-success'
    }).then(function (to) {
      if (!to) return;
      applyAssignment(site, to,
        'Site reassigned from ' + (site.sam || 'Unassigned') + ' to ' + to + '.');
    });
  });

  $('#site-list').on('click', '.site-remove', function () {
    var site = siteOf($(this).closest('.gsat-person-row').attr('data-code'));
    if (!site) return;

    var previous = site.sam || 'Unassigned';
    GSAT.ask({
      title: 'Remove this assignment?',
      html: '<b>' + GSAT.esc(site.code) + '</b> — ' + GSAT.esc(site.tradeArea) +
        '<br>will no longer be assigned to <b>' + GSAT.esc(previous) + '</b>.<br>' +
        'It stays without a SAM until one is assigned again.',
      icon: 'warning',
      confirmText: 'Yes, remove',
      confirmClass: 'btn-danger'
    }).then(function (ok) {
      if (!ok) return;
      applyAssignment(site, '', 'Assignment removed — site was assigned to ' + previous + '.');
    });
  });

  $('#result-list').on('click', '.site-reassign', function () {
    var site = siteOf($(this).closest('.gsat-person-row').attr('data-code'));
    if (!site || site.sam === selected) return;

    var previous = site.sam || 'Unassigned';
    var to = selected;
    GSAT.ask({
      title: 'Reassign this site?',
      html: '<b>' + GSAT.esc(site.code) + '</b> — ' + GSAT.esc(site.tradeArea) +
        '<br>will be assigned to <b>' + GSAT.esc(to) + '</b>.<br>' +
        'It is currently assigned to <b>' + GSAT.esc(previous) + '</b>.',
      confirmText: 'Yes, reassign',
      confirmClass: 'btn-success'
    }).then(function (ok) {
      if (!ok) return;
      applyAssignment(site, to, 'Site reassigned from ' + previous + ' to ' + to + '.');
    });
  });
});
