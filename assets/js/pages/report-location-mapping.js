/* GSAT — Location Mapping Report (Admin / SAM)
   Filters, table and row markup live in public/report-location-mapping.html. */
GSAT.page('report-location-mapping', function (S) {
  'use strict';
  var $ = jQuery;

  var isSam = GSAT.is('SAM');
  var samTerritory = isSam ? GSAT.samTerritory() : '';
  var M = GSAT.MAP();

  var territories = [];
  M.forEach(function (m) { if (territories.indexOf(m[0]) < 0) territories.push(m[0]); });

  var specialists = [];
  M.forEach(function (m) { if (specialists.indexOf(m[6]) < 0) specialists.push(m[6]); });
  specialists.sort();

  function scoped() {
    var all = GSAT.mappedRecords();
    return isSam ? all.filter(function (r) { return r.territory === samTerritory; }) : all;
  }

  function filtered() {
    var territory = isSam ? samTerritory : $('#f-terr').val();
    var sas = $('#f-sas').val();
    var query = $('#f-q').val().trim().toLowerCase();

    return scoped().filter(function (r) {
      return (!territory || r.territory === territory) &&
        (!sas || r.sas === sas) &&
        (!query || (r.code + ' ' + r.tradeArea + ' ' + r.city).toLowerCase().indexOf(query) >= 0);
    });
  }

  function render() {
    var rows = filtered();
    var base = scoped();

    var sasSeen = [], samSeen = [];
    rows.forEach(function (r) {
      if (!r.matched) return;
      if (sasSeen.indexOf(r.sas) < 0) sasSeen.push(r.sas);
      if (samSeen.indexOf(r.sam) < 0) samSeen.push(r.sam);
    });

    GSAT.bind($('body'), {
      samTerritory: samTerritory,
      kpiSites: rows.length,
      kpiSam: samSeen.length,
      kpiSas: sasSeen.length,
      summary: 'Showing ' + rows.length + ' of ' + base.length +
        ' created sites · mapping master list: ' + M.length + ' area rows.'
    });

    $('#rows-wrap').prop('hidden', !rows.length);
    $('#rows-empty').prop('hidden', !!rows.length);

    var $body = $('#rows-body').empty();
    rows.forEach(function (r) {
      var $row = GSAT.bind(GSAT.tpl('tpl-mapping-row'), {
        code: r.code, tradeArea: r.tradeArea, city: r.city, province: r.province,
        territory: r.territory, subTerritory: r.subTerritory, sam: r.sam, sas: r.sas
      });
      // unmapped lookups are called out in red, same as the prototype
      $row.find('.cell-sam').css('color', r.matched ? '#212529' : '#c0392b');
      $row.find('.cell-sas').css('color', (r.matched || S.assignments[r.code]) ? '#212529' : '#c0392b');
      GSAT.chip($row.find('.gsat-chip'), r.status);
      $body.append($row);
    });
  }

  GSAT.options($('#f-terr'), territories, '', 'All territories');
  GSAT.options($('#f-sas'), specialists, '', 'All specialists');
  render();

  $('#f-terr, #f-sas').on('change', render);
  $('#f-q').on('input', render);

  $('#f-clear').on('click', function () {
    $('#f-terr, #f-sas').val('');
    $('#f-q').val('');
    render();
  });
});
