/* GSAT — Login (behaviour only; the card markup lives in public/index.html) */
GSAT.page('login', function () {
  'use strict';
  var $ = jQuery;

  GSAT.reset();                       // fresh session every visit to login

  function selectedRole() { return $('#role-picker .gsat-role-btn.active').attr('data-role') || 'SAS'; }

  function showError(text) { $('#login-error').text(text).prop('hidden', false); }

  function doLogin() {
    var user = $('#login-username').val().trim().toLowerCase();
    var pass = $('#login-password').val();
    var role = selectedRole();

    /* A refused attempt belongs in the trail as much as an accepted one, and
       nobody is signed in to attribute it to — so the actor is what was typed
       and picked on the card, not the session. */
    if (user !== 'mcmena' || pass !== 'gsat') {
      GSAT.log('Denied', 'Session', user || '(no username)',
        'Sign-in refused as ' + role + ' — invalid username or password.',
        { role: role, user: user || 'Unknown' });
      return showError('Invalid username or password.');
    }

    GSAT.set({ loggedIn: true, role: role });
    // pin the directory record by code, so a later rename keeps pointing here
    GSAT.set({ me: (GSAT.me() || {}).code || '' });
    GSAT.log('Sign in', 'Session', user, GSAT.profileName(role) + ' signed in.');
    location.href = GSAT.home();   // roles without a dashboard land on their own first page
  }

  $('#role-picker').on('click', '.gsat-role-btn', function () {
    $('#role-picker .gsat-role-btn').removeClass('active');
    $(this).addClass('active');
  });

  $('#login-btn').on('click', doLogin);

  $('#login-username, #login-password')
    .on('keydown', function (e) { if (e.key === 'Enter') doLogin(); })
    .on('input', function () { $('#login-error').prop('hidden', true); });
});
