GSAT.page('sas-assignment', function (S) {
  'use strict';
  var $ = jQuery;

  var D = GSAT_DATA;
  var allSas = [];
  function addSas(name) {
    if (name && allSas.indexOf(name) < 0) allSas.push(name);
  }
  D.SAS_TEAM.forEach(function (person) { addSas(person.name); });
  GSAT.MAP().forEach(function (row) { addSas(row[6]); });
  S.records.forEach(function (record) { addSas(S.assignments[record.code] || record.createdBy); });
  allSas.sort();

  var selected = allSas[0] || '';

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
        sas: S.assignments[record.code] || record.createdBy || (mapped ? mapped.sas : 'Unassigned')
      };
    });
  }

  function siteOf(code) {
    return sites().filter(function (site) { return site.code === code; })[0];
  }

  function renderSpecialists() {
    var all = sites();
    var query = $('#sas-filter').val().trim().toLowerCase();
    var $list = $('#specialist-list').empty();

    allSas.filter(function (name) { return !query || name.toLowerCase().indexOf(query) >= 0; })
      .forEach(function (name) {
        var mine = all.filter(function (site) { return site.sas === name; });
        var territories = [];
        mine.forEach(function (site) { if (territories.indexOf(site.territory) < 0) territories.push(site.territory); });

        var $row = GSAT.tpl('tpl-specialist-row');
        $row.attr('data-name', name).toggleClass('on', name === selected);
        GSAT.bind($row, {
          name: name, count: mine.length,
          territory: territories.length === 1 ? territories[0]
            : (territories.length ? territories.length + ' territories' : 'No sites assigned')
        });
        $list.append($row);
      });
  }

  function renderSites() {
    var mine = sites().filter(function (site) { return site.sas === selected; });
    var $list = $('#site-list').empty();

    $('#site-empty').prop('hidden', !!mine.length);

    mine.slice(0, 40).forEach(function (site) {
      var $row = GSAT.bind(GSAT.tpl('tpl-site-row'), {
        code: site.code, tradeArea: site.tradeArea,
        where: [site.municipality, site.subTerritory, site.status].filter(Boolean).join(' · ')
      });
      $row.attr('data-code', site.code);
      $list.append($row);
    });

    GSAT.bind($('body'), {
      selectedSas: selected,
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
      var alreadyMine = site.sas === selected;
      var $row = GSAT.bind(GSAT.tpl('tpl-result-row'), {
        code: site.code,
        tradeArea: site.tradeArea,
        owner: site.sas ? (alreadyMine ? 'Assigned to ' + selected : 'Currently assigned to ' + site.sas) : 'Unassigned'
      });
      $row.attr('data-code', site.code);
      $row.find('.site-reassign').prop('hidden', alreadyMine);
      $row.find('.site-assigned').prop('hidden', !alreadyMine);
      $list.append($row);
    });
  }

  function renderSummary() {
    var assigned = sites().filter(function (site) { return !!site.sas; }).length;
    GSAT.bind($('body'), {
      summary: S.records.length + ' created sites · ' + assigned + ' assigned · ' + allSas.length + ' specialists'
    });
  }

  function renderAll() {
    renderSpecialists();
    renderSites();
    renderResults();
    renderSummary();
  }
  renderAll();
  $('#sas-filter').trigger('focus');

  $('#sas-filter').on('input', renderSpecialists);
  $('#site-search').on('input', renderResults);

  $('#specialist-list').on('click', '.gsat-person-row', function () {
    selected = $(this).attr('data-name');
    $('#site-search').val('');
    renderAll();
  });

  function esc(text) { return $('<div>').text(text == null ? '' : text).html(); }

  $('#result-list').on('click', '.site-reassign', function () {
    var site = siteOf($(this).closest('.gsat-person-row').attr('data-code'));
    if (!site || site.sas === selected) return;

    var previous = site.sas || 'Unassigned';
    var to = selected;
    GSAT.ask({
      title: 'Reassign this site?',
      html: '<b>' + esc(site.code) + '</b> — ' + esc(site.tradeArea) +
        '<br>will be assigned to <b>' + esc(to) + '</b>.<br>' +
        'It is currently assigned to <b>' + esc(previous) + '</b>.',
      confirmText: 'Yes, reassign',
      confirmClass: 'btn-success'
    }).then(function (ok) {
      if (!ok) return;
      S.assignments[site.code] = to;
      GSAT.save();
      GSAT.log('Assign', 'SAS Assignment', site.code,
        'Site reassigned from ' + previous + ' to ' + to + '.');
      renderAll();
      GSAT.banner('ok', site.code + ' reassigned to ' + to + '.');
    });
  });
});
