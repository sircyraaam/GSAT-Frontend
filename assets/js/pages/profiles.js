/* GSAT — List of Profile (Admin)
   Table, filters and the edit dialog live in public/profiles.html.

   A profile is a role. Its `key` is what every screen's data-roles gating
   matches on, so the list is fixed and the key is read-only — what an Admin
   owns here is the wording shown on screen and whether the profile may still
   be handed out. */
GSAT.page('profiles', function (S) {
  'use strict';
  var $ = jQuery;

  var editing = null;

  function holders(key) {
    return S.users.filter(function (u) { return u.profile === key; });
  }

  function statusOf(p) { return p.active ? 'Active' : 'Inactive'; }

  function filtered() {
    var status = $('#f-status').val();
    var query = $('#f-q').val().trim().toLowerCase();

    return S.profiles.filter(function (p) {
      return (!status || statusOf(p) === status) &&
        (!query || (p.name + ' ' + p.key).toLowerCase().indexOf(query) >= 0);
    });
  }

  function render() {
    var rows = filtered();

    GSAT.bind($('body'), {
      summary: rows.length
        ? 'Showing 1 to ' + rows.length + ' of ' + rows.length + ' entries' +
          (rows.length === S.profiles.length ? '' : ' (filtered from ' + S.profiles.length + ')')
        : 'No entries to show.'
    });

    $('#rows-wrap').prop('hidden', !rows.length);
    $('#rows-empty').prop('hidden', !!rows.length);

    var $body = $('#rows-body').empty();
    rows.forEach(function (p) {
      var count = holders(p.key).length;
      var $row = GSAT.bind(GSAT.tpl('tpl-profile-row'), {
        id: p.id, name: p.name, key: p.key,
        users: count + (count === 1 ? ' user' : ' users')
      });
      $row.attr('data-key', p.key);
      GSAT.chip($row.find('.gsat-chip'), statusOf(p));
      $body.append($row);
    });
  }
  render();

  $('#f-status').on('change', render);
  $('#f-q').on('input', render);

  $('#f-clear').on('click', function () {
    // Tom Select draws its own control over the <select>, so clearing the
    // element alone would leave the old choice showing in the field
    var status = $('#f-status')[0];
    if (status.tomselect) status.tomselect.setValue('', true); else status.value = '';
    $('#f-q').val('');
    render();
  });

  /* ---------------- edit dialog ---------------- */
  function openEdit(key) {
    editing = GSAT.profileOf(key);
    if (!editing) return;

    var count = holders(key).length;

    GSAT.bind($('body'), { editKey: editing.key });
    $('#edit-name').val(editing.name).removeClass('is-invalid');
    $('#edit-active').toggleClass('on', !!editing.active);
    $('#edit-holders').text(count
      ? count + (count === 1 ? ' account holds' : ' accounts hold') + ' this profile' +
        ' — switching it off leaves them as they are and only stops it being given to anyone new.'
      : 'No account holds this profile yet.');

    $('#edit-overlay').prop('hidden', false);
    $('#edit-name').trigger('focus');
  }

  function closeEdit() {
    $('#edit-overlay').prop('hidden', true);
    editing = null;
  }

  $('#rows-body').on('click', '.row-edit', function () {
    openEdit($(this).closest('tr').attr('data-key'));
  });
  $('#rows-body').on('dblclick', 'tr', function () { openEdit($(this).attr('data-key')); });

  $('#edit-close, #edit-cancel').on('click', closeEdit);
  $('#edit-active').on('click', function () { $(this).toggleClass('on'); });
  $('#edit-name').on('input', function () { $(this).removeClass('is-invalid'); });

  function commit(name, active) {
    var lines = [];
    if (name !== editing.name) lines.push('Renamed from ' + editing.name + ' to ' + name);
    if (active !== editing.active) lines.push(active ? 'Profile reactivated' : 'Profile deactivated');

    if (!lines.length) {
      closeEdit();
      return GSAT.banner('ok', 'Nothing to save — ' + editing.name + ' is unchanged.');
    }

    var was = editing.name;
    editing.name = name;
    editing.active = active;
    GSAT.save();
    GSAT.log('Update', 'User Management', 'Profile · ' + editing.key, lines.join('. ') + '.');

    closeEdit();
    render();
    GSAT.banner(active ? 'ok' : 'warn', was + ' saved as ' + name + ' · ' +
      (active ? 'Active' : 'Inactive') + '.');
  }

  $('#edit-save').on('click', function () {
    if (!editing) return closeEdit();

    var name = String($('#edit-name').val() || '').trim();
    var active = $('#edit-active').hasClass('on');

    if (!name) {
      $('#edit-name').addClass('is-invalid').trigger('focus');
      return GSAT.banner('error', 'A profile needs a name.');
    }

    var clash = S.profiles.filter(function (p) {
      return p !== editing && p.name.toLowerCase() === name.toLowerCase();
    })[0];
    if (clash) {
      $('#edit-name').addClass('is-invalid').trigger('focus');
      return GSAT.banner('error', name + ' is already the name of profile ' + clash.id +
        '. Two profiles cannot read the same on screen.');
    }

    // switching one off is the change that takes something away, so it is asked
    if (editing.active && !active) {
      var count = holders(editing.key).length;
      return GSAT.ask({
        title: 'Deactivate this profile?',
        html: '<b>' + $('<div>').text(name).html() + '</b> can no longer be assigned to a new account.' +
          '<br>' + (count
            ? 'The ' + count + (count === 1 ? ' account that holds' : ' accounts that hold') +
              ' it keep it and are unaffected.'
            : 'No account holds it today.'),
        icon: 'warning',
        confirmText: 'Yes, deactivate',
        confirmClass: 'btn-danger'
      }).then(function (ok) {
        if (ok) commit(name, active);
      });
    }

    commit(name, active);
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && !$('#edit-overlay').prop('hidden')) closeEdit();
  });
});
