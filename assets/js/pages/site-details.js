/* GSAT — Site Assessment details (11 tabs)
   The form itself is written out in public/site-details.html. This file only
   restores saved answers, keeps conditional rows in step, and handles routing. */
GSAT.page('site-details', function (S) {
  'use strict';
  var $ = jQuery;

  var isPm = GSAT.is('PM'), isSam = GSAT.is('SAM');
  // REM and FMS only ever look: nothing on this form is theirs to write, whatever
  // readOnly happens to be left in the store
  var viewer = GSAT.is('REM') || GSAT.is('FMS');
  var viewOnly = !!S.readOnly || viewer;

  if (viewer) $('#btn-return').attr('href', 'report-site-assessment.html');

  var active = S.active || { code: 'VIS-2026-0003', tradeArea: 'Lahug_Cebu City_VIS', municipality: 'Cebu City' };
  var panes = $('[data-pane]').map(function () { return $(this).attr('data-pane'); }).get();
  var current = panes[0];

  /* ---------------- answers ---------------- */
  function answer(key) { return S.details[key]; }

  /* Field edits go to the trail through GSAT.logEdit, which folds a run of
     keystrokes on one field into the one line saying where it ended up. The
     row's own label is what a reader sees — "Lessor's Contact Number", not
     "lcontact". The SAR pair is left out: an attachment is logged as one, with
     the file name, rather than as two field writes. */
  var NO_LOG = ['sar', 'sarSize'];

  function labelOf(key) {
    var text = $('.gsat-detail-row[data-field="' + key + '"] .lbl').first().text();
    return String(text || key).trim();
  }

  function setAnswer(key, value) {
    S.details[key] = value;
    GSAT.save();
    GSAT.beginWork(active.code, 'Site Assessment');   // Pending → Ongoing, once
    if ($.inArray(key, NO_LOG) < 0) {
      GSAT.logEdit('Site Assessment', active.code, labelOf(key), value);
    }
  }

  function rentPerSqm() {
    var rent = parseFloat(answer('rent')), area = parseFloat(answer('floorarea'));
    return (rent > 0 && area > 0) ? (rent / area).toFixed(2) : '';
  }

  /* ---------------- PH mobile number ----------------
     Stored and shown as 0917 123 4567. A pasted +63 / 63 prefix is folded
     back to the local 0 form so both spellings end up identical. */
  function phDigits(value) {
    var d = String(value == null ? '' : value).replace(/\D/g, '');
    if (d.indexOf('63') === 0 && d.length > 10) d = '0' + d.slice(2);
    else if (d.indexOf('9') === 0) d = '0' + d;
    return d.slice(0, 11);
  }

  function phFormat(value) {
    var d = phDigits(value);
    if (d.length <= 4) return d;
    if (d.length <= 7) return d.slice(0, 4) + ' ' + d.slice(4);
    return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
  }

  function phValid(value) {
    var d = phDigits(value);
    return d.length === 11 && d.indexOf('09') === 0;
  }

  function markPhone($el) {
    var raw = String($el.val() || '').trim();
    $el.toggleClass('is-invalid', !!raw && !phValid(raw));
  }

  /* ---------------- decimal degrees ----------------
     Longitude and latitude are decimal degrees and nothing else — 123.8854, not
     123°53'07"E and not a description of where the place is. Two halves, the same
     way the phone number is done: the keystroke filter keeps the field to the
     characters a decimal number is made of, and the range check is what actually
     decides, because "12.9.9", "-" and "999" all survive the filter and none of
     them is a coordinate. */
  var COORD = {
    lng: { max: 180, label: 'Longitude', eg: '123.8854' },
    lat: { max: 90, label: 'Latitude', eg: '10.3157' }
  };

  function coordClean(value) {
    var s = String(value == null ? '' : value).replace(/[^\d.\-]/g, '');
    var neg = s.charAt(0) === '-';               // a minus only means anything in front
    s = s.replace(/-/g, '');

    // one decimal point, however many were typed or pasted
    var parts = s.split('.');
    if (parts.length > 1) s = parts.shift() + '.' + parts.join('');

    return (neg ? '-' : '') + s;
  }

  function coordValid(value, kind) {
    var raw = String(value == null ? '' : value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return false;
    return Math.abs(parseFloat(raw)) <= COORD[kind].max;
  }

  function markCoord($el) {
    var raw = String($el.val() || '').trim();
    $el.toggleClass('is-invalid', !!raw && !coordValid(raw, $el.attr('data-coord')));
  }

  /* ---------------- reading a row ---------------- */
  function rowValue($row) {
    var $input = $row.find('input.fld-text, select.fld-select');
    if ($input.length) return String($input.val() || '').trim();

    var $radio = $row.find('.gsat-radio.on');
    if ($radio.length) return $radio.attr('data-val');

    var $checks = $row.find('.gsat-check.on');
    if ($checks.length) {
      return $checks.map(function () { return $(this).attr('data-val'); }).get().join(', ');
    }

    if ($row.attr('data-field') === 'sar') return answer('sar') || '';
    return '';
  }

  function rowVisible($row) {
    var eq = $row.attr('data-show-eq');
    if (eq) {
      var pair = eq.split('|');
      return (answer(pair[0]) || '') === pair[1];
    }
    var inside = $row.attr('data-show-in');
    if (inside) {
      var parts = inside.split('|');
      var picked = answer(parts[0]);
      return $.isArray(picked) && picked.indexOf(parts[1]) >= 0;
    }
    return true;
  }

  function visibleRows($scope) {
    return $scope.find('.gsat-detail-row').filter(function () { return rowVisible($(this)); });
  }

  /* ---------------- locking ---------------- */
  function rowLocked($row) {
    var pmOnly = $row.is('[data-pm-only]');
    if (pmOnly && !isPm) return true;
    return viewOnly && !(pmOnly && isPm);
  }

  function applyLocks() {
    $('.gsat-detail-row').each(function () {
      var $row = $(this);
      if (!rowLocked($row)) return;
      $row.find('input.fld-text').prop('readonly', true).addClass('gsat-locked');
      $row.find('select.fld-select').prop('disabled', true).each(function () {
        if (this.tomselect) this.tomselect.disable();   // the search box locks with it
      });
      $row.find('.gsat-radio, .gsat-check').addClass('disabled');
    });
    if (viewOnly) $('#btn-upload').prop('hidden', true);
  }

  /* ---------------- SAR attachment ---------------- */
  function fileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function paintSar() {
    var name = answer('sar') || '', size = answer('sarSize') || '';
    $('#sar-name').text(name ? (size ? name + ' · ' + size : name) : 'No file attached yet.');
    GSAT.toggle($('#btn-sar-clear'), !!name && !viewOnly);
  }

  /* ---------------- restoring saved answers ---------------- */
  function restore() {
    $('input.fld-text, select.fld-select').each(function () {
      var $el = $(this), key = $el.attr('data-k');
      if ($el.attr('data-source') === 'municipality') return $el.val(active.municipality || 'Cebu City');
      if ($el.attr('data-calc') === 'rentPerSqm') return $el.val(rentPerSqm());
      if ($el.is('[data-phone="ph"]')) return $el.val(phFormat(answer(key)));
      $el.val(answer(key) == null ? '' : answer(key));
    });

    $('[data-radio-group]').each(function () {
      var value = answer($(this).attr('data-radio-group')) || '';
      $(this).find('.gsat-radio').each(function () {
        $(this).toggleClass('on', $(this).attr('data-val') === value);
      });
    });

    $('[data-check-group]').each(function () {
      var picked = answer($(this).attr('data-check-group'));
      picked = $.isArray(picked) ? picked : [];
      $(this).find('.gsat-check').each(function () {
        $(this).toggleClass('on', picked.indexOf($(this).attr('data-val')) >= 0);
      });
    });

    paintSar();
  }

  /* ---------------- status ---------------- */
  function statusNow() {
    var record = S.records.filter(function (r) { return r.code === active.code; })[0];
    return (record && record.status) || (S.detailsDone ? 'Completed' : 'Ongoing');
  }

  // A required row counts as answered only if the answer is also well-formed.
  function rowFilled($row) {
    var value = rowValue($row);
    if (!value) return false;
    if ($row.find('[data-phone="ph"]').length) return phValid(value);

    var $coord = $row.find('[data-coord]');
    if ($coord.length) return coordValid(value, $coord.attr('data-coord'));

    return true;
  }

  function paneComplete($pane) {
    if (viewOnly) return true;
    return visibleRows($pane).filter('[data-req]').toArray().every(function (row) {
      return rowFilled($(row));
    });
  }

  function missingPanes() {
    var missing = [];
    $('[data-pane]').each(function () {
      var $pane = $(this);
      var incomplete = visibleRows($pane).filter('[data-req]').not('[data-note-only]').toArray()
        .some(function (row) { return !rowFilled($(row)); });
      if (incomplete) missing.push($pane.attr('data-pane'));
    });
    return missing;
  }

  /* ---------------- painting ---------------- */
  function refresh() {
    var index = panes.indexOf(current);
    var isLast = index === panes.length - 1;

    // conditional rows
    $('.gsat-detail-row[data-show-eq], .gsat-detail-row[data-show-in]').each(function () {
      $(this).prop('hidden', !rowVisible($(this)));
    });

    // panes
    $('[data-pane]').each(function () {
      $(this).prop('hidden', $(this).attr('data-pane') !== current);
    });

    // step rail
    var done = 0;
    $('.gsat-step').each(function () {
      var name = $(this).attr('data-step');
      var complete = paneComplete($('[data-pane="' + name.replace(/"/g, '\\"') + '"]'));
      if (complete) done++;
      $(this).toggleClass('active', name === current).toggleClass('done', complete);
    });

    GSAT.bind($('body'), {
      tradeArea: active.tradeArea, siteCode: active.code,
      paneTitle: current, paneIndex: index + 1, doneCount: done
    });

    GSAT.chip($('#status-chip'), statusNow());

    // action bar
    GSAT.toggle($('#btn-prev'), index > 0);
    GSAT.toggle($('#btn-draft'), !viewOnly);
    GSAT.toggle($('#btn-pm-save'), isPm && current === 'Commercial Terms');
    // PM's only entry lives on tab 03, so point there from every other tab
    GSAT.toggle($('#pm-tab3-note'), isPm && current !== 'Commercial Terms');
    // one decision for the whole assessment — not per tab
    GSAT.toggle($('#sam-decision'), isSam && viewOnly && statusNow() === 'For SAM Approval');
    GSAT.toggle($('#btn-next'), !isLast);
    GSAT.toggle($('#btn-preview'), isLast && !viewOnly);
    GSAT.toggle($('#btn-final'), isLast && !viewOnly);

    // the draft note stands in for the final note until the last tab
    GSAT.toggle($('#draft-note'), !viewOnly && !isLast);
    GSAT.toggle($('#final-note'), isLast && !viewOnly);
    $('[data-note="open"]').prop('hidden', !!S.detailsDone);
    $('[data-note="done"]').prop('hidden', !S.detailsDone);
  }

  function goTo(name) { current = name; refresh(); }

  restore();
  applyLocks();
  $('input[data-phone="ph"]').each(function () { markPhone($(this)); });
  $('input[data-coord]').each(function () { markCoord($(this)); });
  refresh();

  /* ---------------- navigation ---------------- */
  $('.gsat-steps').on('click', '.gsat-step', function () { goTo($(this).attr('data-step')); });
  $('#btn-prev').on('click', function () { goTo(panes[Math.max(0, panes.indexOf(current) - 1)]); });
  $('#btn-next').on('click', function () { goTo(panes[Math.min(panes.length - 1, panes.indexOf(current) + 1)]); });

  /* ---------------- field input ---------------- */
  $('.gsat-card-body').on('input', 'input.fld-text:not([readonly])', function () {
    var $el = $(this), key = $el.attr('data-k');
    var value = $el.val();

    var digits = $el.attr('data-digits');
    if (digits) {
      value = value.replace(/\D/g, '').slice(0, parseInt(digits, 10));
      $el.val(value);
    }

    if ($el.is('[data-coord]')) {
      value = coordClean(value);
      $el.val(value);
      // a field being corrected as it is retyped should stop shouting about it
      if ($el.hasClass('is-invalid')) markCoord($el);
    }

    if ($el.is('[data-phone="ph"]')) {
      // keep the caret on the same digit after the spaces are re-inserted
      var caret = this.selectionStart == null ? value.length : this.selectionStart;
      var before = value.slice(0, caret).replace(/\D/g, '').length;
      var grew = phDigits(value).length - value.replace(/\D/g, '').length;  // +63 / bare 9 folded to 0
      if (grew > 0) before += grew;
      value = phFormat(value);
      $el.val(value);

      var pos = 0, seen = 0;
      while (pos < value.length && seen < before) {
        if (/\d/.test(value.charAt(pos))) seen++;
        pos++;
      }
      if (this.selectionStart != null) this.setSelectionRange(pos, pos);
      markPhone($el);
    }

    setAnswer(key, value);
    if (key === 'rent' || key === 'floorarea') $('[data-calc="rentPerSqm"]').val(rentPerSqm());
    refresh();
  });

  $('.gsat-card-body').on('blur', 'input[data-phone="ph"]:not([readonly])', function () {
    var $el = $(this);
    markPhone($el);
    if ($el.hasClass('is-invalid')) {
      GSAT.banner('error', 'Enter a valid Philippine mobile number — 11 digits starting with 09 (e.g. 0917 123 4567).');
    }
  });

  $('.gsat-card-body').on('blur', 'input[data-coord]:not([readonly])', function () {
    var $el = $(this);
    markCoord($el);
    if ($el.hasClass('is-invalid')) {
      var c = COORD[$el.attr('data-coord')];
      GSAT.banner('error', c.label + ' must be in decimal degrees between -' + c.max +
        ' and ' + c.max + ' (e.g. ' + c.eg + ').');
    }
  });

  $('.gsat-card-body').on('change', 'select.fld-select:not(:disabled)', function () {
    setAnswer($(this).attr('data-k'), $(this).val());
    refresh();
  });

  $('.gsat-card-body').on('click', '[data-radio-group] .gsat-radio:not(.disabled)', function () {
    var name = $(this).closest('[data-radio-group]').attr('data-radio-group');
    var value = $(this).attr('data-val');
    $(this).closest('[data-radio-group]').find('.gsat-radio').removeClass('on');
    $(this).addClass('on');
    setAnswer(name, value);
    refresh();
  });

  $('.gsat-card-body').on('click', '[data-check-group] .gsat-check:not(.disabled)', function () {
    var $group = $(this).closest('[data-check-group]');
    $(this).toggleClass('on');
    setAnswer($group.attr('data-check-group'),
      $group.find('.gsat-check.on').map(function () { return $(this).attr('data-val'); }).get());
    refresh();
  });

  /* The file itself is never uploaded — the picker is real, we only keep the
     file name and size so the row reads like a finished attachment. */
  $('#btn-upload').on('click', function () { $('#sar-file').trigger('click'); });

  $('#sar-file').on('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;

    if (!/\.(pdf|pptx?)$/i.test(file.name)) {
      this.value = '';
      return GSAT.banner('error', 'PPT and PDF only — ' + file.name + ' was not attached.');
    }

    setAnswer('sar', file.name);
    setAnswer('sarSize', fileSize(file.size));
    this.value = '';                     // so picking the same file again still fires change
    paintSar();
    refresh();
    GSAT.log('Attach', 'Site Assessment', active.code,
      'SAR Template ' + file.name + ' (' + fileSize(file.size) + ') attached.');
    GSAT.banner('ok', file.name + ' attached to ' + active.code + '.');
  });

  $('#btn-sar-clear').on('click', function () {
    var was = answer('sar');
    setAnswer('sar', '');
    setAnswer('sarSize', '');
    paintSar();
    refresh();
    if (was) GSAT.log('Remove', 'Site Assessment', active.code, 'SAR Template ' + was + ' removed.');
  });

  /* ---------------- saving / routing ---------------- */
  /* The status is read rather than asserted: the answers already saved
     themselves as they were typed, and moving the site off Pending went with
     them, so by now Draft is only recording where the site actually stands. */
  $('#btn-draft').on('click', function () {
    GSAT.set({ detailsDone: false });
    refresh();
    GSAT.log('Draft', 'Site Assessment', active.code,
      'Draft saved on ' + current + '. Status: ' + statusNow() + '.');
    GSAT.banner('ok', 'Draft saved for ' + current + '. Status: ' + statusNow() + '.');
  });

  $('#btn-pm-save').on('click', function () {
    var value = String(answer('actualfloorarea') || '').trim();
    if (!value) return GSAT.banner('error', 'Enter the Actual Floor Area (sqm) before saving.');
    GSAT.log('Update', 'Site Assessment', active.code,
      'Actual Floor Area confirmed at ' + value + ' sqm. Status unchanged: ' + statusNow() + '.');
    GSAT.banner('ok', 'Actual Floor Area (' + value + ' sqm) saved for ' + active.code +
      '. Status unchanged: ' + statusNow() + '.');
  });

  function decide(action, status, type, message, url, reason) {
    S.records.forEach(function (r) { if (r.code === active.code) r.status = status; });
    S.decisions.unshift({ code: active.code, action: action, when: GSAT.stamp(), reason: reason || '' });
    GSAT.save();
    GSAT.log(action === 'Approved' ? 'Approve' : 'Return', 'Site Assessment', active.code,
      action === 'Approved'
        ? 'Assessment approved. Status: ' + status + '.'
        : 'Returned to SAS for revision. Reason: ' + reason + ' — Status: ' + status + '.');
    GSAT.flash(type, message, url);
  }

  /* Approving closes the assessment, so it is confirmed like the return is. */
  $('#btn-approve').on('click', function () {
    GSAT.ask({
      title: 'Approve this assessment?',
      html: '<b>' + $('<div>').text(active.code).html() + '</b> &mdash; ' +
        $('<div>').text(active.tradeArea || '').html() +
        '<br>All 11 tabs are approved and the site is marked Approved. ' +
        'Whether it went on to be Completed or fell out is set later, on the Site Assessment Report.',
      confirmText: 'Yes, approve',
      confirmClass: 'btn-success'
    }).then(function (ok) {
      if (!ok) return;
      decide('Approved', 'Approved', 'ok',
        active.code + ' approved. Status: Approved.', 'site-assessment.html');
    });
  });

  /* Returning to SAS always needs a written reason. */
  $('#btn-return-sas').on('click', function () {
    $('#return-reason').val('');
    $('#return-overlay').prop('hidden', false);
    $('#return-reason').trigger('focus');
  });

  $('#return-close, #return-cancel').on('click', function () {
    $('#return-overlay').prop('hidden', true);
  });

  $('#return-confirm').on('click', function () {
    var reason = String($('#return-reason').val() || '').trim();
    if (!reason) {
      $('#return-reason').addClass('is-invalid').trigger('focus');
      return GSAT.banner('error', 'Enter a reason before returning ' + active.code + ' to SAS.');
    }
    $('#return-overlay').prop('hidden', true);
    decide('Returned', 'Ongoing', 'warn',
      active.code + ' returned to SAS for revision. Reason: ' + reason + ' — Status: Ongoing.',
      'site-assessment.html', reason);
  });

  $('#return-reason').on('input', function () { $(this).removeClass('is-invalid'); });

  /* ---------------- preview + final save ---------------- */
  function buildPreview() {
    var $body = $('#preview-body').empty();

    $('[data-pane]').each(function () {
      var $pane = $(this);
      $body.append(GSAT.bind(GSAT.tpl('tpl-preview-head'), { label: $pane.attr('data-pane') }));

      visibleRows($pane).not('[data-note-only]').each(function () {
        var $row = $(this);
        var value = rowValue($row);
        var $line = GSAT.bind(GSAT.tpl('tpl-preview-row'), {
          label: $row.find('.lbl').text(),
          value: value || 'Not filled'
        });
        $line.find('.val').toggleClass('miss', !value);
        $body.append($line);
      });
    });
  }

  function finalSave() {
    $('#preview-overlay').prop('hidden', true);

    var missing = missingPanes();
    if (missing.length) {
      return GSAT.banner('error', 'Incomplete required fields in: ' + missing.join(', ') + '.');
    }

    /* This form is one of the three; finishing it records that and nothing more.
       Whether the site is now ready for the SAM is GSAT.submitWhenReady's call. */
    GSAT.set({ detailsDone: true });
    GSAT.log('Submit', 'Site Assessment', active.code, 'Site Assessment completed.');

    var left = GSAT.submitWhenReady(active.code, 'Site Assessment');
    refresh();
    GSAT.banner('ok', 'Site Assessment completed for ' + active.code + '. ' + GSAT.stepNote(left));
  }

  $('#btn-preview').on('click', function () {
    buildPreview();
    $('#preview-overlay').prop('hidden', false);
  });
  $('#preview-close, #preview-back').on('click', function () { $('#preview-overlay').prop('hidden', true); });
  $('#preview-final, #btn-final').on('click', finalSave);
});
