/* GSAT — Site Technical Checklist
   Every tab, row and control is in public/site-checklist.html; this file
   restores the saved answers and handles draft / final save / submit. */
GSAT.page('site-checklist', function (S) {
  'use strict';
  var $ = jQuery;

  // SAM and PM open this from their own lists to read it, never to fill it in —
  // and this is one of the three forms that decide when a site reaches the SAM,
  // so it matters that only the SAS can finish it
  var viewOnly = !!S.readOnly || GSAT.is('SAM') || GSAT.is('PM') ||
    GSAT.is('REM') || GSAT.is('FMS');

  var active = S.active || { code: 'VIS-2026-0003', tradeArea: 'Lahug_Cebu City_VIS' };
  var tabs = $('[data-pane]').map(function () { return $(this).attr('data-pane'); }).get();
  var current = tabs[0];

  /* ---------------- stored answers ---------------- */
  function entry(key) { return S.checklistData[key] || {}; }

  function labelOf(key) {
    var text = $('.gsat-cl-row[data-key="' + key + '"] .cl-label').first().text();
    return String(text || key).trim();
  }

  function update(key, patch) {
    S.checklistData[key] = $.extend({}, S.checklistData[key], patch);
    GSAT.save();
    GSAT.beginWork(active.code, 'Site Technical Checklist');   // Pending → Ongoing, once

    /* An answer and its remarks are two different things a reader may want to
       trace, so they go to the trail as two fields. GSAT.logEdit folds the
       keystrokes within each of them back into one line. */
    var remarks = patch.remarks !== undefined;
    var value = remarks ? patch.remarks
      : (patch.value !== undefined ? patch.value : patch.text);
    GSAT.logEdit('Site Technical Checklist', active.code,
      labelOf(key) + (remarks ? ' — remarks' : ''), value);
  }

  function rowAnswer($row) {
    var $picked = $row.find('.gsat-radio.on');
    if ($picked.length) return $picked.attr('data-val');
    return String($row.find('.cl-text').val() || '').trim();
  }

  /* ---------------- painting ---------------- */
  function restore() {
    $('.gsat-cl-row').each(function () {
      var $row = $(this), saved = entry($row.attr('data-key'));

      $row.find('.gsat-radio').each(function () {
        $(this).toggleClass('on', $(this).attr('data-val') === saved.value);
      });
      $row.find('.cl-text').val(saved.text || '');
      $row.find('.cl-remarks').val(saved.remarks || '');
    });
  }

  function refresh() {
    var isLast = current === tabs[tabs.length - 1];

    $('.gsat-tab').each(function () {
      $(this).toggleClass('active', $(this).attr('data-tab') === current);
    });
    $('[data-pane]').each(function () {
      $(this).prop('hidden', $(this).attr('data-pane') !== current);
    });

    GSAT.chip($('#checklist-chip'), S.checklistDone ? 'Completed' : 'Ongoing');

    GSAT.toggle($('#cl-draft'), !viewOnly);
    GSAT.toggle($('#cl-preview'), isLast && !viewOnly);
    GSAT.toggle($('#cl-final'), isLast && !viewOnly);

    GSAT.toggle($('#cl-note'), isLast && !viewOnly);
    $('[data-note="open"]').prop('hidden', !!S.checklistDone);
    $('[data-note="done"]').prop('hidden', !S.checklistDone);
  }

  GSAT.bind($('body'), { tradeArea: active.tradeArea, siteCode: active.code });
  restore();
  // the radios are spans with a click handler, so they are locked by the guard in
  // that handler rather than by an attribute; the text fields take the attribute
  if (viewOnly) $('.cl-text, .cl-remarks').prop('readonly', true);
  refresh();

  /* ---------------- events ---------------- */
  $('.gsat-tabs').on('click', '.gsat-tab', function () {
    current = $(this).attr('data-tab');
    refresh();
  });

  $('.gsat-card-body').on('click', '.gsat-cl-row .gsat-radio', function () {
    if (viewOnly) return;
    var $row = $(this).closest('.gsat-cl-row');
    $row.find('.gsat-radio').removeClass('on');
    $(this).addClass('on');
    update($row.attr('data-key'), { value: $(this).attr('data-val') });
  });

  $('.gsat-card-body').on('input', '.cl-text', function () {
    update($(this).closest('.gsat-cl-row').attr('data-key'), { text: $(this).val() });
  });

  $('.gsat-card-body').on('input', '.cl-remarks', function () {
    update($(this).closest('.gsat-cl-row').attr('data-key'), { remarks: $(this).val() });
  });

  /* The status is read rather than asserted: the answers already saved
     themselves as they were picked, and moving the site off Pending went with
     them, so by now Draft is only recording where the site actually stands. */
  $('#cl-draft').on('click', function () {
    GSAT.set({ checklistDone: false });
    refresh();
    var status = GSAT.statusOf(active.code);
    GSAT.log('Draft', 'Site Technical Checklist', active.code,
      'Draft saved on ' + current + '. Status: ' + status + '.');
    GSAT.banner('ok', 'Draft saved for ' + current + '. Status: ' + status + '.');
  });

  /* ---------------- preview + final ---------------- */
  $('#cl-preview').on('click', function () {
    var $body = $('#preview-body').empty();

    $('[data-pane]').each(function () {
      var $pane = $(this);
      $body.append(GSAT.bind(GSAT.tpl('tpl-preview-head'), { label: $pane.attr('data-pane') }));

      $pane.find('.gsat-cl-row').each(function () {
        var $row = $(this);
        var value = rowAnswer($row);
        var $line = GSAT.bind(GSAT.tpl('tpl-preview-row'), {
          label: $row.find('.cl-label').text(),
          value: value || 'Not answered',
          remarks: String($row.find('.cl-remarks').val() || '').trim() || '—'
        });
        $line.find('.val').toggleClass('miss', !value);
        $body.append($line);
      });
    });

    $('#preview-overlay').prop('hidden', false);
  });

  $('#preview-close, #preview-back').on('click', function () {
    $('#preview-overlay').prop('hidden', true);
  });

  function finalSave() {
    $('#preview-overlay').prop('hidden', true);

    var missing = [];
    $('[data-pane]').each(function () {
      var $pane = $(this);
      var incomplete = $pane.find('.gsat-cl-row').toArray().some(function (row) {
        return !rowAnswer($(row));
      });
      if (incomplete) missing.push($pane.attr('data-pane'));
    });

    if (missing.length) {
      return GSAT.banner('error', 'Incomplete items remain in: ' + missing.join(', ') +
        '. Complete them or keep saving drafts.');
    }

    /* This form is one of the three; finishing it records that and nothing more.
       Whether the site is now ready for the SAM is GSAT.submitWhenReady's call. */
    GSAT.set({ checklistDone: true });
    GSAT.log('Submit', 'Site Technical Checklist', active.code, 'Checklist finalized.');

    var left = GSAT.submitWhenReady(active.code, 'Site Technical Checklist');
    refresh();
    GSAT.banner('ok', 'Site Technical Checklist finalized for ' + active.code + '. ' +
      GSAT.stepNote(left));
  }

  $('#preview-final, #cl-final').on('click', finalSave);
});
