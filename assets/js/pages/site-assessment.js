/* GSAT — Site and Lessor Transactions: assessment workflow plus mapping fields. */
GSAT.page('site-assessment', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;
  var role = GSAT.role();
  var isSam = role === 'SAM', isPm = role === 'PM';
  var isRem = role === 'REM', isFms = role === 'FMS';
  var canFranchise = isRem || isFms;
  var canUpdateStatus = isSam || isRem;

  var $body = $('#records-body');
  var $search = $('#f-q');
  var $status = $('#f-status');
  var $sas = $('#f-sas');

  function visibleRecords() {
    if (isSam) {
      var territory = GSAT.samTerritory();
      return S.records.filter(function (r) {
        var m = GSAT.mapLookup(r.municipality);
        return m && m.territory === territory;
      });
    }
    if (isRem) {
      return S.records.filter(function (r) {
        var m = GSAT.mapLookup(r.municipality);
        return m && GSAT.inRemRegion(m.territory);
      });
    }
    return S.records;
  }

  function mappingFor(record) {
    return GSAT.mapLookup(record.municipality);
  }

  function samFor(record) {
    var m = mappingFor(record);
    return m ? m.sam : 'Unmapped';
  }

  function franchiseeCell(record) {
    if (S.franchisees[record.code]) return S.franchisees[record.code];
    if (record.ownership !== 'Franchise-Owned') return 'N/A';
    return GSAT.canBeFranchised(record) ? 'Not set' : '—';
  }

  function submittedDate(record) {
    var date = record.submittedAt;
    if (!date) {
      var audit = S.audit.filter(function (entry) {
        return entry.action === 'Submit' && entry.entity === record.code;
      })[0];
      date = audit && audit.at;
    }
    if (!date) return 'Not submitted';
    var parsed = new Date(date);
    return isNaN(parsed.getTime()) ? 'Not submitted' : parsed.toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function count(records, status) {
    return records.filter(function (r) { return r.status === status; }).length;
  }

  function actionLock($button, locked, reason) {
    $button.toggleClass('disabled', locked)
      .attr('aria-disabled', locked ? 'true' : 'false')
      .attr('title', reason);
  }

  function visibleSas() {
    var names = [];
    visibleRecords().forEach(function (r) {
      var name = sasFor(r);
      if (names.indexOf(name) < 0) names.push(name);
    });
    return names.sort();
  }

  function isInSamQueue(record) {
    if (!isSam) return false;
    var m = GSAT.mapLookup(record.municipality);
    return record.status === 'For SAM Approval' && m && m.territory === GSAT.samTerritory();
  }

  /* Who the site sits with. The same rule the combined report applies, so
     every screen agrees: an explicit Admin assignment wins over the mapping. */
  var NOBODY = ['Unassigned', 'Unmapped'];

  function sasFor(record) {
    var m = GSAT.mapLookup(record.municipality);
    return S.assignments[record.code] || (m ? m.sas : 'Unmapped');
  }

  /* ---------------- filters ---------------- */
  function query() { return $search.val().trim().toLowerCase(); }

  function filtered(records) {
    var q = query(), status = $status.val(), sas = $sas.val();
    return records.filter(function (r) {
      return (!sas || sasFor(r) === sas) &&
        (!status || r.status === status) &&
        (!q || (r.code + ' ' + r.tradeArea + ' ' + r.municipality).toLowerCase().indexOf(q) >= 0);
    });
  }

  /* Only statuses present in this user's scope are offered. */
  function fillStatuses() {
    var seen = [];
    visibleRecords().forEach(function (r) {
      if (r.status && seen.indexOf(r.status) < 0) seen.push(r.status);
    });
    seen.sort();
    GSAT.options($status, seen, seen.indexOf($status.val()) >= 0 ? $status.val() : '', 'All statuses');
  }

  function render() {
    var all = visibleRecords();
    var records = filtered(all);

    $('#filter-card').prop('hidden', !all.length);
    $('#records-wrap').prop('hidden', !records.length);
    $('#records-empty').prop('hidden', !!all.length);
    $('#records-nomatch').prop('hidden', !all.length || !!records.length);

    GSAT.bind($('body'), {
      query: query() || $status.val() || $sas.val() || 'these filters',
      kpiTotal: records.length,
      kpiOngoing: count(records, 'Ongoing'),
      kpiForApproval: count(records, 'For SAM Approval'),
      kpiCompleted: count(records, 'Completed'),
      summary: all.length ? 'Showing ' + records.length + ' of ' + all.length + (all.length === 1 ? ' site.' : ' sites.') : ''
    });

    $body.empty();
    records.forEach(function (r) {
      var m = GSAT.mapLookup(r.municipality);
      var $row = GSAT.tpl('tpl-record-row');
      var sas = sasFor(r);
      $row.attr('data-code', r.code);
      GSAT.bind($row, {
        submittedAt: submittedDate(r), code: r.code, tradeArea: r.tradeArea,
        where: r.municipality + ' · ' + r.territory,
        territory: m ? m.territory : r.territory,
        subTerritory: m ? m.subTerritory : 'Not in mapping',
        sam: samFor(r), sas: sas, franchisee: franchiseeCell(r)
      });
      $row.find('.cell-sas').toggleClass('text-secondary', NOBODY.indexOf(sas) >= 0);
      $row.find('.cell-sam').toggleClass('text-secondary', !m);
      $row.find('.cell-franchisee').toggleClass('text-secondary', !S.franchisees[r.code]);
      GSAT.chip($row.find('.gsat-chip'), r.status);
      var actionTemplate = isInSamQueue(r) ? 'tpl-actions-sam' :
        ((role === 'SAS' || isPm) ? 'tpl-actions-default' : 'tpl-actions-viewonly');
      $row.find('.js-actions').append(GSAT.tpl(actionTemplate));
      var $transaction = GSAT.tpl('tpl-actions-transaction');
      actionLock($transaction.find('.act-franchise'), !canFranchise || !GSAT.canBeFranchised(r),
        !canFranchise ? 'Franchisee Name can be set by REM or FMS only.' :
          (GSAT.canBeFranchised(r) ? 'Add Franchise Name' : 'Available for approved Franchise-Owned sites only.'));
      actionLock($transaction.find('.act-update-status'), !canUpdateStatus || r.status !== D.CLOSE_FROM,
        !canUpdateStatus ? 'Status can be updated by SAM or REM only.' :
          (r.status === D.CLOSE_FROM ? 'Update Status' : 'Available when the site is Approved.'));
      $row.find('.js-actions').append($transaction);
      $body.append($row);
    });
  }

  fillStatuses();
  GSAT.options($sas, visibleSas(), '', 'All specialists');
  render();

  $search.on('input', render);
  $status.add($sas).on('change', render);

  function recordOf($el) {
    var code = $el.closest('tr').attr('data-code');
    return S.records.filter(function (r) { return r.code === code; })[0];
  }

  function openRecord(r, patch) {
    GSAT.set($.extend({
      active: { code: r.code, tradeArea: r.tradeArea, municipality: r.municipality }
    }, patch));
  }

  var DONE = ['For SAM Approval'].concat(D.CLOSED);

  function progress(r) {
    if ($.inArray(r.status, DONE) < 0) return {};
    var flags = {};
    D.SAS_STEPS.forEach(function (s) { flags[s.key] = true; });
    return flags;
  }

  $body.on('click', '.act-details, .act-open', function () {
    var r = recordOf($(this));
    if (!r) return;
    openRecord(r, $.extend({ readOnly: role !== 'SAS' }, progress(r)));
    location.href = 'site-details.html';
  });

  $body.on('click', '.act-checklist', function () {
    var r = recordOf($(this));
    if (!r) return;
    openRecord(r, $.extend({ readOnly: role !== 'SAS' }, progress(r)));
    location.href = 'site-checklist.html';
  });

  $body.on('click', '.act-score', function () {
    var r = recordOf($(this));
    if (!r) return;
    openRecord(r, $.extend({ readOnly: role !== 'SAS' }, progress(r)));
    location.href = 'scorecard.html';
  });
  
  $body.on('click', '.act-franchise:not(.disabled)', function () {
    var r = recordOf($(this));
    if (!r) return;
    openRecord(r, { readOnly: true });
    location.href = 'site-creation.html';
  });

  function saveCloseOut(record, status, reason) {
    record.status = status;
    S.outcomes[record.code] = {
      status: status, reason: reason || '', when: GSAT.stamp(),
      by: (D.ROLES[role] || {}).user || ''
    };
    GSAT.save();
    GSAT.log(status === 'Completed' ? 'Complete' : 'Fall out', 'Site and Lessor Transactions', record.code,
      status === 'Completed'
        ? 'Status updated to Completed.'
        : 'Status updated to Fall-Out. Reason: ' + reason);
    fillStatuses();
    render();
    GSAT.banner(status === 'Completed' ? 'ok' : 'warn',
      record.code + ' updated. Status: ' + status + (reason ? '. Reason: ' + reason + '.' : ''));
  }

  $body.on('click', '.act-update-status:not(.disabled)', function () {
    var record = recordOf($(this));
    if (!record || record.status !== D.CLOSE_FROM) return;

    window.Swal.fire({
      title: 'Update Status',
      text: record.code + ' — choose the final outcome.',
      input: 'select',
      inputPlaceholder: 'Select status',
      inputOptions: { 'Completed': 'Completed', 'Fall-Out': 'Fall-Out' },
      showCancelButton: true,
      confirmButtonText: 'Continue',
      inputValidator: function (value) { return value ? undefined : 'Select a status.'; }
    }).then(function (result) {
      if (!result.isConfirmed) return;
      if (result.value === 'Completed') return saveCloseOut(record, 'Completed', '');
      window.Swal.fire({
        title: 'Reason for Fall-Out',
        input: 'textarea',
        inputPlaceholder: 'Why did this site not push through?',
        showCancelButton: true,
        confirmButtonText: 'Mark as Fall-Out',
        inputValidator: function (value) {
          return String(value || '').trim() ? undefined : 'Enter the reason for the fall-out.';
        }
      }).then(function (reasonResult) {
        if (reasonResult.isConfirmed) saveCloseOut(record, 'Fall-Out', String(reasonResult.value).trim());
      });
    });
  });

  function decide(code, action, status, type, message, reason) {
    S.records.forEach(function (r) { if (r.code === code) r.status = status; });
    S.decisions.unshift({ code: code, action: action, when: GSAT.stamp(), reason: reason || '' });
    GSAT.save();
    GSAT.log(action === 'Approved' ? 'Approve' : 'Return', 'Site Assessment', code,
      action === 'Approved'
        ? 'Assessment approved from the approval queue. Status: ' + status + '.'
        : 'Returned to SAS for revision. Reason: ' + reason + ' — Status: ' + status + '.');
    fillStatuses();     // the decision changed a status, so the list has moved
    render();
    GSAT.banner(type, message);
  }

  /* Approving closes the assessment, so it is confirmed like the return is. */
  $body.on('click', '.act-approve', function () {
    var $row = $(this).closest('tr');
    var code = $row.attr('data-code');
    var tradeArea = $row.find('[data-bind="tradeArea"]').text();

    GSAT.ask({
      title: 'Approve this assessment?',
      html: '<b>' + $('<div>').text(code).html() + '</b>' +
        (tradeArea ? ' &mdash; ' + $('<div>').text(tradeArea).html() : '') +
        '<br>It will be marked Approved and leaves your approval queue. ' +
        'Whether it went on to be Completed or fell out is set later, on the Site Assessment Report.',
      confirmText: 'Yes, approve',
      confirmClass: 'btn-success'
    }).then(function (ok) {
      if (!ok) return;
      decide(code, 'Approved', 'Approved', 'ok', code + ' approved. Status: Approved.');
    });
  });

  /* Returning to SAS always needs a written reason. */
  var returning = null;

  $body.on('click', '.act-return', function () {
    returning = $(this).closest('tr').attr('data-code');
    $('#return-code').text(returning);
    $('#return-reason').val('').removeClass('is-invalid');
    $('#return-overlay').prop('hidden', false);
    $('#return-reason').trigger('focus');
  });

  $('#return-close, #return-cancel').on('click', function () {
    $('#return-overlay').prop('hidden', true);
    returning = null;
  });

  $('#return-confirm').on('click', function () {
    var reason = String($('#return-reason').val() || '').trim();
    if (!returning) return $('#return-overlay').prop('hidden', true);
    if (!reason) {
      $('#return-reason').addClass('is-invalid').trigger('focus');
      return GSAT.banner('error', 'Enter a reason before returning ' + returning + ' to SAS.');
    }
    var code = returning;
    returning = null;
    $('#return-overlay').prop('hidden', true);
    decide(code, 'Returned', 'Ongoing', 'warn',
      code + ' returned to SAS for revision. Reason: ' + reason + ' — Status: Ongoing.', reason);
  });

  $('#return-reason').on('input', function () { $(this).removeClass('is-invalid'); });
});
