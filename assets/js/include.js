/* ============================================================
   GSAT — Static include loader
   Lets a plain HTML page pull in the shared partials that live in
   public/inc/ (head, sidebar, navbar, footer) without a build step.

     <script src="../assets/js/include.js"></script>
     <script>GSATInclude('inc/head.html', { title: 'Site Creation' });</script>

   The fetch is synchronous on purpose: the partial is written into the
   document at the exact point the tag appears, so stylesheets still load
   before first paint and the sidebar/navbar exist before jQuery runs.
   Requires the page to be served over http:// (see README).
   ============================================================ */
(function (window, document) {
  'use strict';

  /* ---------------------------------------------------------------
     Anchor the page.

     Relative URLs normally resolve against the page URL, which we cannot
     trust: a static server may present public/dashboard.html as /public/
     dashboard, /public/dashboard/, or (after a stray redirect) leave the
     browser on /public with no trailing slash. In that last case every
     relative link resolves one directory too high and the page 404s.

     This script always sits at <root>/assets/js/include.js and the pages
     always sit at <root>/public/, so the script's own resolved URL tells us
     exactly where the app lives, whatever shape the page URL has. Writing a
     <base> from it fixes links, stylesheets, scripts and location.href
     assignments in one go. It has to be the first thing in <head>.
     --------------------------------------------------------------- */
  var APP_DIR = 'public/';        // where the pages live, relative to the project root

  function appBase() {
    var self = document.currentScript && document.currentScript.src;
    if (!self) return null;
    var root = self.replace(/assets\/js\/include\.js(?:[?#].*)?$/, '');
    return root === self ? null : root + APP_DIR;
  }

  var BASE = appBase();
  if (BASE && !document.querySelector('base')) {
    document.write('<base href="' + BASE + '">');
  }

  /* ---------------------------------------------------------------
     Partials
     --------------------------------------------------------------- */
  var cache = {};

  function resolve(url) {
    try { return new URL(url, BASE || document.baseURI).href; } catch (e) { return url; }
  }

  function warn(url, why) {
    window.console && console.error(
      '[GSATInclude] could not load "' + url + '" (' + why + '). ' +
      'Serve the project over http:// — for example: npx serve .'
    );
    return '';
  }

  function read(url) {
    var href = resolve(url);
    if (Object.prototype.hasOwnProperty.call(cache, href)) return cache[href];

    var xhr = new XMLHttpRequest();
    try {
      xhr.open('GET', href, false);
      xhr.send(null);
    } catch (e) {
      return warn(href, e.message || 'request blocked');
    }
    // status is 0 for a successful file:// read in some browsers
    if (xhr.status >= 400) return warn(href, 'HTTP ' + xhr.status);

    cache[href] = xhr.responseText;
    return cache[href];
  }

  /* Replaces {{name}} placeholders with the values passed in. */
  function merge(html, vars) {
    if (!vars) return html;
    return html.replace(/\{\{\s*(\w+)\s*\}\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) && vars[key] != null
        ? String(vars[key])
        : '';
    });
  }

  window.GSATInclude = function (url, vars) {
    document.write(merge(read(url), vars));
  };
})(window, document);
