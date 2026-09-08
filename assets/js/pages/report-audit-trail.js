/* GSAT — Audit Trail Report (Admin)
   Filters, table and row markup live in public/report-audit-trail.html.

   The entries themselves are written by GSAT.log() / GSAT.logEdit() from every
   screen that saves something — this page only reads state.audit, which is
   already newest-first, so nothing here sorts. */
GSAT.page('report-audit-trail', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;

  // the fixed order the actions are offered in, narrowed to the ones on record
  var ACTIONS = Object.keys(D.AUDIT_CHIP);

  function entries() { return S.audit || []; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* `at` is stored in UTC. Both the date filters and the timestamp column work
     in the reader's own timezone, so the day is taken off a local Date rather
     than sliced out of the ISO string — 8am in Manila is the previous day in
     UTC, and a range filter that disagreed with the column above it would be
     worse than no filter at all. */
  function localDay(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }

  // the dropdowns offer what is actually in the trail, so a choice never
  // returns an empty table
  function present(key) {
    var seen = [];
    entries().forEach(function (e) { if (e[key] && seen.indexOf(e[key]) < 0) seen.push(e[key]); });
    return seen;
  }

  function filtered() {
    var module = $('#f-module').val();
    var action = $('#f-action').val();
    var user = $('#f-user').val();
    var from = $('#f-from').val();
    var to = $('#f-to').val();
    var query = $('#f-q').val().trim().toLowerCase();

    return entries().filter(function (e) {
      var day = localDay(e.at);
      var haystack = (e.entity + ' ' + e.detail + ' ' + e.user + ' ' +
        e.module + ' ' + e.action).toLowerCase();

      return (!module || e.module === module) &&
        (!action || e.action === action) &&
        (!user || e.user === user) &&
        (!from || day >= from) &&
        (!to || day <= to) &&
        (!query || haystack.indexOf(query) >= 0);
    });
  }

  function countOf(rows, list) {
    return rows.filter(function (e) { return list.indexOf(e.action) >= 0; }).length;
  }

  function render() {
    var rows = filtered();
    var base = entries();

    var people = [];
    rows.forEach(function (e) { if (e.user && people.indexOf(e.user) < 0) people.push(e.user); });

    GSAT.bind($('body'), {
      kpiTotal: rows.length,
      kpiCreated: countOf(rows, ['Create']),
      kpiUpdated: countOf(rows, ['Update', 'Draft', 'Attach']),
      kpiDecisions: countOf(rows, ['Approve', 'Return']),
      summary: 'Showing ' + rows.length + ' of ' + base.length +
        ' recorded entries · ' + people.length +
        (people.length === 1 ? ' user' : ' users') + ' in view.'
    });

    $('#rows-wrap').prop('hidden', !rows.length);
    $('#rows-empty').prop('hidden', !!rows.length);

    var $body = $('#rows-body').empty();
    rows.forEach(function (e) {
      var $row = GSAT.bind(GSAT.tpl('tpl-audit-row'), {
        when: when(e.at), user: e.user || 'Unknown', role: e.role || '',
        module: e.module, entity: e.entity || '—', detail: e.detail
      });
      GSAT.chip($row.find('.gsat-chip'), e.action);
      $body.append($row);
    });
  }

  GSAT.options($('#f-module'), present('module'), '', 'All modules');
  GSAT.options($('#f-action'), ACTIONS.filter(function (a) {
    return present('action').indexOf(a) >= 0;
  }), '', 'All actions');
  GSAT.options($('#f-user'), present('user'), '', 'All users');
  render();

  $('#f-module, #f-action, #f-user, #f-from, #f-to').on('change', render);
  $('#f-q').on('input', render);

  $('#f-clear').on('click', function () {
    // Tom Select draws its own control over the <select>, so clearing the
    // element alone would leave the old choice showing in the field
    $('#f-module, #f-action, #f-user').each(function () {
      if (this.tomselect) this.tomselect.setValue('', true);
      else this.value = '';
    });
    $('#f-from, #f-to, #f-q').val('');
    render();
  });
});
