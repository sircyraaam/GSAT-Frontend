window.GSAT = (function ($) {
  'use strict';

  var D = window.GSAT_DATA;

  var DATA_KEY = 'gsat-data';
  var SESSION_KEY = 'gsat-session';

  var SESSION_FIELDS = ['role', 'loggedIn', 'active', 'readOnly', 'banner', 'me'];

  var SITE_FIELDS = ['details', 'detailsDone', 'checklistData', 'checklistDone', 'scores', 'scoresDone'];

  function dataDefaults() {
    return {
      v: D.SEED_VERSION,
      records: JSON.parse(JSON.stringify(D.SEED_RECORDS)),
      seq: 7,
      assignments: {},
      samAssignments: {},
      franchisees: {},
      decisions: [],
      outcomes: {},
      sasOverrides: {},
      samOverrides: {},
      siteData: {},
      audit: JSON.parse(JSON.stringify(D.SEED_AUDIT)),
      users: JSON.parse(JSON.stringify(D.SEED_USERS)),
      profiles: JSON.parse(JSON.stringify(D.SEED_PROFILES)),
      userSeq: D.SEED_USERS.length
    };
  }

  function sessionDefaults() {
    return {
      role: 'SAS',
      loggedIn: false,
      active: null,
      readOnly: false,
      banner: null,
      me: ''
    };
  }

  function read(store, key) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function write(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* memory only */ }
  }

  function loadData() {
    var saved = read(localStorage, DATA_KEY);
    if (!saved || saved.v !== D.SEED_VERSION) return dataDefaults();
    return $.extend(dataDefaults(), saved);
  }

  var state = $.extend(sessionDefaults(), read(sessionStorage, SESSION_KEY) || {}, loadData());

  function bucket(code) {
    var key = code || '_none';
    if (!state.siteData[key]) {
      state.siteData[key] = {
        details: {}, detailsDone: false,
        checklistData: {}, checklistDone: false,
        scores: {}, scoresDone: false
      };
    }
    return state.siteData[key];
  }

  function activeCode() { return (state.active && state.active.code) || ''; }

  function focus() {
    var b = bucket(activeCode());
    state.details = b.details;
    state.checklistData = b.checklistData;
    state.scores = b.scores;
    state.detailsDone = b.detailsDone;
    state.checklistDone = b.checklistDone;
    state.scoresDone = b.scoresDone;
  }

  function fold() {
    var b = bucket(activeCode());
    b.details = state.details;
    b.checklistData = state.checklistData;
    b.scores = state.scores;
    b.detailsDone = !!state.detailsDone;
    b.checklistDone = !!state.checklistDone;
    b.scoresDone = !!state.scoresDone;
  }

  focus();

  function save() {
    fold();
    var data = {}, session = {};
    $.each(state, function (key, value) {
      if ($.inArray(key, SESSION_FIELDS) >= 0) session[key] = value;
      else if ($.inArray(key, SITE_FIELDS) < 0) data[key] = value;
    });
    write(localStorage, DATA_KEY, data);
    write(sessionStorage, SESSION_KEY, session);
  }

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function set(patch) {
    var moving = !!patch && has(patch, 'active') &&
      ((patch.active && patch.active.code) || '') !== activeCode();

    if (moving) fold();
    $.extend(state, patch);

    if (moving) {
      focus();
      $.each(SITE_FIELDS, function (i, key) {
        if (has(patch, key)) state[key] = patch[key];
      });
    }
    save();
  }

  function statusOf(code) {
    var r = state.records.filter(function (x) { return x.code === code; })[0];
    return (r && r.status) || '';
  }

  function beginWork(code, module) {
    if (statusOf(code) !== 'Pending') return false;

    state.records.forEach(function (r) { if (r.code === code) r.status = 'Ongoing'; });
    save();
    log('Update', module, code, 'First answer saved — assessment started. Status: Ongoing.');
    return true;
  }

  function stepsLeft(code) {
    fold();
    var b = bucket(code || activeCode());
    return D.SAS_STEPS
      .filter(function (s) { return !b[s.key]; })
      .map(function (s) { return s.label; });
  }

  function submitWhenReady(code, module) {
    var left = stepsLeft(code);
    if (left.length) return left;

    var moved = false;
    state.records.forEach(function (r) {
      if (r.code !== code) return;
      if (r.status === 'For SAM Approval' || $.inArray(r.status, D.CLOSED) >= 0) return;
      r.status = 'For SAM Approval';
      r.submittedAt = new Date().toISOString();
      moved = true;
    });
    save();

    if (moved) {
      log('Submit', module, code,
        'Site Assessment, Site Technical Checklist and Trade and Site Scorecard ' +
        'are all complete. Status: For SAM Approval.');
    }
    return [];
  }

  function stepNote(left) {
    if (!left || !left.length) return 'All three are in — submitted to SAM for approval.';
    return 'Still to finish before it goes to SAM: ' + left.join(' and ') + '.';
  }

  var AUDIT_MAX = 500;

  var EDIT_WINDOW = 2 * 60 * 1000;

  function actor() {
    return { role: role(), user: meName() };
  }

  function entry(action, module, target, detail, who, field) {
    var by = who || actor();
    state.audit.unshift({
      at: new Date().toISOString(),
      role: by.role, user: by.user,
      module: module || '', action: action || 'Update',
      entity: target || '', detail: detail || '',
      field: field || ''
    });
    if (state.audit.length > AUDIT_MAX) state.audit.length = AUDIT_MAX;
    save();
  }

  function log(action, module, target, detail, who) {
    entry(action, module, target, detail, who, '');
  }

  function editDetail(field, value) {
    var text = $.isArray(value) ? value.join(', ') : String(value == null ? '' : value).trim();
    return field + (text ? ' set to ' + text : ' cleared');
  }

  function logEdit(module, target, field, value) {
    var top = state.audit[0];

    if (top && top.action === 'Update' && top.field === field &&
        top.module === module && top.entity === (target || '') && top.role === role() &&
        (new Date() - new Date(top.at)) < EDIT_WINDOW) {
      top.at = new Date().toISOString();
      top.detail = editDetail(field, value);
      return save();
    }

    entry('Update', module, target, editDetail(field, value), null, field);
  }

  function reset() {
    fold();
    $.extend(state, sessionDefaults());
    focus();
    save();
  }

  function resetDemo() {
    var who = actor();

    try { localStorage.removeItem(DATA_KEY); } catch (e) { /* nothing to clear */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clear */ }
    Object.keys(state).forEach(function (key) { delete state[key]; });
    $.extend(state, sessionDefaults(), dataDefaults());
    focus();
    save();

    log('Reset', 'Session', 'Demo data',
      'Every site, answer, assignment and audit entry went back to the starting set.', who);
  }

  function tpl(id) {
    var $t = $('#' + id);
    if (!$t.length) throw new Error('GSAT.tpl: no <template id="' + id + '">');
    return $($t.html());
  }

  function bind($scope, values) {
    $.each(values, function (key, val) {
      var sel = '[data-bind="' + key + '"]';
      $scope.find(sel).add($scope.filter(sel)).each(function () {
        var tag = this.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') $(this).val(val == null ? '' : val);
        else $(this).text(val == null ? '' : val);
      });
    });
    return $scope;
  }

  function options($select, list, selected, placeholder) {
    var el = $select[0];
    if (!el) return $select;
    el.options.length = 0;
    if (placeholder != null) el.add(new Option(placeholder, ''));
    $.each(list, function (i, item) {
      var text = (item && item.label != null) ? item.label : item;
      var value = (item && item.value != null) ? item.value : text;
      el.add(new Option(text, value, false, value === selected));
    });
    if (selected == null || selected === '') el.value = '';
    searchable(el);
    return $select;
  }

  function searchable(el) {
    if (!window.TomSelect || !el || el.tagName !== 'SELECT') return;
    if (el.hasAttribute('data-no-search')) return;

    if (el.tomselect) {
      var kept = [].map.call(el.options, function (o) { return [o.text, o.value]; });
      var keptValue = el.value;
      el.tomselect.destroy();
      el.options.length = 0;
      kept.forEach(function (o) { el.add(new Option(o[0], o[1])); });
      el.value = keptValue;
    }

    var small = $(el).hasClass('form-select-sm');
    var blank = el.querySelector('option[value=""]');
    var ts = new window.TomSelect(el, {
      maxOptions: null,
      allowEmptyOption: true,
      plugins: ['dropdown_input'],
      dropdownParent: 'body',
      placeholder: blank ? blank.textContent : 'Select',
      render: {
        no_results: function () { return '<div class="no-results">No match</div>'; }
      }
    });

    if (blank && !el.value) ts.setValue('', true);

    if (ts.control_input) ts.control_input.placeholder = 'Search…';

    ts.wrapper.classList.add(small ? 'ts-sm' : 'ts-md');
    if (el.disabled) ts.disable();

    if (window.MutationObserver) {
      new MutationObserver(function () {
        var live = el.tomselect;
        if (!live || !!el.disabled === !!live.isDisabled) return;
        if (el.disabled) live.disable(); else live.enable();
      }).observe(el, { attributes: true, attributeFilter: ['disabled'] });
    }

    return ts;
  }

  function searchableAll($scope) {
    ($scope || $(document)).find('select').each(function () {
      if (this.options.length) searchable(this);
    });
  }

  function chip($el, status) {
    var c = D.STATUS_CHIP[status] || D.AUDIT_CHIP[status] || ['#e9ecef', '#495057'];
    return $el.text(status == null ? '' : status).css({ background: c[0], color: c[1] });
  }

  function toggle($el, on) { return $el.prop('hidden', !on); }

  function stamp() {
    var d = new Date();
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }

  function banner(type, text) {
    $('#gsat-banner')
      .attr('class', 'gsat-banner ' + (type || 'ok'))
      .text(text)
      .prop('hidden', false);
  }

  function flash(type, text, url) {
    set({ banner: { type: type, text: text } });
    if (url) location.href = url;
  }

  function consumeFlash() {
    if (state.banner) { banner(state.banner.type, state.banner.text); set({ banner: null }); }
  }

  function MAP() { return window.GSAT_MAPPING || []; }

  function mapLookup(city) {
    var c = (city || '').trim().toLowerCase();
    if (!c) return null;
    var M = MAP();
    var hit = null, i;
    for (i = 0; i < M.length; i++) if (M[i][3].toLowerCase() === c) { hit = M[i]; break; }
    if (!hit) for (i = 0; i < M.length; i++) {
      var t = M[i][3].toLowerCase();
      if (t === c + ' city' || t + ' city' === c) { hit = M[i]; break; }
    }
    if (!hit) for (i = 0; i < M.length; i++) if (M[i][3].toLowerCase().indexOf(c) === 0) { hit = M[i]; break; }
    if (!hit) return null;
    var areaKey = hit[2] + '|' + hit[3] + '|' + hit[4];
    var subKey = hit[0] + '|' + hit[1];
    var ov = state.sasOverrides[areaKey];
    var sov = state.samOverrides[subKey];
    return {
      territory: hit[0], subTerritory: hit[1], province: hit[2], city: hit[3],
      sam: (sov === undefined) ? hit[5] : (sov || 'Unassigned'),
      sas: (ov === undefined) ? hit[6] : (ov || 'Unassigned')
    };
  }

  function mappedRecords() {
    return state.records.map(function (r) {
      var m = mapLookup(r.municipality);
      return {
        code: r.code, tradeArea: r.tradeArea, status: r.status, city: r.municipality,
        province: m ? m.province : '—',
        territory: m ? m.territory : r.territory,
        subTerritory: r.subTerritory || (m ? m.subTerritory : 'Not in mapping'),
        sam: state.samAssignments[r.code] || (m ? m.sam : 'Unmapped'),
        sas: state.assignments[r.code] || r.createdBy || (m ? m.sas : 'Unmapped'),
        ownership: r.ownership || '',
        franchiseeBlock: franchiseeBlock(r),
        franchisable: canBeFranchised(r),
        franchisee: state.franchisees[r.code] || '',
        outcome: state.outcomes[r.code] || null,
        matched: !!m
      };
    });
  }

  function franchiseeBlock(record) {
    if (!record) return 'missing';
    if (record.ownership !== 'Franchise-Owned') return 'ownership';
    if ($.inArray(record.status, D.FRANCHISEE_STATUS) < 0) return 'status';
    return '';
  }

  function canBeFranchised(record) { return !franchiseeBlock(record); }

  function effSam(row) {
    var ov = state.samOverrides[row[0] + '|' + row[1]];
    return (ov === undefined) ? row[5] : ov;
  }

  function samTerritory() {
    var name = D.ROLES.SAM.user, M = MAP();
    for (var i = 0; i < M.length; i++) if (effSam(M[i]) === name) return M[i][0];
    return 'Visayas Sites';
  }

  function remRegion() {
    var name = D.ROLES.REM.user;
    var row = (D.REMS || []).filter(function (r) { return r.rem === name; })[0];
    return row || { rem: name, region: 'All regions', territories: [] };
  }

  function remTerritories() { return remRegion().territories.slice(); }

  function inRemRegion(territory) {
    var list = remTerritories();
    return !list.length || $.inArray(territory, list) >= 0;
  }

  function profileOf(key) {
    return state.profiles.filter(function (p) { return p.key === key; })[0] || null;
  }

  function profileName(key) {
    var p = profileOf(key);
    if (p) return p.name;
    return (D.ROLES[key] && D.ROLES[key].title) || key || '';
  }

  function userName(user) {
    if (!user) return '';
    var given = [user.first, user.mi ? user.mi + (/\.$/.test(user.mi) ? '' : '') : '']
      .filter(Boolean).join(' ');
    return [user.last, given].filter(Boolean).join(', ');
  }

  function fullName(user) {
    if (!user) return '';
    return [user.first, user.last].filter(Boolean).join(' ');
  }

  function userCode(seq) { return String(seq).padStart(6, '0'); }

  function userByCode(code) {
    return state.users.filter(function (u) { return u.code === code; })[0] || null;
  }

  function me() {
    var pinned = state.me ? userByCode(state.me) : null;
    if (pinned) return pinned;

    var seeded = (D.ROLES[role()] || {}).user;
    var byName = state.users.filter(function (u) { return fullName(u) === seeded; })[0];
    if (byName) return byName;

    return state.users.filter(function (u) { return u.profile === role() && u.active; })[0] || null;
  }

  function meName() {
    return fullName(me()) || (D.ROLES[role()] || {}).user || '';
  }

  function role() { return state.role || 'SAS'; }
  function is(r) { return role() === r; }

  function allows(list) {
    return $.inArray(role(), String(list || '').split(/\s+/)) >= 0;
  }

  var HOME = { PM: 'site-assessment.html', FMS: 'site-assessment.html' };
  function home() { return HOME[role()] || 'dashboard.html'; }

  /* ---------------- tooltips ----------------
     Icon-only controls carry their meaning in title=, which a phone never
     shows: there is no hover on a touch screen. Bootstrap's tooltip also
     opens on focus, and tapping a button focuses it, so the label appears
     on tap and closes again on the next tap elsewhere.

     The handler is delegated and the tooltip is built on first use, because
     most icon buttons are cloned from <template> long after this runs. */
  function tips() {
    if (!window.bootstrap || !window.bootstrap.Tooltip) return;

    // Native listeners, not jQuery: jQuery's focus/blur special event defers
    // programmatic focus and the tooltip would miss it.
    function open(e) {
      var el = e.target.closest && e.target.closest('[title]:not([data-no-tip])');
      if (!el || el._gsatTip) return;
      el._gsatTip = new window.bootstrap.Tooltip(el, {
        trigger: 'hover focus', placement: 'top', container: 'body'
      });
      el._gsatTip.show();

      // Most of these buttons re-render their own list. Dropping the tooltip on
      // click keeps it from being orphaned in the corner when its button goes.
      el.addEventListener('click', function () {
        if (!el._gsatTip) return;
        el._gsatTip.dispose();
        el._gsatTip = null;
      });
    }

    document.addEventListener('mouseover', open, true);
    document.addEventListener('focusin', open, true);
  }

  /* ---------------- confirmation dialog ----------------
     SweetAlert2 (vendored) styled with our own buttons, so a dialog looks like
     the rest of the app. Resolves true / false; falls back to the browser's
     own confirm() on a page that does not load the library. */
  function ask(opts) {
    var o = opts || {};

    if (!window.Swal) {
      return $.Deferred().resolve(window.confirm(o.title || 'Are you sure?')).promise();
    }

    return window.Swal.fire({
      title: o.title || 'Are you sure?',
      html: o.html || '',
      icon: o.icon || 'question',
      showCancelButton: true,
      reverseButtons: true,
      buttonsStyling: false,
      confirmButtonText: o.confirmText || 'Confirm',
      cancelButtonText: o.cancelText || 'Cancel',
      customClass: {
        popup: 'gsat-swal',
        confirmButton: 'btn ' + (o.confirmClass || 'btn-gsat'),
        cancelButton: 'btn btn-outline-secondary me-2'
      }
    }).then(function (res) { return !!res.isConfirmed; });
  }

  /* ---------------- shell wiring (markup already in the page) ---------------- */
  function initShell(page) {
    var info = D.ROLES[role()];

    // Drop anything this role may not see, anywhere on the page.
    $('[data-roles]').each(function () {
      if (!allows($(this).attr('data-roles'))) $(this).remove();
    });

    // Role-specific wording, e.g. data-label-sam="For Approval".
    $('[data-label-' + role().toLowerCase() + ']').each(function () {
      $(this).text($(this).attr('data-label-' + role().toLowerCase()));
    });

    /* The topbar reads the directory, not the seed: a name corrected on My
       Profile and a profile reworded on Profiles both have to show up here, or
       the app disagrees with its own user module. */
    var mine = me();
    bind($(document.body), {
      roleTitle: mine ? profileName(mine.profile) : info.title,
      userName: mine ? fullName(mine) : info.user
    });
    tips();
    searchableAll();

    // Bootstrap Icons chevrons: point down when open, right / up when not.
    function groupCaret($toggle, open) {
      $toggle.find('.gsat-caret')
        .toggleClass('bi-chevron-down', open)
        .toggleClass('bi-chevron-right', !open);
    }

    function userCaret(open) {
      $('#gsat-user-caret')
        .toggleClass('bi-chevron-up', open)
        .toggleClass('bi-chevron-down', !open);
    }

    // Mark the current page and open the group that holds it.
    var $active = $('[data-nav="' + page + '"]').addClass('active');
    var $group = $active.closest('.gsat-subgroup');
    if ($group.length) {
      $group.prop('hidden', false);
      // the parent only points at the current page — the child carries the
      // highlight, otherwise two filled pills read as two selections
      var $toggle = $group.prevAll('.gsat-nav-group').first().addClass('active-parent');
      groupCaret($toggle, true);
    }

    // On wide screens .collapsed is the mini rail; on small screens it is the
    // open off-canvas drawer. The scrim only renders below the 900px breakpoint.
    function setAside(open) {
      $('#gsat-aside').toggleClass('collapsed', open);
      $('#gsat-scrim').prop('hidden', !open);
    }

    $('#gsat-burger').on('click', function () {
      setAside(!$('#gsat-aside').hasClass('collapsed'));
    });
    $('#gsat-scrim').on('click', function () { setAside(false); });
    $(document).on('keydown', function (e) { if (e.key === 'Escape') setAside(false); });

    $('[data-group-toggle]').on('click', function () {
      var $sub = $('[data-group="' + $(this).attr('data-group-toggle') + '"]');
      var opening = $sub.prop('hidden');
      $sub.prop('hidden', !opening);
      groupCaret($(this), opening);
    });

    $('#gsat-user-toggle').on('click', function () {
      var $m = $('#gsat-user-menu');
      var opening = $m.prop('hidden');
      $m.prop('hidden', !opening);
      userCaret(opening);
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.gsat-user-wrap').length) {
        $('#gsat-user-menu').prop('hidden', true);
        userCaret(false);
      }
    });

    $('#gsat-reset-demo').on('click', function () {
      ask({
        title: 'Reset demo data?',
        html: 'Every site created, assessment answer, checklist and approval goes ' +
              'back to the starting set. This cannot be undone.',
        icon: 'warning',
        confirmText: 'Reset',
        confirmClass: 'btn-danger'
      }).then(function (ok) {
        if (!ok) return;
        resetDemo();
        location.href = 'index.html';
      });
    });

    // logged before reset(), which is what takes the role away
    $('#gsat-logout').on('click', function () {
      log('Sign out', 'Session', meName(), (mine ? profileName(mine.profile) : info.title) + ' signed out.');
      reset();
      location.href = 'index.html';
    });

    consumeFlash();
  }

  /* boot: pages call GSAT.page('name', initFn)
     <body> carries the contract:
       data-page     — page key, matches data-nav in the sidebar
       data-crumb    — breadcrumb text for the topbar
       data-allow    — roles permitted on this page (omit for everyone)
       data-fallback — where a disallowed role is sent (default dashboard) */
  function page(name, initFn) {
    $(function () {
      var $body = $('body');

      if (name !== 'login') {
        if (!state.loggedIn) { location.href = 'index.html'; return; }

        var allow = $body.attr('data-allow');
        if (allow && !allows(allow)) {
          location.href = HOME[role()] || $body.attr('data-fallback') || 'dashboard.html';
          return;
        }
        initShell(name);
      }

      if (initFn) initFn(state);
    });
  }

  return {
    data: D, state: function () { return state; }, set: set, save: save,
    reset: reset, resetDemo: resetDemo,
    tpl: tpl, bind: bind, options: options, chip: chip, toggle: toggle,
    stamp: stamp, banner: banner, flash: flash, ask: ask,
    log: log, logEdit: logEdit,
    statusOf: statusOf, beginWork: beginWork,
    stepsLeft: stepsLeft, submitWhenReady: submitWhenReady, stepNote: stepNote,
    searchable: searchable, searchableAll: searchableAll,
    MAP: MAP, mapLookup: mapLookup, mappedRecords: mappedRecords, samTerritory: samTerritory,
    canBeFranchised: canBeFranchised, franchiseeBlock: franchiseeBlock,
    effSam: effSam, remRegion: remRegion, remTerritories: remTerritories, inRemRegion: inRemRegion,
    profileOf: profileOf, profileName: profileName,
    userName: userName, fullName: fullName, userCode: userCode, userByCode: userByCode,
    me: me, meName: meName,
    role: role, is: is, home: home, page: page
  };
})(jQuery);
