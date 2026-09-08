/* GSAT — User Information (Admin creates and edits an account)
   Every field, note and stamp already exists in public/user-creation.html;
   this file fills the profile list, validates, and writes the record.

   Two modes, told apart by the query string. Reached from the sidebar it is a
   blank new account; reached from the User List's pencil it carries ?code= and
   loads that user. The code is in the URL rather than in the store because the
   same page is both — a code left in the session would make the menu link open
   whoever was edited last. */
GSAT.page('user-creation', function (S) {
  'use strict';
  var $ = jQuery;

  var $first = $('#inp-first');
  var $mi = $('#inp-mi');
  var $last = $('#inp-last');
  var $email = $('#inp-email');
  var $profile = $('#sel-profile');
  var $active = $('#chk-active');

  function param(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  }

  var code = param('code');
  var target = code ? GSAT.userByCode(code) : null;

  function values() {
    return {
      first: $first.val().trim(),
      mi: $mi.val().trim(),
      last: $last.val().trim(),
      profile: $profile.val(),
      email: $email.val().trim(),
      active: $active.hasClass('on')
    };
  }

  /* ---------------- required fields ----------------
     Same shape as Site Creation's: each gap is named in the banner with the
     words the form uses for it, and its cell is outlined. */
  var REQUIRED = [
    { key: 'first', label: 'First Name', find: function () { return $first.parent(); } },
    { key: 'last', label: 'Last Name', find: function () { return $last.parent(); } },
    { key: 'profile', label: 'Profile', find: function () { return $profile.parent(); } },
    { key: 'email', label: 'Email', find: function () { return $email.parent(); } }
  ];

  function clearMarks(keys) {
    REQUIRED.filter(function (f) { return !keys || $.inArray(f.key, keys) >= 0; })
      .forEach(function (f) {
        var $cell = f.find();
        $cell.removeClass('gsat-missing');
        $cell.prevAll('.gsat-form-label').first().removeClass('gsat-missing');
      });
  }

  function markMissing(gaps) {
    clearMarks();
    gaps.forEach(function (f) {
      var $cell = f.find();
      $cell.addClass('gsat-missing');
      $cell.prevAll('.gsat-form-label').first().addClass('gsat-missing');
    });

    var el = gaps.length ? gaps[0].find()[0] : null;
    if (!el || !el.scrollIntoView) return;
    var box = el.getBoundingClientRect();
    var height = window.innerHeight || document.documentElement.clientHeight;
    if (box.top < 0 || box.bottom > height) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function markOne(key) {
    var f = REQUIRED.filter(function (r) { return r.key === key; })[0];
    if (f) markMissing([f]);
  }

  // deliberately loose: this checks the shape of an address, not that it exists
  function emailValid(text) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text); }

  /* ---------------- stamps ----------------
     Stored in ISO and shown the way the record screens show a date: the local
     calendar day, not the UTC one. */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function asDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
  }

  function asTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ---------------- the profile list ----------------
     Only active profiles are offered. A user already holding one that has since
     been deactivated keeps it in the list, though — dropping it would silently
     reassign them the moment anyone opened their record to fix a typo. */
  function profileOptions() {
    var list = S.profiles.filter(function (p) {
      return p.active || (target && target.profile === p.key);
    }).map(function (p) {
      return { value: p.key, label: p.name + (p.active ? '' : ' (inactive)') };
    });
    GSAT.options($profile, list, target ? target.profile : '', '- Select Profile -');
  }

  function paintStamps(user) {
    GSAT.bind($('body'), {
      userId: user ? user.id : 0,
      userCode: user ? user.code : '',
      createdDate: user ? asDate(user.created) : '',
      createdTime: user ? asTime(user.created) : '',
      deactivatedDate: user ? asDate(user.deactivatedAt) : '',
      deactivatedBy: (user && user.deactivatedBy) || '',
      modifiedDate: user ? asDate(user.modifiedAt) : '',
      modifiedBy: (user && user.modifiedBy) || '',
      heading: user ? GSAT.userName(user) + ' · ' + user.code : ''
    });
  }

  function refreshActive() {
    $('#active-note').prop('hidden', $active.hasClass('on'));
  }

  /* ---------------- first paint ---------------- */
  if (code && !target) {
    GSAT.banner('error', 'No user with code ' + code + '. This form will create a new account instead.');
  }

  profileOptions();

  if (target) {
    $first.val(target.first || '');
    $mi.val(target.mi || '');
    $last.val(target.last || '');
    $email.val(target.email || '');
    $active.toggleClass('on', !!target.active);
    $('[data-mode="new"]').prop('hidden', true);
    $('[data-mode="edit"]').prop('hidden', false);
  }

  paintStamps(target);
  refreshActive();

  /* ---------------- events ---------------- */
  $first.add($last).add($email).on('input', function () {
    var key = this.id.replace('inp-', '');
    if ($(this).val().trim()) clearMarks([key]);
  });

  $profile.on('change', function () { if ($(this).val()) clearMarks(['profile']); });

  $active.on('click', function () {
    $(this).toggleClass('on');
    refreshActive();
  });

  /* ---------------- save ---------------- */
  function changes(was, now) {
    var lines = [];
    if (was.active !== now.active) lines.push(now.active ? 'Account reactivated' : 'Account deactivated');
    if (was.profile !== now.profile) {
      lines.push('Profile changed from ' + GSAT.profileName(was.profile) +
        ' to ' + GSAT.profileName(now.profile));
    }
    if (was.email !== now.email) lines.push('Email changed from ' + was.email + ' to ' + now.email);

    var oldName = GSAT.userName(was), newName = GSAT.userName(now);
    if (oldName !== newName) lines.push('Name changed from ' + oldName + ' to ' + newName);
    return lines;
  }

  function commit(v) {
    var now = new Date().toISOString();
    var me = GSAT.meName();

    if (!target) {
      var seq = S.userSeq + 1;
      var user = {
        id: seq, code: GSAT.userCode(seq),
        first: v.first, mi: v.mi, last: v.last,
        profile: v.profile, email: v.email, active: v.active,
        created: now
      };
      if (!v.active) { user.deactivatedAt = now; user.deactivatedBy = me; }

      S.userSeq = seq;
      S.users.push(user);
      GSAT.save();
      GSAT.log('Create', 'User Management', user.code,
        GSAT.userName(user) + ' created as ' + GSAT.profileName(user.profile) +
        '. Status: ' + (user.active ? 'Active' : 'Inactive') + '.');

      return GSAT.flash('ok', 'User ' + GSAT.userName(user) + ' created with code ' +
        user.code + '.', 'user-list.html');
    }

    var was = $.extend({}, target);
    var lines = changes(was, v);

    if (!lines.length) return GSAT.banner('ok', 'Nothing to save — this record is unchanged.');

    $.extend(target, {
      first: v.first, mi: v.mi, last: v.last,
      profile: v.profile, email: v.email, active: v.active,
      modifiedAt: now, modifiedBy: me
    });

    // the deactivation stamp is the record of the last time it was switched off,
    // so it is written on the way down and left alone on the way back up
    if (was.active && !v.active) { target.deactivatedAt = now; target.deactivatedBy = me; }

    GSAT.save();
    GSAT.log('Update', 'User Management', target.code, lines.join('. ') + '.');
    GSAT.flash('ok', GSAT.userName(target) + ' (' + target.code + ') updated.', 'user-list.html');
  }

  $('#btn-save').on('click', function () {
    var v = values();
    var gaps = REQUIRED.filter(function (f) { return !v[f.key]; });

    if (gaps.length) {
      markMissing(gaps);
      var names = gaps.map(function (f) { return f.label; });
      return GSAT.banner('error', gaps.length === 1
        ? names[0] + ' is required before saving.'
        : 'Complete these ' + gaps.length + ' fields before saving: ' + names.join(', ') + '.');
    }
    clearMarks();

    if (!emailValid(v.email)) {
      markOne('email');
      return GSAT.banner('error', v.email + ' is not a valid email address.');
    }

    var clash = S.users.filter(function (u) {
      return u !== target && String(u.email || '').toLowerCase() === v.email.toLowerCase();
    })[0];
    if (clash) {
      markOne('email');
      return GSAT.banner('error', v.email + ' already belongs to ' + GSAT.userName(clash) +
        ' (' + clash.code + '). Every account needs its own address.');
    }

    // switching an account off is the one change here that takes something away
    if (target && target.active && !v.active) {
      return GSAT.ask({
        title: 'Deactivate this account?',
        html: '<b>' + $('<div>').text(GSAT.userName(target)).html() + '</b> can no longer sign in.' +
          '<br>Their name stays on every record they already touched.',
        icon: 'warning',
        confirmText: 'Yes, deactivate',
        confirmClass: 'btn-danger'
      }).then(function (ok) {
        if (ok) commit(v);
      });
    }

    commit(v);
  });
});
