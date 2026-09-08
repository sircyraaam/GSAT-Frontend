/* GSAT — Site Creation (SAS creates; REM / FMS set the Franchisee Name)
   Behaviour only. Every field, radio and note already exists in
   public/site-creation.html; this file fills the dropdowns and reacts.

   The page has two modes. A SAS opens it empty and creates a trade area. A REM
   or FMS arrives from the Site Assessment Report with a saved site in
   S.active: the form is filled from that record and locked, and Franchisee Name
   — the one field neither SAS nor anyone else may write — is theirs to fill. */
GSAT.page('site-creation', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;

  var franchiseeMode = GSAT.is('REM') || GSAT.is('FMS');
  var territory = D.SAS_ASSIGNMENT.territory;
  var terrRow = D.TERRITORIES.filter(function (t) { return t.code === territory; })[0];
  var locked = false;                 // true once the trade area has been saved

  var $region = $('#sel-region');
  var $province = $('#sel-province');
  var $city = $('#sel-city');
  var $brgy = $('#sel-brgy');
  var $subTerritory = $('#sel-sub-territory');
  var $retail = $('#inp-retail');
  var $suggest = $('#retail-suggest');
  var $franchisee = $('#inp-franchisee');

  /* ---------------- reading the form ---------------- */
  function radio(name) {
    return $('[data-radio-group="' + name + '"] .gsat-radio.on').attr('data-val') || '';
  }

  function setRadio(name, value) {
    $('[data-radio-group="' + name + '"] .gsat-radio').each(function () {
      $(this).toggleClass('on', $(this).attr('data-val') === value);
    });
  }

  function values() {
    return {
      region: $region.val(), province: $province.val(),
      municipality: $city.val(), barangay: $brgy.val(),
      subTerritory: $subTerritory.val(),
      siteCategory: radio('siteCategory'), ownership: radio('ownership'),
      franchiseeType: radio('franchiseeType'), storeType: radio('storeType'),
      retailTradeArea: $retail.val().trim(), source: radio('source')
    };
  }

  function tradeAreaName(v) { return [v.barangay, v.municipality, territory].join('_'); }

  /* ---------------- required fields ----------------
     "Please complete all required fields" is no help on a form this long, so
     each one is listed here once with the words the page uses for it and the
     cell to outline. Franchisee-Owned Type is conditional — it is only required
     while the site is Franchise-Owned. */
  var REQUIRED = [
    { key: 'region', label: 'Region', find: function () { return $region.parent(); } },
    { key: 'province', label: 'Province', find: function () { return $province.parent(); } },
    { key: 'municipality', label: 'City / Municipality', find: function () { return $city.parent(); } },
    { key: 'barangay', label: 'Barangay', find: function () { return $brgy.parent(); } },
    { key: 'subTerritory', label: 'Sub-Territory', find: function () { return $subTerritory.parent(); } },
    { key: 'siteCategory', label: 'Site Category', find: function () { return group('siteCategory'); } },
    { key: 'ownership', label: 'Store Ownership', find: function () { return group('ownership'); } },
    {
      key: 'franchiseeType', label: 'Franchisee-Owned Type',
      find: function () { return group('franchiseeType'); },
      when: function (v) { return v.ownership === 'Franchise-Owned'; }
    },
    { key: 'storeType', label: 'Store Type', find: function () { return group('storeType'); } },
    { key: 'retailTradeArea', label: 'Retail Trade Area Name', find: function () { return $retail.parent(); } },
    { key: 'source', label: 'Franchisee Source', find: function () { return group('source'); } }
  ];

  function group(name) { return $('[data-radio-group="' + name + '"]'); }

  // the label sits in the grid cell before the field
  function labelFor($cell) { return $cell.prevAll('.gsat-form-label').first(); }

  function missing(v) {
    return REQUIRED.filter(function (f) {
      return (!f.when || f.when(v)) && !v[f.key];
    });
  }

  function clearMarks(keys) {
    REQUIRED.filter(function (f) { return !keys || $.inArray(f.key, keys) >= 0; })
      .forEach(function (f) {
        var $cell = f.find();
        $cell.removeClass('gsat-missing');
        labelFor($cell).removeClass('gsat-missing');
      });
  }

  /* Outlines every gap, so the banner can name them and the form can show them.
     The first gap is scrolled to only when it is off screen: the banner lists all
     of them and sits at the top, so scrolling when the field is already in view
     would push the list away for nothing. */
  function markMissing(gaps) {
    clearMarks();
    gaps.forEach(function (f) {
      var $cell = f.find();
      $cell.addClass('gsat-missing');
      labelFor($cell).addClass('gsat-missing');
    });

    var el = gaps.length ? gaps[0].find()[0] : null;
    if (!el || !el.scrollIntoView) return;

    var box = el.getBoundingClientRect();
    var height = window.innerHeight || document.documentElement.clientHeight;
    if (box.top < 0 || box.bottom > height) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  // a field stops being a gap the moment it is answered
  function unmark(key) {
    var v = values();
    if (v[key]) clearMarks([key]);
  }

  /* ---------------- keeping the page in step ---------------- */
  function refreshHints() {
    var v = values();
    var hasPreview = !!(v.barangay && v.municipality);

    $('[data-hint="saved"]').prop('hidden', !locked);
    $('[data-hint="preview"]').prop('hidden', locked || !hasPreview);
    $('[data-hint="format"]').prop('hidden', locked || hasPreview);

    if (hasPreview) GSAT.bind($('body'), { tradeAreaPreview: tradeAreaName(v) });
  }

  /* Franchisee-Owned Type and Franchisee Name both hang off Store Ownership:
     a Company-Owned site has no franchisee, so neither field applies to it. */
  function refreshFranchisee() {
    var on = radio('ownership') === 'Franchise-Owned';
    // label and radios are separate grid cells now, so dim both
    $('#franchisee-label').add('#franchisee-block').toggleClass('gsat-dim', !on);
    $('#franchisee-note').prop('hidden', on);
    $('[data-radio-group="franchiseeType"] .gsat-radio').toggleClass('disabled', !on || locked);
    if (!on) setRadio('franchiseeType', '');

    /* On a form where every other field is locked and dimmed, the one writable
       field is marked rather than described — the ring, the pencil and the
       "Editable" pill carry it, so the note below is left for the cases where
       the field is closed and the reason is not obvious. */
    var eligible = franchiseeMode ? GSAT.canBeFranchised(target) : on;
    var writable = franchiseeMode && eligible;
    var note = nameNote(on, eligible);

    // dimmed when the field does not apply at all, or applies but is not yet
    // open to this reader — not merely because a SAS may only look at it
    $('#franchisee-name-label').toggleClass('gsat-dim', !on || (franchiseeMode && !writable));
    $('#franchisee-name-tag').prop('hidden', !writable);
    $('#franchisee-name-field').toggleClass('on', writable);
    $('#franchisee-name-note').text(note).prop('hidden', !note);

    if (!on) $franchisee.val('');
    $franchisee.prop('readonly', !writable)
      .prop('disabled', franchiseeMode && !writable)
      .toggleClass('gsat-locked', !writable);
    $('#btn-save-franchisee').prop('disabled', !writable);
  }

  function nameNote(franchiseOwned, eligible) {
    if (franchiseeMode && !target) return 'Open a site from the Site and Lessor Transaction Module to set its Franchisee Name.';
    if (!franchiseOwned) return 'Applicable only when Store Ownership is Franchise-Owned.';
    if (!franchiseeMode) return 'Set by the REM or Franchise Management Service. Read-only here.';
    if (!eligible) {
      return 'Available once the site is approved. ' + target.code + ' is still ' +
        target.status + '.';
    }
    return '';                      // writable — the highlight already says so
  }

  function lockForm() {
    locked = true;
    $region.add($province).add($city).add($brgy).add($subTerritory).prop('disabled', true);
    $retail.prop('readonly', true);
    $('.gsat-radio').addClass('disabled');
    $('#btn-save').prop('disabled', true);
    $('#btn-open-assess').prop('hidden', false);
    $('[data-hint="open"]').prop('hidden', true);
    $('[data-hint="locked"]').prop('hidden', false);
    $suggest.prop('hidden', true);
  }

  /* ---------------- Franchisee Name ----------------
     Writable for REM and FMS only. For everyone else the field still shows what
     they set, so a SAS can see who the site was matched with. */
  function regionOf(city) {
    var names = Object.keys(D.PSGC), i, provinces, j;
    for (i = 0; i < names.length; i++) {
      provinces = D.PSGC[names[i]];
      for (j in provinces) {
        if (provinces[j].indexOf(city) >= 0) return names[i];
      }
    }
    return '';
  }

  // a saved site, shown read-only, so its selects hold one option each
  function fixedOption($select, value) {
    GSAT.options($select, value ? [value] : [], value, value ? null : '—');
    $select.prop('disabled', true);
  }

  var target = null;                  // the record a REM / FMS came here to name

  function loadForFranchisee() {
    var active = S.active;
    target = active && S.records.filter(function (r) { return r.code === active.code; })[0];

    if (!target) {
      GSAT.options($region, [], '', '—');
      GSAT.options($province, [], '', '—');
      GSAT.options($city, [], '', '—');
      GSAT.options($brgy, [], '', '—');
      lockForm();
      return;
    }

    var m = GSAT.mapLookup(target.municipality);
    var barangay = String(target.tradeArea || '').split('_')[0];
    var row = D.TERRITORIES.filter(function (t) { return t.code === target.territory; })[0];

    fixedOption($region, regionOf(target.municipality));
    fixedOption($province, m ? m.province : '');
    fixedOption($city, target.municipality);
    fixedOption($brgy, barangay);
    fixedOption($subTerritory, m ? m.subTerritory : 'Not in mapping');

    GSAT.bind($('body'), {
      siteCode: target.code, status: target.status, tradeArea: target.tradeArea,
      territory: row ? row.label : target.territory,
      subTerritory: m ? m.subTerritory : 'Not in mapping'
    });

    // the categories the SAS chose, so Store Ownership reads as it was saved —
    // it is what decides whether a Franchisee Name applies at all
    ['siteCategory', 'ownership', 'franchiseeType', 'storeType', 'source'].forEach(function (name) {
      setRadio(name, target[name] || '');
    });
    $retail.val(target.retailTradeArea || '');

    $franchisee.val(S.franchisees[target.code] || '');
    lockForm();
  }

  /* ---------------- first paint ---------------- */
  GSAT.options($region, Object.keys(D.PSGC), '', 'Select Region');
  GSAT.options($province, [], '', 'Select Province');
  GSAT.options($city, [], '', 'Select City');
  GSAT.options($brgy, [], '', 'Select Barangay');
  GSAT.options($subTerritory, terrRow ? terrRow.subs : [], D.SAS_ASSIGNMENT.subTerritory, 'Select Sub-Territory');

  GSAT.bind($('body'), {
    territory: terrRow ? terrRow.label : territory
  });

  if (franchiseeMode) {
    $('#btn-return').attr('href', 'report-site-assessment.html');
    loadForFranchisee();
  }

  refreshFranchisee();
  refreshHints();

  /* ---------------- PSGC cascade ---------------- */
  $region.on('change', function () {
    var region = $(this).val();
    GSAT.options($province, region ? Object.keys(D.PSGC[region]) : [], '', 'Select Province');
    GSAT.options($city, [], '', 'Select City');
    GSAT.options($brgy, [], '', 'Select Barangay');
    $province.prop('disabled', !region);
    $city.prop('disabled', true);
    $brgy.prop('disabled', true);
    // the cascade empties everything below it, so those are gaps again
    clearMarks(['province', 'municipality', 'barangay']);
    unmark('region');
    refreshHints();
  });

  $province.on('change', function () {
    var region = $region.val(), province = $(this).val();
    GSAT.options($city, province ? D.PSGC[region][province] : [], '', 'Select City');
    GSAT.options($brgy, [], '', 'Select Barangay');
    $city.prop('disabled', !province);
    $brgy.prop('disabled', true);
    clearMarks(['municipality', 'barangay']);
    unmark('province');
    refreshHints();
  });

  $city.on('change', function () {
    var city = $(this).val();
    GSAT.options($brgy, D.BARANGAYS[city] || [], '', 'Select Barangay');
    $brgy.prop('disabled', !city);
    clearMarks(['barangay']);
    unmark('municipality');
    refreshHints();
  });

  $brgy.on('change', function () {
    unmark('barangay');
    refreshHints();
  });

  $subTerritory.on('change', function () { unmark('subTerritory'); });

  /* ---------------- radios ---------------- */
  $('[data-radio-group]').on('click', '.gsat-radio:not(.disabled)', function () {
    var name = $(this).closest('[data-radio-group]').attr('data-radio-group');
    setRadio(name, $(this).attr('data-val'));
    unmark(name);
    // Company-Owned drops the Franchisee-Owned Type requirement with it
    if (name === 'ownership') {
      if (radio('ownership') !== 'Franchise-Owned') clearMarks(['franchiseeType']);
      refreshFranchisee();
    }
  });

  /* ---------------- retail trade area suggestions ---------------- */
  $retail.on('input', function () {
    unmark('retailTradeArea');
    var typed = $(this).val().trim().toLowerCase();
    var matches = typed.length > 1
      ? D.RETAIL_AREAS.filter(function (name) {
          var n = name.toLowerCase();
          return n.indexOf(typed) >= 0 && n !== typed;
        }).slice(0, 4)
      : [];

    $suggest.empty().prop('hidden', !matches.length);
    matches.forEach(function (name) {
      $suggest.append(GSAT.tpl('tpl-suggest-item').text(name));
    });
  });

  $suggest.on('click', '.gsat-suggest-item', function () {
    $retail.val($(this).text());
    unmark('retailTradeArea');
    $suggest.empty().prop('hidden', true);
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#inp-retail, #retail-suggest').length) $suggest.prop('hidden', true);
  });

  /* ---------------- save ---------------- */
  $('#btn-save').on('click', function () {
    var v = values();
    var gaps = missing(v);

    if (gaps.length) {
      markMissing(gaps);
      var names = gaps.map(function (f) { return f.label; });
      return GSAT.banner('error', gaps.length === 1
        ? names[0] + ' is required before saving.'
        : 'Complete these ' + gaps.length + ' fields before saving: ' + names.join(', ') + '.');
    }
    clearMarks();

    var tradeArea = tradeAreaName(v);
    var duplicate = S.records.some(function (r) {
      return r.tradeArea.toLowerCase() === tradeArea.toLowerCase();
    });
    if (duplicate) {
      return GSAT.banner('error', 'Trade Area Name ' + tradeArea +
        ' already exists. Change the barangay or city / municipality to continue.');
    }

    var seq = S.seq + 1;
    var code = territory + '-' + new Date().getFullYear() + '-' + String(seq).padStart(4, '0');

    S.seq = seq;
    // ownership rides along with the record: a REM or FMS opening this site later
    // may only name a franchisee when it says Franchise-Owned
    S.records.push({
      code: code, tradeArea: tradeArea, municipality: v.municipality, subTerritory: v.subTerritory,
      territory: territory, status: 'Pending',
      createdBy: GSAT.userName(),
      siteCategory: v.siteCategory, ownership: v.ownership,
      franchiseeType: v.franchiseeType, storeType: v.storeType,
      retailTradeArea: v.retailTradeArea, source: v.source
    });
    S.assignments[code] = GSAT.userName();
    GSAT.save();
    GSAT.log('Create', 'Site Creation', code,
      'Trade Area ' + tradeArea + ' created. ' + v.ownership + '. Status: Pending.');

    GSAT.bind($('body'), { siteCode: code, status: 'Pending', tradeArea: tradeArea });
    lockForm();
    refreshFranchisee();
    refreshHints();

    GSAT.banner('ok', 'Trade Area Name Successfully Saved! Trade Area ' + tradeArea +
      ', Site Code ' + code + '. Status: Pending.');
  });

  /* ---------------- save (REM / FMS) ---------------- */
  $('#btn-save-franchisee').on('click', function () {
    if (!target) return;

    var blocked = GSAT.franchiseeBlock(target);
    if (blocked === 'ownership') {
      return GSAT.banner('error', target.code + ' is ' + (target.ownership || 'not Franchise-Owned') +
        '. A Franchisee Name applies only to a Franchise-Owned site.');
    }
    if (blocked) {
      return GSAT.banner('error', target.code + ' is ' + target.status +
        '. A Franchisee Name can only be added once the site is approved.');
    }

    var name = $franchisee.val().trim();
    if (!name) return GSAT.banner('error', 'Enter a Franchisee Name before saving.');

    var was = S.franchisees[target.code] || '';
    S.franchisees[target.code] = name;
    GSAT.save();
    GSAT.log('Update', 'Site Creation', target.code,
      was ? 'Franchisee Name changed from ' + was + ' to ' + name + '.'
          : 'Franchisee Name set to ' + name + '.');
    GSAT.flash('ok', 'Franchisee Name for ' + target.code + ' saved as ' + name + '.',
      'report-site-assessment.html');
  });

  $('#btn-open-assess').on('click', function () {
    GSAT.set({
      active: {
        code: $('[data-bind="siteCode"]').val(),
        tradeArea: $('[data-bind="tradeArea"]').val(),
        municipality: $city.val()
      },
      readOnly: false, details: {}, detailsDone: false
    });
    location.href = 'site-details.html';
  });
});
