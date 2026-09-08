/* GSAT — My Profile (every role)
   Every field is written out in public/my-profile.html; this file fills them
   and saves the two things a person owns about themselves.

   The split this page is built around: your name and your email are yours to
   correct, because they are how the app signs your work. Your profile, your
   status and your code are an administrator's, because they are what the app
   grants you — a page that let you widen your own access would not be a
   profile page. Those three are locked here and live on user-creation.html. */
GSAT.page('my-profile', function (S) {
  'use strict';
  var $ = jQuery, D = GSAT.data;

  var target = GSAT.me();

  $('#btn-return').attr('href', GSAT.home());

  /* Every role in D.ROLES is seeded into the directory, so this only happens
     once someone has been deleted out from under a live session — but the page
     still has to say something rather than paint a form over nothing. */
  if (!target) {
    $('#profile-body').prop('hidden', true);
    $('#btn-save').prop('hidden', true);
    $('#no-record').prop('hidden', false);
    return;
  }

  /* ---------------- stamps ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function asDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
  }

  /* ---------------- coverage ----------------
     My Profile shows the user's broader territory scope. Sub-territories are
     intentionally omitted because one person can hold several assignments. */
  function coverage() {
    if (GSAT.is('SAS')) {
      var row = D.TERRITORIES.filter(function (t) { return t.code === D.SAS_ASSIGNMENT.territory; })[0];
      return {
        territory: row ? row.label : D.SAS_ASSIGNMENT.territory
      };
    }

    if (GSAT.is('SAM')) {
      return {
        territory: GSAT.samTerritory()
      };
    }

    if (GSAT.is('REM')) {
      var region = GSAT.remRegion();
      return {
        territory: region.territories.length ? region.territories.join(', ') : 'All territories'
      };
    }

    return { territory: 'All territories' };
  }

  /* ---------------- the record ---------------- */
  function paint() {
    $('#inp-first').val(target.first || '');
    $('#inp-mi').val(target.mi || '');
    $('#inp-last').val(target.last || '');
    $('#inp-email').val(target.email || '');

    GSAT.bind($('body'), $.extend({
      userCode: target.code,
      profile: GSAT.profileName(target.profile),
      status: target.active ? 'Active' : 'Inactive',
      createdDate: asDate(target.created),
      modifiedDate: asDate(target.modifiedAt),
      modifiedBy: target.modifiedBy || ''
    }, coverage()));
  }

  paint();

  /* ---------------- saving ---------------- */
  var REQUIRED = [
    { key: 'first', label: 'First Name', find: function () { return $('#inp-first').parent(); } },
    { key: 'last', label: 'Last Name', find: function () { return $('#inp-last').parent(); } },
    { key: 'email', label: 'Email', find: function () { return $('#inp-email').parent(); } }
  ];

  function clearMarks() {
    REQUIRED.forEach(function (f) {
      f.find().removeClass('gsat-missing').prevAll('.gsat-form-label').first().removeClass('gsat-missing');
    });
  }

  function mark(list) {
    clearMarks();
    list.forEach(function (f) {
      f.find().addClass('gsat-missing').prevAll('.gsat-form-label').first().addClass('gsat-missing');
    });
  }

  function emailValid(text) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text); }

  $('#inp-first, #inp-last, #inp-email').on('input', clearMarks);

  $('#btn-save').on('click', function () {
    var v = {
      first: $('#inp-first').val().trim(),
      mi: $('#inp-mi').val().trim(),
      last: $('#inp-last').val().trim(),
      email: $('#inp-email').val().trim()
    };

    var gaps = REQUIRED.filter(function (f) { return !v[f.key]; });
    if (gaps.length) {
      mark(gaps);
      var names = gaps.map(function (f) { return f.label; });
      return GSAT.banner('error', gaps.length === 1
        ? names[0] + ' is required before saving.'
        : 'Complete these ' + gaps.length + ' fields before saving: ' + names.join(', ') + '.');
    }
    clearMarks();

    if (!emailValid(v.email)) {
      mark(REQUIRED.filter(function (f) { return f.key === 'email'; }));
      return GSAT.banner('error', v.email + ' is not a valid email address.');
    }

    var clash = S.users.filter(function (u) {
      return u !== target && String(u.email || '').toLowerCase() === v.email.toLowerCase();
    })[0];
    if (clash) {
      mark(REQUIRED.filter(function (f) { return f.key === 'email'; }));
      return GSAT.banner('error', v.email + ' already belongs to another account (' +
        clash.code + '). Every account needs its own address.');
    }

    var lines = [];
    var wasName = GSAT.fullName(target);
    if (wasName !== GSAT.fullName(v)) lines.push('Name changed from ' + wasName + ' to ' + GSAT.fullName(v));
    if ((target.mi || '') !== v.mi) lines.push('MI set to ' + (v.mi || '(none)'));
    if ((target.email || '') !== v.email) lines.push('Email changed from ' + target.email + ' to ' + v.email);

    if (!lines.length) return GSAT.banner('ok', 'Nothing to save — your record is unchanged.');

    $.extend(target, v, { modifiedAt: new Date().toISOString(), modifiedBy: GSAT.fullName(v) });
    GSAT.save();
    GSAT.log('Update', 'My Profile', target.code, lines.join('. ') + '.');

    /* The topbar was filled before any of this, so it is still showing the old
       name — and the name is the whole point of the change. */
    GSAT.bind($('body'), { userName: GSAT.fullName(target) });
    paint();
    GSAT.banner('ok', 'Your profile is saved.');
  });
});
