/* GSAT — Trade and Site Scorecard
   The scoring grid is written out in public/scorecard.html; this file restores
   the saved picks, keeps the running total, switches tabs and finalizes.

   This is the third of the three forms a SAS fills in for one site. Final Save
   records that this one is done and then asks GSAT.submitWhenReady whether the
   other two are in — only all three together send the site to the SAM. */
GSAT.page('scorecard', function (S) {
  'use strict';
  var $ = jQuery;

  // SAM and PM open this from their own lists to read it, never to score it
  var viewOnly = !!S.readOnly || GSAT.is('SAM') || GSAT.is('PM') ||
    GSAT.is('REM') || GSAT.is('FMS');

  var active = S.active || { code: 'VIS-2026-0003', tradeArea: 'Lahug_Cebu City_VIS' };

  /* ---------------- scoring ----------------
     Two halves, each marked out of 100. The Trade Area grid reaches 100 on its
     own; Site Assessment (80 points) and Others (20) are two tabs of one
     hundred, which is why the Others tab closes on the combined figure and not
     on its own four rows. WEIGHTS is the only place that split is written down.

     Each pane's ceiling is read off the options in its own dropdowns rather
     than typed here, so adding a criterion to the markup keeps the "of N
     points" line honest without a matching edit in this file. */
  var WEIGHTS = { 'Trade Area Assessment': 0.60, 'Site Assessment': 0.40 };
  var PANES = ['Trade Area Assessment', 'Site Assessment', 'Others'];

  function selectsIn(pane) { return $('[data-pane="' + pane + '"] .score-sel'); }

  function scoreOf(pane) {
    var sum = 0;
    selectsIn(pane).each(function () { sum += parseFloat($(this).val()) || 0; });
    return sum;
  }

  function maxOf(pane) {
    var sum = 0;
    selectsIn(pane).each(function () {
      var best = 0;
      $(this).find('option').each(function () {
        var v = parseFloat(this.value);
        if (!isNaN(v) && v > best) best = v;
      });
      sum += best;
    });
    return sum;
  }

  var MAX = {};
  PANES.forEach(function (p) { MAX[p] = maxOf(p); });

  function n(value) { return (value || 0).toFixed(2); }

  function paint(pane, value, note) {
    $('[data-total="' + pane + '"]').text(n(value));
    $('[data-note="' + pane + '"]').text(note);
  }

  function showTotal() {
    var trade = scoreOf('Trade Area Assessment');
    var site = scoreOf('Site Assessment');
    var others = scoreOf('Others');
    var combined = site + others;                    // the whole 40% side

    paint('Trade Area Assessment', trade,
      n(trade) + ' of ' + MAX['Trade Area Assessment'] + ' points');

    paint('Site Assessment', site,
      n(site) + ' of ' + MAX['Site Assessment'] + ' points — Others carries the remaining ' +
      MAX.Others);

    // the Others card shows the 40% side as a whole, so its note breaks it down
    paint('Others', combined,
      'Site Assessment ' + n(site) + ' + Others ' + n(others) +
      ' of ' + (MAX['Site Assessment'] + MAX.Others) + ' points');

    $('#ts-rating').val(n(
      trade * WEIGHTS['Trade Area Assessment'] +
      combined * WEIGHTS['Site Assessment']
    ));
  }

  /* Tom Select has already drawn its own control over every one of these by the
     time this runs (initShell upgrades the page before the page script starts),
     and it does not watch the element behind it — so a saved score written
     straight to the <select> would sit there invisibly, every dropdown still
     reading "Select Score" over a scorecard that is in fact filled in. */
  function restore() {
    $('.score-sel').each(function () {
      var value = (S.scores[$(this).attr('data-key')] || {}).value || '';
      if (this.tomselect) this.tomselect.setValue(value, true);
      else $(this).val(value);
    });
    $('.score-rem').each(function () {
      $(this).val((S.scores[$(this).attr('data-key')] || {}).remarks || '');
    });
  }

  function update(key, patch) {
    S.scores[key] = $.extend({}, S.scores[key], patch);
    GSAT.save();
    GSAT.beginWork(active.code, 'Trade and Site Scorecard');   // Pending → Ongoing, once
  }

  /* The grid is a flat run of cells — six to a row, the criterion in the first
     and the score and remarks in the last two — so the label is counted back
     from the control rather than found through a row wrapper there is none of.
     prevAll() is nearest-first, hence the offsets. */
  function labelOf($control) {
    var back = $control.hasClass('score-rem') ? 4 : 3;
    var text = $control.closest('.gsat-score-cell').prevAll('.gsat-score-cell').eq(back).text();
    return String(text || $control.attr('data-key')).trim();
  }

  /* ---------------- finalizing ----------------
     A criterion with no score is the only thing that can hold the Final Save up;
     remarks are optional everywhere. The panes are named back rather than
     counted, so the reader is told which tab to go back to. */
  function unscored() {
    return PANES.filter(function (pane) {
      return selectsIn(pane).filter(function () { return !$(this).val(); }).length > 0;
    });
  }

  var current = PANES[0];

  function refresh() {
    var isLast = current === PANES[PANES.length - 1];

    GSAT.chip($('#scorecard-chip'), S.scoresDone ? 'Completed' : 'Ongoing');

    // nothing here is the viewer's to submit, so the pair never appears for them
    GSAT.toggle($('#sc-preview'), isLast && !viewOnly);
    GSAT.toggle($('#sc-final'), isLast && !viewOnly);
    GSAT.toggle($('#sc-note'), isLast && !viewOnly);
    $('[data-note="open"]').prop('hidden', !!S.scoresDone);
    $('[data-note="done"]').prop('hidden', !S.scoresDone);
  }

  function buildPreview() {
    var $body = $('#preview-body').empty();

    PANES.forEach(function (pane) {
      $body.append(GSAT.bind(GSAT.tpl('tpl-preview-head'), { label: pane }));

      selectsIn(pane).each(function () {
        var $sel = $(this);
        var saved = S.scores[$sel.attr('data-key')] || {};
        var $line = GSAT.bind(GSAT.tpl('tpl-preview-row'), {
          label: labelOf($sel),
          value: saved.value || 'Not scored',
          remarks: saved.remarks || ''
        });
        $line.find('.val').toggleClass('miss', !saved.value);
        $body.append($line);
      });
    });
  }

  function finalSave() {
    $('#preview-overlay').prop('hidden', true);

    var missing = unscored();
    if (missing.length) {
      return GSAT.banner('error', 'Unscored criteria remain in: ' + missing.join(', ') +
        '. Score them before the final save.');
    }

    GSAT.set({ scoresDone: true });
    GSAT.log('Submit', 'Trade and Site Scorecard', active.code,
      'Scorecard finalized. TS Rating: ' + $('#ts-rating').val() + '.');

    var left = GSAT.submitWhenReady(active.code, 'Trade and Site Scorecard');
    refresh();
    GSAT.banner('ok', 'Trade and Site Scorecard finalized for ' + active.code + '. ' +
      GSAT.stepNote(left));
  }

  GSAT.bind($('body'), { siteCode: active.code });
  restore();
  showTotal();
  if (viewOnly) $('.score-sel, .score-rem').prop('disabled', true);
  refresh();

  $('.gsat-tabs').on('click', '.gsat-tab', function () {
    current = $(this).attr('data-tab');
    $('.gsat-tab').removeClass('active');
    $(this).addClass('active');
    $('[data-pane]').each(function () {
      $(this).prop('hidden', $(this).attr('data-pane') !== current);
    });
    refresh();
  });

  $('#sc-preview').on('click', function () {
    GSAT.bind($('body'), { previewRating: $('#ts-rating').val() });
    buildPreview();
    $('#preview-overlay').prop('hidden', false);
  });
  $('#preview-close, #preview-back').on('click', function () {
    $('#preview-overlay').prop('hidden', true);
  });
  $('#preview-final, #sc-final').on('click', finalSave);

  $(document).on('change', '.score-sel', function () {
    update($(this).attr('data-key'), { value: $(this).val() });
    showTotal();
    GSAT.logEdit('Trade and Site Scorecard', active.code,
      labelOf($(this)) + ' — score', $(this).val());
  });

  $(document).on('input', '.score-rem', function () {
    update($(this).attr('data-key'), { remarks: $(this).val() });
    GSAT.logEdit('Trade and Site Scorecard', active.code,
      labelOf($(this)) + ' — remarks', $(this).val());
  });
});
