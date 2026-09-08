/* GSAT — User List (Admin)
   Filters, table, pager and row markup live in public/user-list.html.

   The pencil hands a user code to user-creation.html through the query string
   rather than through the store: the same page is also a sidebar link, and a
   code left behind in the session would make that link open whoever was edited
   last instead of a blank form. */
GSAT.page('user-list', function (S) {
  'use strict';
  var $ = jQuery;

  var page = 1;

  function statusOf(u) { return u.active ? 'Active' : 'Inactive'; }

  function rows() {
    return S.users.map(function (u) {
      return {
        code: u.code,
        name: GSAT.userName(u),
        email: u.email || '—',
        profile: GSAT.profileName(u.profile),
        status: statusOf(u)
      };
    });
  }

  function filtered() {
    var profile = $('#f-profile').val();
    var status = $('#f-status').val();
    var query = $('#f-q').val().trim().toLowerCase();

    return rows().filter(function (r) {
      return (!profile || r.profile === profile) &&
        (!status || r.status === status) &&
        (!query || (r.code + ' ' + r.name + ' ' + r.email).toLowerCase().indexOf(query) >= 0);
    });
  }

  function pageSize() { return parseInt($('#f-size').val(), 10) || 0; }   // 0 = All

  /* ---------------- pager ----------------
     Up to seven slots, so the row never grows past the card: the first and last
     pages are always reachable, the current one sits in the middle of what is
     left, and the gaps are ellipses rather than buttons that lead nowhere. */
  function pageNumbers(pages) {
    var list = [], i;
    if (pages <= 7) {
      for (i = 1; i <= pages; i++) list.push(i);
      return list;
    }

    var from = Math.max(2, page - 1);
    var to = Math.min(pages - 1, page + 1);

    list.push(1);
    if (from > 2) list.push('…');
    for (i = from; i <= to; i++) list.push(i);
    if (to < pages - 1) list.push('…');
    list.push(pages);
    return list;
  }

  function paint(pages) {
    GSAT.toggle($('#pager'), pages > 1);

    var $numbers = $('#pg-numbers').empty();
    pageNumbers(pages).forEach(function (n) {
      var $btn = GSAT.tpl('tpl-page-btn').text(n);
      if (n === '…') $btn.addClass('gsat-page-gap').prop('disabled', true);
      else $btn.attr('data-page', n).toggleClass('on', n === page);
      $numbers.append($btn);
    });

    $('#pg-prev').prop('disabled', page <= 1);
    $('#pg-next').prop('disabled', page >= pages);
  }

  function render() {
    var all = rows();
    var matches = filtered();
    var size = pageSize();
    var pages = size ? Math.max(1, Math.ceil(matches.length / size)) : 1;

    // a filter that shortens the list can strand the reader past the last page
    if (page > pages) page = pages;

    var start = size ? (page - 1) * size : 0;
    var shown = size ? matches.slice(start, start + size) : matches;

    var profiles = [];
    all.forEach(function (r) { if (profiles.indexOf(r.profile) < 0) profiles.push(r.profile); });

    GSAT.bind($('body'), {
      kpiTotal: all.length,
      kpiActive: all.filter(function (r) { return r.status === 'Active'; }).length,
      kpiInactive: all.filter(function (r) { return r.status === 'Inactive'; }).length,
      kpiProfiles: profiles.length,
      summary: matches.length
        ? 'Showing ' + (start + 1) + ' to ' + (start + shown.length) +
          ' of ' + matches.length + ' entries' +
          (matches.length === all.length ? '' : ' (filtered from ' + all.length + ')')
        : 'No entries to show.'
    });

    $('#rows-wrap').prop('hidden', !shown.length);
    $('#rows-empty').prop('hidden', !!shown.length);

    var $body = $('#rows-body').empty();
    shown.forEach(function (r) {
      var $row = GSAT.bind(GSAT.tpl('tpl-user-row'), {
        code: r.code, name: r.name, email: r.email, profile: r.profile
      });
      $row.attr('data-code', r.code);
      GSAT.chip($row.find('.gsat-chip'), r.status);
      $body.append($row);
    });

    paint(pages);
  }

  // the profile filter offers what the directory actually holds
  var used = [];
  rows().forEach(function (r) { if (used.indexOf(r.profile) < 0) used.push(r.profile); });
  used.sort();
  GSAT.options($('#f-profile'), used, '', 'All profiles');
  render();

  /* Any change to what is being shown puts the reader back on page one —
     staying on page 3 of a list that just became one page long is a blank
     table, and the row you were looking at has moved anyway. */
  $('#f-profile, #f-status, #f-size').on('change', function () { page = 1; render(); });
  $('#f-q').on('input', function () { page = 1; render(); });

  $('#f-clear').on('click', function () {
    // Tom Select draws its own control over the <select>, so clearing the
    // element alone would leave the old choice showing in the field
    $('#f-profile, #f-status').each(function () {
      if (this.tomselect) this.tomselect.setValue('', true);
      else this.value = '';
    });
    $('#f-q').val('');
    $('#f-size').val('10');
    page = 1;
    render();
  });

  $('#pg-prev').on('click', function () { page = Math.max(1, page - 1); render(); });
  $('#pg-next').on('click', function () { page = page + 1; render(); });
  $('#pg-numbers').on('click', '[data-page]', function () {
    page = parseInt($(this).attr('data-page'), 10);
    render();
  });

  function open(code) { location.href = 'user-creation.html?code=' + encodeURIComponent(code); }

  $('#rows-body').on('click', '.row-edit', function () {
    open($(this).closest('tr').attr('data-code'));
  });

  // the prototype this follows opens a record on a double-click too
  $('#rows-body').on('dblclick', 'tr', function () { open($(this).attr('data-code')); });
});
