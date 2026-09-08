/* GSAT — Site and Lessor Transaction Module (Admin / SAM / REM / FMS)
   Filters, table and row markup live in public/report-site-assessment.html.

   SAM is scoped to one territory, REM to the several territories that make up
   their region; Admin and FMS see everything. REM and FMS are the only roles
   that may set a Franchisee Name — the pencil in the row hands the site over to
   site-creation.html, which holds that field.

   This is also where an approved site is closed out. SAM approval stops at
   Approved, because on the day it is approved nobody yet knows whether the site
   pushed through; SAM and REM are the two roles that later say it did
   (Completed) or that it did not (Fall-Out, with a written reason). Both are
   final, and neither removes anything — see the close-out block below. */
GSAT.page('report-site-assessment', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;

  var isSam = GSAT.is('SAM');
  var isRem = GSAT.is('REM');
  var canFranchisee = isRem || GSAT.is('FMS');
  var canClose = isSam || isRem;
  var samTerritory = isSam ? GSAT.samTerritory() : '';
  var region = isRem ? GSAT.remRegion() : null;
  var VIEWABLE = ['For SAM Approval', 'Completed', 'Approved', 'Fall-Out'];

  function scoped() {
    var all = GSAT.mappedRecords();
    if (isSam) return all.filter(function (r) { return r.territory === samTerritory; });
    if (isRem) return all.filter(function (r) { return GSAT.inRemRegion(r.territory); });
    return all;
  }

  function filtered() {
    var sas = $('#f-sas').val();
    var status = $('#f-status').val();
    var query = $('#f-q').val().trim().toLowerCase();

    return scoped().filter(function (r) {
      return (!sas || r.sas === sas) &&
        (!status || r.status === status) &&
        (!query || (r.code + ' ' + r.tradeArea + ' ' + r.city).toLowerCase().indexOf(query) >= 0);
    });
  }

  function countOf(rows, status) {
    return rows.filter(function (r) { return r.status === status; }).length;
  }

  /* A Franchisee Name can be missing for three different reasons and the column
     should not read the same for all of them: N/A is "never", the dash is "not
     yet", and Not set is "go ahead". */
  function franchiseeCell(r) {
    if (r.franchisee) return r.franchisee;
    if (r.franchiseeBlock === 'ownership') return 'N/A';
    if (r.franchiseeBlock) return '—';
    return 'Not set';
  }

  function blockReason(r) {
    if (r.franchiseeBlock === 'ownership') return (r.ownership || 'Company-Owned') + ' — no franchisee';
    // a fallen-out site is past approval, not short of it — "once approved"
    // would be an instruction nobody can follow
    if (r.franchiseeBlock === 'status' && r.status === 'Fall-Out') {
      return r.code + ' fell out — no franchisee';
    }
    if (r.franchiseeBlock) return 'Available once approved: ' + r.code + ' is ' + r.status;
    return '';
  }

  /* The close-out button means three different things and its title is the only
     place that can say which: this one is waiting for you, this one is already
     closed, or this one has not reached approval yet. */
  function closeReason(r) {
    if (r.status === D.CLOSE_FROM) return 'Update status — ' + D.CLOSE_TO.join(' or ');
    if ($.inArray(r.status, D.CLOSE_TO) >= 0) return 'Status is final: ' + r.status;
    return 'Available once SAM approves: ' + r.code + ' is ' + r.status;
  }

  // the line under the chip — a Fall-Out has to keep saying why it stopped
  function outcomeNote(r) {
    var out = r.outcome;
    if (!out || !out.reason) return '';
    return 'Reason: ' + out.reason;
  }

  /* .disabled is a class rather than the disabled attribute because the reason
     a button is unavailable lives in its title, and a disabled button fires no
     hover, so the tooltip would never open. That leaves the button in the tab
     order announcing itself as available, which these two lines settle: the
     click handlers already ignore it. */
  function lock($btn, off, why) {
    return $btn.toggleClass('disabled', off)
      .attr({ 'aria-disabled': off ? 'true' : 'false', title: why })
      .attr('tabindex', off ? '-1' : null);
  }

  function render() {
    var base = scoped();
    var rows = filtered();

    GSAT.bind($('body'), {
      samTerritory: samTerritory,
      remRegion: region ? region.region : '',
      remScope: region ? region.territories.join(', ') : '',
      kpiTotal: rows.length,
      kpiOngoing: countOf(rows, 'Ongoing'),
      kpiForApproval: countOf(rows, 'For SAM Approval'),
      kpiCompleted: countOf(rows, 'Completed'),
      summary: 'Showing ' + rows.length + ' of ' + base.length + ' sites.'
    });

    $('#rows-wrap').prop('hidden', !rows.length);
    $('#rows-empty').prop('hidden', !!rows.length);

    var $body = $('#rows-body').empty();
    rows.forEach(function (r) {
      var viewable = VIEWABLE.indexOf(r.status) >= 0;
      var $row = GSAT.bind(GSAT.tpl('tpl-assessment-row'), {
        code: r.code, tradeArea: r.tradeArea, city: r.city,
        territory: r.territory, subTerritory: r.subTerritory, sam: r.sam, sas: r.sas,
        franchisee: franchiseeCell(r)
      });
      $row.attr('data-code', r.code);
      GSAT.chip($row.find('.gsat-chip'), r.status);

      var note = outcomeNote(r);
      $row.find('.cell-outcome').text(note).prop('hidden', !note);

      $row.find('.cell-franchisee')
        .toggleClass('text-secondary', !r.franchisee)
        .attr('title', blockReason(r));
      $row.find('.cell-sam').css('color', r.matched ? '#212529' : '#c0392b');
      lock($row.find('.row-view'), !viewable,
        viewable ? 'View assessment details' : 'Assessment not yet submitted');

      // data-roles cannot reach inside a <template>, so the row's own gating is here
      if (canFranchisee) {
        lock($row.find('.row-franchisee').prop('hidden', false), !r.franchisable,
          r.franchisable
            ? (r.franchisee ? 'Change' : 'Add') + ' Franchisee Name'
            : blockReason(r));
      } else {
        $row.find('.row-franchisee').remove();
      }

      // live on an Approved site and on nothing else, so a status that is already
      // Completed or Fall-Out can never be updated a second time
      if (canClose) {
        lock($row.find('.row-status').prop('hidden', false),
          r.status !== D.CLOSE_FROM, closeReason(r));
      } else {
        $row.find('.row-status').remove();
      }
      $body.append($row);
    });
  }

  // the specialist list is whatever appears in the rows this role can see
  var specialists = [];
  scoped().forEach(function (r) { if (specialists.indexOf(r.sas) < 0) specialists.push(r.sas); });
  specialists.sort();

  GSAT.options($('#f-sas'), specialists, '', 'All specialists');
  render();

  $('#f-sas, #f-status').on('change', render);
  $('#f-q').on('input', render);

  function recordOf($btn) {
    var code = $btn.closest('tr').attr('data-code');
    return S.records.filter(function (r) { return r.code === code; })[0];
  }

  $('#rows-body').on('click', '.row-view:not(.disabled)', function () {
    var record = recordOf($(this));
    if (!record) return;

    GSAT.set({
      active: { code: record.code, tradeArea: record.tradeArea, municipality: record.municipality },
      readOnly: true, detailsDone: true
    });
    location.href = 'site-details.html';
  });

  // Site Creation holds the Franchisee Name field; opened this way it shows the
  // saved site with every other field locked.
  $('#rows-body').on('click', '.row-franchisee:not(.disabled)', function () {
    var record = recordOf($(this));
    if (!record) return;

    GSAT.set({
      active: { code: record.code, tradeArea: record.tradeArea, municipality: record.municipality }
    });
    location.href = 'site-creation.html';
  });

  /* ---------------- close-out: Completed / Fall-Out ----------------
     The site being closed, held while the dialog is open. Cleared on every way
     out of it, so a second click can never land on the previous row. */
  var closing = null;

  function picked() { return $('input[name="status-outcome"]:checked').val() || ''; }

  // Fall-Out is the only one that has to be explained, so the box is only there
  // for Fall-Out — and the confirm button turns red with it, because the two
  // outcomes are not the same kind of news
  function paintChoice() {
    var fallout = picked() === 'Fall-Out';
    $('#status-reason-wrap').prop('hidden', !fallout);
    $('#status-confirm')
      .toggleClass('btn-gsat', !fallout)
      .toggleClass('btn-danger', fallout)
      .text(fallout ? 'Mark as Fall-Out' : 'Mark as Completed');
    if (fallout) $('#status-reason').trigger('focus');
  }

  function closeDialog() {
    $('#status-overlay').prop('hidden', true);
    closing = null;
  }

  $('#rows-body').on('click', '.row-status:not(.disabled)', function () {
    var record = recordOf($(this));
    if (!record) return;

    closing = record.code;
    $('#status-site').text(record.code + ' — ' + record.tradeArea);
    $('#status-completed').prop('checked', true);
    $('#status-reason').val('').removeClass('is-invalid');
    paintChoice();
    $('#status-overlay').prop('hidden', false);
    $('#status-completed').trigger('focus');
  });

  $('input[name="status-outcome"]').on('change', paintChoice);
  $('#status-close, #status-cancel').on('click', closeDialog);
  $('#status-reason').on('input', function () { $(this).removeClass('is-invalid'); });

  $('#status-confirm').on('click', function () {
    if (!closing) return closeDialog();

    var status = picked();
    var reason = String($('#status-reason').val() || '').trim();

    // a fall-out with no reason is a record nobody can read later, so it is
    // refused here rather than saved and explained never
    if (status === 'Fall-Out' && !reason) {
      $('#status-reason').addClass('is-invalid').trigger('focus');
      return GSAT.banner('error', 'Enter why ' + closing + ' fell out before updating its status.');
    }

    var code = closing;
    closeDialog();

    S.records.forEach(function (r) { if (r.code === code) r.status = status; });
    S.outcomes[code] = {
      status: status, reason: reason,
      when: GSAT.stamp(), by: (D.ROLES[GSAT.role()] || {}).user || ''
    };
    GSAT.save();

    GSAT.log(status === 'Completed' ? 'Complete' : 'Fall out', 'Site and Lessor Transaction Module', code,
      status === 'Completed'
        ? 'Status updated to Completed. The site pushed through.'
        : 'Status updated to Fall-Out. Reason: ' + reason +
          ' — the site and everything filed under it stay accessible.');

    render();     // the row's chip, its note and its now-spent button all change
    GSAT.banner(status === 'Completed' ? 'ok' : 'warn',
      code + ' updated. Status: ' + status + '.' +
      (reason ? ' Reason: ' + reason + '.' : ''));
  });
});
