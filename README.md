# GSAT-FE — Site Acquisition Frontend

Multi-page frontend for the GSAT (Generika Site Acquisition) prototype, built with
**Bootstrap 5 + jQuery** (no React, no build step). All vendor files are local.

## The flow

**All markup lives in `public/`. jQuery is only used for functions.**

- Every page in `public/` is a complete HTML document: the layout, the cards, the
  form fields, the tables, the buttons — all of it is real markup you can open and
  edit. Rows that repeat at runtime (table rows, search results) are written once
  inside a `<template>` on the same page.
- The shared chrome lives in `public/inc/` and is pulled in with `GSATInclude(...)`,
  the same way a PHP `include` would work.
- No `.js` file in this project builds HTML strings. The scripts read the DOM, fill
  it, toggle it, and save state — nothing else.

```
GSAT-FE/
├── index.html                       # forwards "/" to public/ (dev servers)
├── .htaccess                        # Apache: "/" -> the login page
├── public/                          # All pages — open/serve from here
│   ├── .htaccess                    #   index.html (login) is the directory index
│   ├── inc/                         # shared partials, included by every page
│   │   ├── head.html                #   meta + stylesheets ({{title}} placeholder)
│   │   ├── sidebar.html             #   full module nav, gated per role
│   │   ├── navbar.html              #   topbar: breadcrumb + user menu
│   │   └── footer.html
│   ├── index.html                   # Login (entry point)
│   ├── dashboard.html               # Role-aware dashboard (SAS / Admin / SAM)
│   ├── site-creation.html           # SAS: create trade areas (PSGC cascade)
│   ├── site-assessment.html         # List / SAM approval queue
│   ├── site-details.html            # 11-tab site assessment form
│   ├── site-checklist.html          # Site Technical Checklist (5 tabs)
│   ├── scorecard.html               # Trade and Site Scorecard
│   ├── sas-assignment.html          # Admin: area → SAS assignment
│   ├── sam-assignment.html          # Admin: sub-territory → SAM assignment
│   ├── report-location-mapping.html # Backward-compatible redirect to the combined module
│   ├── report-site-assessment.html  # Site and Lessor Transaction module
│   ├── report-audit-trail.html      # Audit trail report (Admin only)
│   ├── user-list.html               # Admin: the account directory
│   ├── user-creation.html           # Admin: create / edit one account
│   ├── profiles.html                # Admin: the profiles (roles) accounts sign in under
│   └── my-profile.html              # Every role: your own record (user menu)
└── assets/
    ├── css/
    │   ├── bootstrap.min.css        # Bootstrap 5.3.3 (vendored)
    │   ├── bootstrap-icons.min.css  # Bootstrap Icons 1.13.1 (vendored)
    │   ├── fonts.css                # Open Sans @font-face
    │   └── style.css                # GSAT theme (teal #17a2b8 / navy #123a5e)
    ├── fonts/                       # Open Sans woff2 subsets + bootstrap-icons woff2
    ├── images/
    │   └── site-acquisition-logo.webp
    └── js/
        ├── vendor/                  # jquery 3.7.1, bootstrap.bundle 5.3.3
        ├── include.js               # the GSATInclude() partial loader
        ├── gsat-mapping.js          # Location mapping master list (window.GSAT_MAPPING)
        ├── data.js                  # PSGC, territories, roles, seed records
        ├── app.js                   # session store, auth guard, shell wiring, DOM helpers
        └── pages/                   # One script per page — behaviour only
```

## How a page is put together

```html
<head>
  <script src="../assets/js/include.js"></script>
  <script>GSATInclude('inc/head.html', { title: 'Site Creation' });</script>
</head>
<body data-page="site-creation" data-crumb="Site Creation" data-allow="SAS" data-fallback="dashboard.html">
<div class="gsat-layout">
  <script>GSATInclude('inc/sidebar.html');</script>
  <div class="gsat-main">
    <script>GSATInclude('inc/navbar.html');</script>
    <main class="gsat-content">
      <div class="gsat-banner" id="gsat-banner" hidden></div>
      <!-- the page itself -->
    </main>
    <script>GSATInclude('inc/footer.html');</script>
  </div>
</div>
```

`<body>` is the contract between the markup and `app.js`:

| Attribute       | Meaning                                                        |
|-----------------|----------------------------------------------------------------|
| `data-page`     | Page key; matches `data-nav` in the sidebar to mark it active   |
| `data-crumb`    | Breadcrumb text shown in the topbar                            |
| `data-allow`    | Roles permitted here; anyone else is redirected                 |
| `data-fallback` | Where a disallowed role is sent (defaults to `dashboard.html`)  |

Anywhere in a page, `data-roles="SAS Admin"` removes that element for other roles,
and `data-bind="key"` marks a slot a script can fill.

### Helpers the page scripts use instead of writing HTML

| Helper                                   | What it does                                        |
|------------------------------------------|-----------------------------------------------------|
| `GSAT.tpl('tpl-record-row')`             | clones the markup in that `<template>`              |
| `GSAT.bind($scope, { code: 'NCR-…' })`   | fills `[data-bind]` slots (text, or `value` on inputs) |
| `GSAT.options($select, list, selected)`  | refills a `<select>` without `<option>` strings     |
| `GSAT.chip($el, 'Pending')`              | colours an existing `.gsat-chip` for a status       |
| `GSAT.toggle($el, on)`                   | shows/hides via the `hidden` attribute              |
| `GSAT.banner('ok', '…')`                 | shows the page banner                              |
| `GSAT.log('Create', 'Site Creation', code, '…')` | writes one line to the audit trail        |
| `GSAT.logEdit(module, code, 'Zip Code', v)` | writes a field edit, folding keystrokes together |

### Icons

[Bootstrap Icons](https://icons.getbootstrap.com/) 1.13.1, vendored locally — use any
icon by class, e.g. `<i class="bi bi-file-earmark-text"></i>`. The square action
buttons come in three weights:

```html
<button class="gsat-icon-btn solid"><i class="bi bi-file-earmark-text"></i></button>  <!-- filled teal  -->
<button class="gsat-icon-btn"><i class="bi bi-card-checklist"></i></button>           <!-- teal outline -->
<button class="gsat-icon-btn muted"><i class="bi bi-bar-chart"></i></button>          <!-- grey outline -->
```

## Running

The partials are fetched over HTTP, so the pages need a static server —
opening `index.html` with `file://` will not load `inc/`.

```bash
# Python
python3 -m http.server 8080
# then open http://localhost:8080/public/

# or Node
npx serve .
```

Then open the server root — `/` forwards to the login page.

No server config is needed. Static servers present the same file under different
URLs — `npx serve` rewrites `/public/dashboard.html` to `/public/dashboard`,
Apache keeps the `.html`, and a stray redirect can drop the trailing slash from
`/public/`. Any of those changes what a relative link resolves against, which is
what breaks stylesheets and navigation on a site built from relative paths.

So the pages do not rely on the URL's shape: `include.js` writes a `<base href>`
worked out from its **own** script URL. It always sits at
`<root>/assets/js/include.js` and the pages always sit at `<root>/public/`, so
that one tag pins every link, stylesheet, script and `location.href` in the page
to the right place regardless of how the server presents the URL. If you ever
move the pages out of `public/`, update `APP_DIR` at the top of `include.js`.

Two different mechanisms do that, because static dev servers and Apache have
nothing in common here:

| Server | What sends `/` to the login page |
|--------|----------------------------------|
| `npx serve`, `python -m http.server` | the root `index.html` forwarder — **these ignore `.htaccess` entirely** |
| Apache | the `.htaccess` 302, which runs before `index.html` is ever considered |

So if `/` shows a directory listing, you are on a dev server and the root
`index.html` is missing — not an `.htaccess` problem.

### On Apache

Point the vhost / document root at **the project root (`GSAT-FE/`), not `public/`** —
every page links out to `../assets/`, so `assets/` has to be reachable as a sibling
of `public/`. The bundled `.htaccess` then handles the rest:

| Request              | Result                                     |
|----------------------|--------------------------------------------|
| `/`                  | 302 to `/public/` → the login page          |
| `/public/`           | login page                                  |
| `/some-typo`         | 302 to the login page                       |
| `/assets/missing.css`| plain 404, so broken asset paths stay visible |

It needs `mod_rewrite` and `AllowOverride All` for the directory. If your host forces
the document root to be a `public_html`-style folder, move `assets/` inside `public/`
and change the `../assets/` prefixes in `public/inc/head.html` and the script tags at
the bottom of each page to `assets/`.

`public/inc/` must stay web-readable — those partials are fetched over HTTP by
`GSATInclude()`, not included server-side. Don't add a deny rule for them.

## Demo login

| Field    | Value    |
|----------|----------|
| Username | `mcmena` |
| Password | `gsat`   |

Pick a role on the login card (SAS / Admin / SAM / PM / REM / FMS) — modules and
permissions change per role, matching the prototype:

- **SAS** — dashboard with charts, Site Creation, full assessment workflow
  (details → checklist → scorecard, submit to SAM).
- **Admin** — assignment dashboards, SAS Assignment, SAM/REM Assignment, reports.
- **SAM** — approval queue scoped to their territory (Approve / Return to SAS), reports.
- **PM** — view-only assessments; can encode Actual Floor Area under Commercial Terms.
- **REM** (Regional Expansion Manager) — dashboard and Site and Lessor Transaction Module scoped
  to their **region**, listing every SAM and SAS under it; sets Franchisee Names.
- **FMS** (Franchise Management Service) — every site in every territory, view only.
  Setting the Franchisee Name is the one thing they can write.

### Franchisee Name

The field lives on `site-creation.html`, next to Franchisee-Owned Type. Three rules
govern it, all enforced everywhere the field appears:

1. **Only REM and FMS may write it.** Every other role sees it read-only.
2. **Only a Franchise-Owned site has one.** Like Franchisee-Owned Type, the field
   hangs off Store Ownership — on a Company-Owned site it is dimmed and locked for
   everyone.
3. **Only from approval onward.** Approving a site sets it to `Completed`
   (`site-details.js`), so `FRANCHISEE_STATUS` in `data.js` is
   `['Approved', 'Completed']`. A site still in assessment, or fallen out, cannot
   be named yet.

`GSAT.franchiseeBlock(record)` is the single test for rules 2 and 3. It returns the
*reason* — `'ownership'`, `'status'` or `''` — rather than a bare false, because a
screen has to say which rule stopped it; `GSAT.canBeFranchised()` wraps it for the
yes/no case. The report's Franchisee column reads those three states differently:
**N/A** (never), **—** (not yet, with the status in the tooltip), **Not set** (go
ahead), and the row button is disabled with the reason as its title.

**Marking what is editable.** On a page where a REM or FMS has one writable field
among thirty locked ones, the field is *marked* rather than described: a brand ring,
a pencil, and an "Editable" pill next to its label (`.gsat-editable-field.on` /
`.gsat-editable-tag`, the mirror of the existing `.gsat-locked-field` padlock). The
note underneath is reserved for the cases where the field is closed and the reason
would not otherwise be obvious.

Adding six roles to the login card also outgrew the picker: `#role-picker` is now a
three-column grid rather than one flex row, so the roles sit 3 × 2 at full size and a
seventh just starts another line.

REM and FMS do not create sites, so they reach the field from the Site Assessment
Report: the person-badge button on a row opens Site Creation with that saved site
loaded, every other field locked, and a *Save Franchisee* button in place of *Save*.
Names are kept in `state.franchisees` (site code → name) and surface as the report's
Franchisee column.

For rule 2 to survive a save, Site Creation now **persists the category radios** onto
the record (`ownership`, `siteCategory`, `franchiseeType`, `storeType`, `source`,
`retailTradeArea`) — previously it collected them and dropped them all, so a saved
site had no ownership to test and its radios came back blank. `SEED_RECORDS` carries
ownership too, and mixes both ownerships with both sides of approval, so all three
states are visible without editing anything: `NCR-2026-0001` and `MIN-2026-0007` can
be named, `SL-2026-0002` / `NCR-2026-0004` / `VIS-2026-0005` are not yet approved,
and `VIS-2026-0003` / `NL-2026-0006` are Company-Owned and never will be.

A REM's region can span several of the mapping master list's territories, so
`REMS` in `data.js` gives each REM a **list** of territories — `GSAT.remTerritories()`
returns it and `GSAT.inRemRegion(territory)` is the scoping test, the many-territory
counterpart to `GSAT.samTerritory()`.

Roles without a dashboard (PM, FMS) would otherwise ping-pong between two pages
neither may open, since `data-fallback` is written per page. `GSAT.home()` in
`app.js` names one landing page per role and the guard uses it in preference to
`data-fallback`; login uses it too.

### User Management (Admin only)

Three screens under one sidebar group, all `data-allow="Admin"`:

| Screen                | What it is                                                          |
|-----------------------|---------------------------------------------------------------------|
| `user-list.html`      | The directory — filter by profile / status / text, page through it   |
| `user-creation.html`  | One account, created or edited                                       |
| `profiles.html`       | The profiles accounts sign in under, renamed or switched off         |

**A profile is a role.** `SEED_PROFILES` in `data.js` gives each one a `key`, and that
key is the thing the whole app already gates on: it is what `data-roles` matches, what
`ROLES` is keyed by, and what a user record stores. So the key is fixed and read-only,
and the list is not extensible from the UI — a seventh profile would be a name no
screen grants anything to. What an Admin owns on `profiles.html` is the **wording**
(read everywhere through `GSAT.profileName(key)`, so a rename reaches the user list and
the profile dropdown at once) and whether the profile may still be **handed out**.

Deactivating a profile — or a user — never removes anything. A deactivated profile just
stops being offered on new accounts; the people holding it keep it, because taking a
role off a live account would lock them out of their own modules silently. Same for a
user: `active: false` keeps their name on every record they touched. Both deactivations
are confirmed through `GSAT.ask()` first, and neither screen has a delete.

`user-creation.html` is both the "new" form and the "edit" form, told apart by
**`?code=000005` in the URL** rather than by the store. It is a sidebar link as well as
the target of the list's pencil, and a code parked in the session would make that menu
link open whoever was edited last instead of a blank form.

Validation follows Site Creation's `REQUIRED` pattern — every gap named in the banner
and outlined in the form — plus an email shape check and a duplicate-address check
across the directory. The six stamps at the foot (`Date`/`Time Created`,
`Deactivation Date`/`Deactivated By`, `Modified Date`/`Modified By`) are written by the
save, never typed, and every save writes to the audit trail under module
**User Management**.

`SEED_USERS` is the people already named across the app — the six signed-in roles, the
SAS team behind the dashboard's workload bars, the managers behind its coverage list —
so the directory and the screens agree from the first load. One record is inactive on
purpose, since a list that only ever shows one status cannot show what the other looks
like. Creating an account here does **not** create a login: the demo still signs in with
the one credential below and the role picker on the card. Wiring the two together is a
back end's job, and the note is here so nobody looks for the bug.

### My Profile

`my-profile.html`, reached from **My Profile** in the topbar's user menu, is the one
screen in this group open to every role — it shows you your own record and nothing else.
The split it is built around:

- **Yours**: first name, MI, last name, email. They are how the app signs your work.
- **An administrator's**: profile, status, user code, and the stamps. They are what the
  app *grants* you, and a page that let you widen your own access would not be a profile
  page. Those are locked here and live on `user-creation.html`.

**Territory** and **Sub-Territory** sit on the same card, locked with the rest. One pair
of fields serves six roles that are each scoped by a different thing, so `coverage()`
answers per role: a SAS's fixed assignment, the sub-territories a SAM holds (including
any moved on the SAM / REM Assignment screen), a REM's region spelled out as its list of
territories, and "All territories / All sub-territories" for the three unscoped roles.

The SAM lookup matches on the **seeded** role name rather than `meName()`, because
`gsat-mapping.js` holds manager names as plain strings — it is keyed to the seed, and
`GSAT.samTerritory()` reads it the same way. Using the editable name would empty a
manager's own coverage the moment they corrected their name one card above.

**The directory is now what names the signed-in person.** `GSAT.me()` resolves the record
for the session and `GSAT.meName()` is what the topbar, the audit trail's `actor()` and
the record stamps all read, so a name corrected here shows up everywhere. Login pins the
record **by code** into `state.me`, which is what makes a rename survive: matching on the
seed name would lose the person the moment they changed it. Two fallbacks sit behind the
pin — an older session is matched on `ROLES[role].user`, and failing that the first active
holder of the role — because the shell has to have a name to show whatever the state is.

One consequence worth knowing: the topbar's role line now reads `GSAT.profileName()` too,
so a profile reworded on Profiles is reworded there as well. That is why an Admin's topbar
says **Site Admin** (the profile's name) rather than *Administrator* (`ROLES.Admin.title`).

Sign-in credentials are still not part of any of this — see the note above.

`.gsat-pager` in `style.css` is new and used by these two lists only. Every other list
in the app draws everything it holds and says so in a note; a directory is the one thing
here that grows without bound as people join, so it pages instead — `Show 10 / 25 / 50 /
All`, and up to seven slots so the row never outgrows the card.

### Audit Trail Report (Admin only)

`report-audit-trail.html` is the one screen that reads `state.audit`, and the
Reports group only shows it to Admin (`data-roles="Admin"` on the sidebar link,
`data-allow="Admin"` on the page). Everything that writes, writes a line first:

| Module                    | What is recorded                                                        |
|---------------------------|-------------------------------------------------------------------------|
| Session                   | Sign in, sign out, a refused sign-in (`Denied`), reset demo data          |
| Site Creation             | A trade area created; a Franchisee Name set or changed                   |
| Site Assessment           | Every field edited, SAR attached/removed, draft saved, submitted to SAM, approved, returned with its reason, PM's Actual Floor Area |
| Site Technical Checklist  | Every answer and remark, draft saved, finalized                          |
| Trade and Site Scorecard  | Every score and remark                                                   |
| SAS / SAM · REM Assignment| An area or sub-territory assigned or removed, and who it moved between   |
| User Management           | An account created or edited, deactivated or reactivated; a profile renamed or switched off |
| My Profile                | Someone correcting their own name or email                               |
| Dashboard                 | Admin assigning a pending site to a SAS                                  |

Two functions in `app.js` write it:

- **`GSAT.log(action, module, entity, detail, actor)`** — one deliberate act. `action`
  is a key of `AUDIT_CHIP` in `data.js`, which also gives it its colour and fixes the
  order of the report's Action filter. `actor` is only passed where the act itself
  changes who is signed in — a refused login has no session to attribute to, and
  `resetDemo()` has to read the actor *before* it wipes the trail, since the reset
  goes back to the seed along with everything else.
- **`GSAT.logEdit(module, entity, field, value)`** — one field of one form. A typed
  field fires per keystroke, so two minutes of edits to the same field of the same
  record collapse into the one line that says where it ended up; moving to another
  field, or another record, ends the run. The field is named the way the screen names
  it — "Lessor's Contact Number", not `lcontact` — read off the row's own label.

Entries are unshifted, so the array is already newest-first and the report never
sorts. `at` is ISO/UTC; the report renders it and filters the date range in the
reader's timezone, so the **From/To** filter always agrees with the **When** column.
`AUDIT_MAX` (500) is a localStorage quota, not a retention policy.

The trail records writes, not reads: opening a record leaves no entry. `SEED_AUDIT`
in `data.js` is the history behind `SEED_RECORDS`, so the report opens with something
to read — which is what bumped `SEED_VERSION` to 3.

### Required fields on Site Creation

"Please complete all required fields" is no help on a form this long, so `REQUIRED`
in `site-creation.js` lists each one once — the words the page uses for it, the cell
to outline, and for Franchisee-Owned Type a `when()` because it is only required
while the site is Franchise-Owned. A save with gaps names them all in the banner
("Complete these 6 fields before saving: …", or one sentence when only one is left),
outlines each cell and reddens its label, and scrolls to the first — but only if it
is off screen, since the banner holds the full list and sits at the top.

Each mark clears as its field is answered, and the address cascade clears the ones
below it, which it has just emptied.

`.gsat-missing` goes on the **grid cell**, not the control: Tom Select hides the real
`<select>` and draws its own markup, and within that it is `.ts-wrapper` that carries
the box — the theme sets `border: 0` on the inner `.ts-control` at a specificity a
cell-scoped rule cannot reach, so colouring that element paints nothing at all.

### A locked choice still reads as chosen

`.gsat-radio.disabled .dot` cleared the fill on every disabled control, so any
view-only form showed all of its answers blank — a SAM reviewing an assessment, a PM
reading one, a REM checking a site's ownership. Disabled now mutes the mark to grey
instead of erasing it (`.gsat-radio.disabled.on`), which is what a reader who cannot
write is there to see.

## Notes

- App state lives in two buckets (see the store at the top of `app.js`): what the
  demo has accumulated — records, drafts, assignments, decisions, the audit trail —
  in `localStorage` under `gsat-data`, so it survives logout and a browser restart;
  who is signed in and which site is open in `sessionStorage` under `gsat-session`,
  so a second tab can show another role against the same records. *Reset demo data*
  in the user menu is what throws the first one away.
- The mapping master list (`gsat-mapping.js`) drives SAS/SAM lookups, the
  assignment screens and both reports, same as the prototype.
- The assessment form, technical checklist and scorecard grid have no field
  definitions in JavaScript — add, remove or reword a field by editing
  `site-details.html`, `site-checklist.html` or `scorecard.html` directly. Keep the
  `data-k` / `data-key` attributes, which are what the scripts save against.
- No backend is required; wiring these pages to a real API means replacing the
  store functions in `assets/js/app.js`.
