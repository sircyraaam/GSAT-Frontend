/* ============================================================
   GSAT — Shared datasets & constants

   Reference data only. The assessment form, the technical checklist and the
   scorecard grid are written out as real markup in public/site-details.html,
   public/site-checklist.html and public/scorecard.html — those pages are the
   source of truth for their fields, so no field definitions live here.
   ============================================================ */
window.GSAT_DATA = (function () {
  'use strict';

  /* The demo's records now outlive the tab (see the store in app.js), so a copy
     of the seed below can be sitting in a browser that never sees an edit made
     here. Bump this whenever the seed changes and that stale copy is thrown
     away and re-seeded instead of shadowing it. */
  var SEED_VERSION = 5;   // 3 — the audit trail · 4 — users and profiles · 5 — Approved is its own status

  var PSGC = {
    'NCR - National Capital Region': { 'Metro Manila': ['Quezon City', 'Makati City', 'Pasig City', 'Caloocan City'] },
    'Region III - Central Luzon': { 'Pampanga': ['Angeles City', 'San Fernando'], 'Bulacan': ['Malolos', 'Meycauayan'] },
    'Region IV-A - Calabarzon': { 'Cavite': ['Bacoor', 'Dasmarinas'], 'Laguna': ['Calamba', 'Santa Rosa'] },
    'Region VII - Central Visayas': { 'Cebu': ['Cebu City', 'Mandaue City'] },
    'Region XI - Davao Region': { 'Davao del Sur': ['Davao City', 'Digos'] }
  };

  var BARANGAYS = {
    'Quezon City': ['Bagong Pag-asa', 'Batasan Hills', 'Commonwealth', 'Diliman', 'Holy Spirit', 'Kamuning'],
    'Makati City': ['Bel-Air', 'Poblacion', 'San Antonio', 'San Lorenzo', 'Guadalupe Nuevo'],
    'Pasig City': ['Kapitolyo', 'Oranbo', 'San Antonio', 'Ugong'],
    'Caloocan City': ['Bagong Barrio', 'Barangay 176', 'Grace Park East', 'Sangandaan'],
    'Angeles City': ['Balibago', 'Malabanias', 'Pampang', 'Santo Domingo'],
    'San Fernando': ['Dolores', 'San Agustin', 'Santo Rosario', 'Telabastagan'],
    'Malolos': ['Bulihan', 'Longos', 'Mojon', 'Santo Rosario'],
    'Meycauayan': ['Calvario', 'Malhacan', 'Pandayan', 'Saluysoy'],
    'Bacoor': ['Molino IV', 'Niog I', 'Real I', 'Talaba V'],
    'Dasmarinas': ['Burol Main', 'Paliparan I', 'Salawag', 'Zone I'],
    'Calamba': ['Canlubang', 'Halang', 'Parian', 'Real'],
    'Santa Rosa': ['Balibago', 'Don Jose', 'Macabling', 'Pooc'],
    'Cebu City': ['Banilad', 'Guadalupe', 'Lahug', 'Mabolo'],
    'Mandaue City': ['Basak', 'Centro', 'Ibabao-Estancia', 'Tipolo'],
    'Davao City': ['Buhangin', 'Matina Crossing', 'Poblacion', 'Talomo'],
    'Digos': ['Aplaya', 'Cogon', 'San Jose', 'Zone III']
  };

  var TERRITORIES = [
    { code: 'NCR', label: 'NCR - National Capital Region', subs: ['NCR North', 'NCR South', 'NCR East', 'NCR West'] },
    { code: 'NL', label: 'NL - North Luzon', subs: ['Pangasinan', 'Cagayan Valley', 'Central Luzon North'] },
    { code: 'SL', label: 'SL - South Luzon', subs: ['Calabarzon', 'Bicol', 'Mimaropa'] },
    { code: 'VIS', label: 'VIS - Visayas', subs: ['Cebu', 'Iloilo', 'Bacolod', 'Leyte'] },
    { code: 'MIN', label: 'MIN - Mindanao', subs: ['Davao', 'Cagayan de Oro', 'Zamboanga', 'General Santos'] }
  ];

  var RETAIL_AREAS = ['Ayala Center Cebu', 'Bonifacio High Street', 'Katipunan Avenue', 'Rockwell Center', 'SM North EDSA', 'Session Road'];
  var STATUS_ORDER = ['Pending', 'Ongoing', 'Approved', 'Completed', 'Fall-Out'];
  var STATUS_COLOR = { 'Pending': '#e0a800', 'Ongoing': '#17a2b8', 'Approved': '#0f9d76', 'Completed': '#28a745', 'For SAM Approval': '#6f42c1', 'Fall-Out': '#dc3545' };
  var BASE_STATUS = { 'Pending': 11, 'Ongoing': 17, 'Approved': 8, 'Completed': 16, 'Fall-Out': 5 };
  var BASE_TERR = { NCR: 18, NL: 9, SL: 14, VIS: 8, MIN: 6 };
  var MONTHLY = [
    { label: 'Jan', value: 4 }, { label: 'Feb', value: 7 }, { label: 'Mar', value: 6 }, { label: 'Apr', value: 9 },
    { label: 'May', value: 12 }, { label: 'Jun', value: 8 }, { label: 'Jul', value: 11 }, { label: 'Aug', value: 5 }
  ];

  var ROLES = {
    SAS: { label: 'SAS', title: 'Site Acquisition Specialist', user: 'Mary Cris Mena' },
    Admin: { label: 'Admin', title: 'Administrator', user: 'Joel Ramirez' },
    SAM: { label: 'SAM', title: 'Site Acquisition Manager', user: 'Marichu Buot' },
    PM: { label: 'PM', title: 'Project Manager', user: 'Arnel Salcedo' },
    REM: { label: 'REM', title: 'Regional Expansion Manager', user: 'Cristina Aquino' },
    FMS: { label: 'FMS', title: 'Franchise Management Service', user: 'Bernadette Cruz' }
  };

  /* A Regional Expansion Manager holds a region, and a region can span more than
     one territory of the mapping master list — so this is a list, not a single
     value. The strings must match column 0 of gsat-mapping.js. Everything a REM
     may see (SAMs, SAS, sites) is scoped to these territories. */
  var REMS = [
    {
      rem: 'Cristina Aquino', region: 'Luzon Region',
      territories: ['National Capital Region', 'North Luzon Sites', 'South Luzon Sites']
    },
    {
      rem: 'Edgardo Panganiban', region: 'VisMin Region',
      territories: ['Visayas Sites', 'Mindanao Sites']
    }
  ];

  var SAS_ASSIGNMENT = { territory: 'NCR', subTerritory: 'NCR North' };

  var SAS_TEAM = [
    { name: 'Mary Cris Mena', load: 6 },
    { name: 'Dennis Alvarez', load: 4 },
    { name: 'Rhea Tolentino', load: 7 },
    { name: 'Paolo Sandoval', load: 3 }
  ];

  var MANAGERS = [
    { code: 'NCR', manager: 'Ana Villareal', specialists: '2 specialists' },
    { code: 'NL', manager: 'Ruel Bautista', specialists: '1 specialist' },
    { code: 'SL', manager: 'Grace Domingo', specialists: '2 specialists' },
    { code: 'VIS', manager: 'Ferdinand Uy', specialists: '1 specialist' },
    { code: 'MIN', manager: 'Nadia Ledesma', specialists: '1 specialist' }
  ];

  /* ---------------- the SAS's three forms ----------------
     One site is assessed three times over: the Site Assessment, the Site
     Technical Checklist and the Trade and Site Scorecard. None of them hands the
     site to the SAM on its own — finishing one is a third of the job — so each
     form's Final Save records only its own completion and then asks whether the
     other two are in. All three together are what moves the site to For SAM
     Approval, and nothing else does.

     `key` is the done-flag in the store's per-site bucket; `label` is what a
     banner names when one of them is still outstanding. */
  var SAS_STEPS = [
    { key: 'detailsDone', label: 'Site Assessment' },
    { key: 'checklistDone', label: 'Site Technical Checklist' },
    { key: 'scoresDone', label: 'Trade and Site Scorecard' }
  ];

  /* ---------------- the close-out ----------------
     SAM approval ends at Approved and nowhere else: whether the site actually
     pushed through is not known on the day it is approved. Saying so is a
     separate, later act on the Site Assessment Report — a SAM or a REM picks one
     of CLOSE_TO, and Fall-Out carries a written reason.

     CLOSED is every status at or past approval: the assessment, checklist and
     scorecard behind them are finished and read-only. A fallen-out site is in
     that list on purpose — it stays fully readable, it just stops moving. */
  var CLOSE_FROM = 'Approved';
  var CLOSE_TO = ['Completed', 'Fall-Out'];
  var CLOSED = ['Approved', 'Completed', 'Fall-Out'];

  /* Two things decide whether a site can carry a Franchisee Name: it must be
     Franchise-Owned, and it must have cleared SAM approval — so these are the
     statuses at and after approval, minus the one that ends the site. A site
     still in assessment, or fallen out, has no franchisee to name. */
  var FRANCHISEE_STATUS = ['Approved', 'Completed'];

  /* The seed mixes both ownerships and both sides of approval, so all three
     states — nameable, not yet, never — are visible without editing anything.
     NCR-2026-0001 is left at Approved so the report opens with one site the
     close-out button is actually live on, and MIN-2026-0007 already closed. */
  var SEED_RECORDS = [
    { code: 'NCR-2026-0001', tradeArea: 'Diliman_Quezon City_NCR', municipality: 'Quezon City', territory: 'NCR', status: 'Approved', ownership: 'Franchise-Owned', franchiseeType: 'New' },
    { code: 'SL-2026-0002', tradeArea: 'Balibago_Santa Rosa_SL', municipality: 'Santa Rosa', territory: 'SL', status: 'Ongoing', ownership: 'Franchise-Owned', franchiseeType: 'Existing' },
    { code: 'VIS-2026-0003', tradeArea: 'Lahug_Cebu City_VIS', municipality: 'Cebu City', territory: 'VIS', status: 'Pending', ownership: 'Company-Owned', franchiseeType: '' },
    { code: 'NCR-2026-0004', tradeArea: 'Poblacion_Makati_NCR', municipality: 'Makati', territory: 'NCR', status: 'For SAM Approval', ownership: 'Franchise-Owned', franchiseeType: 'New' },
    { code: 'VIS-2026-0005', tradeArea: 'Mandaue_Mandaue City_VIS', municipality: 'Mandaue City', territory: 'VIS', status: 'For SAM Approval', ownership: 'Franchise-Owned', franchiseeType: 'Existing' },
    { code: 'NL-2026-0006', tradeArea: 'Pandan_Angeles_NL', municipality: 'Angeles', territory: 'NL', status: 'Pending', ownership: 'Company-Owned', franchiseeType: '' },
    { code: 'MIN-2026-0007', tradeArea: 'Buhangin_Davao City_MIN', municipality: 'Davao City', territory: 'MIN', status: 'Completed', ownership: 'Franchise-Owned', franchiseeType: 'New' }
  ];

  var STATUS_CHIP = {
    'Pending': ['#fff3cd', '#856404'],
    'Ongoing': ['#d1ecf1', '#0c5460'],
    'Completed': ['#d4edda', '#155724'],
    'For SAM Approval': ['#e2d9f3', '#4b2e83'],
    // Approved and Completed are both good news but they are not the same news,
    // so the two greens are told apart rather than sharing one swatch
    'Approved': ['#d3f2e6', '#0b6b4f'],
    'Returned': ['#f8d7da', '#721c24'],
    'Fall-Out': ['#f8d7da', '#721c24'],
    // user / profile records, which are active or they are not
    'Active': ['#d4edda', '#155724'],
    'Inactive': ['#e9ecef', '#41474d']
  };

  /* ---------------- profiles ----------------
     A profile IS a role. `key` is the one the rest of the app gates on — it is
     what `data-roles` matches, what ROLES above is keyed by, and what a user
     record stores — so it is fixed and never edited. `name` is only the wording
     shown on screen, and that a Site Admin may reword.

     Deactivating a profile does not take it away from the people who already
     hold it; it stops the profile being handed to anyone new. Removing a role
     the app gates on would silently lock those users out of their own modules,
     which is a migration, not a checkbox. */
  var SEED_PROFILES = [
    { id: 1, key: 'Admin', name: 'Site Admin', active: true },
    { id: 2, key: 'SAM', name: 'Site Acquisition Manager', active: true },
    { id: 3, key: 'SAS', name: 'Site Acquisition Specialist', active: true },
    { id: 4, key: 'PM', name: 'Project Manager', active: true },
    { id: 5, key: 'REM', name: 'Regional Expansion Manager', active: true },
    { id: 6, key: 'FMS', name: 'Franchise Management Service', active: true }
  ];

  /* ---------------- users ----------------
     The people already named across the app — the six signed-in roles, the SAS
     team behind the dashboard's workload bars, and the managers behind its
     coverage list — so the directory and the screens agree with each other from
     the first load. `profile` holds a profile key, never a display name.

     One record is inactive on purpose: a list that only ever shows one status
     cannot show what the other looks like. */
  var SEED_USERS = [
    { id: 1, code: '000001', first: 'Joel', mi: 'B', last: 'Ramirez', profile: 'Admin', email: 'joel.ramirez@generika.com.ph', active: true, created: '2026-01-06T01:12:00.000Z' },
    { id: 2, code: '000002', first: 'Mary Cris', mi: 'A', last: 'Mena', profile: 'SAS', email: 'marycris.mena@generika.com.ph', active: true, created: '2026-01-06T01:20:00.000Z' },
    { id: 3, code: '000003', first: 'Marichu', mi: 'L', last: 'Buot', profile: 'SAM', email: 'marichu.buot@generika.com.ph', active: true, created: '2026-01-06T01:26:00.000Z' },
    { id: 4, code: '000004', first: 'Arnel', mi: 'D', last: 'Salcedo', profile: 'PM', email: 'arnel.salcedo@generika.com.ph', active: true, created: '2026-01-09T02:04:00.000Z' },
    { id: 5, code: '000005', first: 'Cristina', mi: 'M', last: 'Aquino', profile: 'REM', email: 'cristina.aquino@generika.com.ph', active: true, created: '2026-01-09T02:11:00.000Z' },
    { id: 6, code: '000006', first: 'Bernadette', mi: 'S', last: 'Cruz', profile: 'FMS', email: 'bernadette.cruz@generika.com.ph', active: true, created: '2026-01-09T02:18:00.000Z' },
    { id: 7, code: '000007', first: 'Edgardo', mi: 'P', last: 'Panganiban', profile: 'REM', email: 'edgardo.panganiban@generika.com.ph', active: true, created: '2026-02-03T00:48:00.000Z' },
    { id: 8, code: '000008', first: 'Dennis', mi: 'R', last: 'Alvarez', profile: 'SAS', email: 'dennis.alvarez@generika.com.ph', active: true, created: '2026-02-17T01:35:00.000Z' },
    { id: 9, code: '000009', first: 'Rhea', mi: 'T', last: 'Tolentino', profile: 'SAS', email: 'rhea.tolentino@generika.com.ph', active: true, created: '2026-02-17T01:41:00.000Z' },
    { id: 10, code: '000010', first: 'Paolo', mi: 'V', last: 'Sandoval', profile: 'SAS', email: 'paolo.sandoval@generika.com.ph', active: true, created: '2026-02-17T01:47:00.000Z' },
    { id: 11, code: '000011', first: 'Ana', mi: 'C', last: 'Villareal', profile: 'SAM', email: 'ana.villareal@generika.com.ph', active: true, created: '2026-03-04T05:22:00.000Z' },
    { id: 12, code: '000012', first: 'Ruel', mi: 'G', last: 'Bautista', profile: 'SAM', email: 'ruel.bautista@generika.com.ph', active: true, created: '2026-03-04T05:29:00.000Z' },
    { id: 13, code: '000013', first: 'Grace', mi: 'N', last: 'Domingo', profile: 'SAM', email: 'grace.domingo@generika.com.ph', active: true, created: '2026-03-04T05:36:00.000Z' },
    { id: 14, code: '000014', first: 'Ferdinand', mi: 'U', last: 'Uy', profile: 'SAM', email: 'ferdinand.uy@generika.com.ph', active: true, created: '2026-03-11T06:02:00.000Z' },
    { id: 15, code: '000015', first: 'Nadia', mi: 'E', last: 'Ledesma', profile: 'SAM', email: 'nadia.ledesma@generika.com.ph', active: true, created: '2026-03-11T06:09:00.000Z' },
    {
      id: 16, code: '000016', first: 'Melchor', mi: 'F', last: 'Reyes', profile: 'SAS',
      email: 'melchor.reyes@generika.com.ph', active: false, created: '2026-01-20T02:40:00.000Z',
      deactivatedAt: '2026-07-31T09:15:00.000Z', deactivatedBy: 'Joel Ramirez'
    }
  ];

  /* ---------------- audit trail ----------------
     The actions GSAT.log() writes, in the order the Audit Trail Report offers
     them in its Action filter. Same shape as STATUS_CHIP and read by the same
     GSAT.chip() helper, kept in its own map so an action and a site status can
     never collide — 'Approved' is a status, 'Approve' is something a SAM did. */
  var AUDIT_CHIP = {
    'Create':   ['#d1ecf1', '#0c5460'],
    'Update':   ['#e9ecef', '#41474d'],
    'Draft':    ['#fff3cd', '#856404'],
    'Submit':   ['#e2d9f3', '#4b2e83'],
    'Approve':  ['#d4edda', '#155724'],
    'Return':   ['#f8d7da', '#721c24'],
    'Complete': ['#d4edda', '#155724'],
    'Fall out': ['#f8d7da', '#721c24'],
    'Assign':   ['#d4edda', '#155724'],
    'Remove':   ['#f8d7da', '#721c24'],
    'Attach':   ['#dbe7f3', '#123a5e'],
    'Sign in':  ['#dbe7f3', '#123a5e'],
    'Sign out': ['#e9ecef', '#41474d'],
    'Denied':   ['#f8d7da', '#721c24'],
    'Reset':    ['#f8d7da', '#721c24']
  };

  /* The history behind SEED_RECORDS, so the report opens with a trail to read
     rather than an empty table. Newest first — the same order GSAT.log() keeps
     the live entries in. `at` is UTC; the report renders it in local time, and
     these were picked to read as Philippine office hours. */
  var SEED_AUDIT = [
    {
      at: '2026-08-27T08:40:00.000Z', role: 'REM', user: 'Edgardo Panganiban',
      module: 'Site Assessment Report', action: 'Complete', entity: 'MIN-2026-0007',
      detail: 'Status updated to Completed. The site pushed through.'
    },
    {
      at: '2026-08-27T07:05:00.000Z', role: 'SAM', user: 'Marichu Buot',
      module: 'Site Assessment', action: 'Approve', entity: 'MIN-2026-0007',
      detail: 'Assessment approved. Status: Approved.'
    },
    {
      at: '2026-08-27T03:20:00.000Z', role: 'SAS', user: 'Mary Cris Mena',
      module: 'Site Assessment', action: 'Submit', entity: 'VIS-2026-0005',
      detail: 'Site Assessment completed and submitted to SAM for approval.'
    },
    {
      at: '2026-08-26T08:48:00.000Z', role: 'SAS', user: 'Mary Cris Mena',
      module: 'Site Assessment', action: 'Submit', entity: 'NCR-2026-0004',
      detail: 'Site Assessment completed and submitted to SAM for approval.'
    },
    {
      at: '2026-08-26T06:11:00.000Z', role: 'SAS', user: 'Mary Cris Mena',
      module: 'Site Assessment', action: 'Draft', entity: 'SL-2026-0002',
      detail: 'Draft saved on Commercial Terms. Status: Ongoing.'
    },
    {
      at: '2026-08-26T01:35:00.000Z', role: 'Admin', user: 'Joel Ramirez',
      module: 'SAS Assignment', action: 'Assign', entity: 'Davao City',
      detail: 'Area assigned to Dennis Alvarez.'
    },
    {
      at: '2026-08-25T09:02:00.000Z', role: 'SAS', user: 'Mary Cris Mena',
      module: 'Site Creation', action: 'Create', entity: 'NL-2026-0006',
      detail: 'Trade Area Pandan_Angeles_NL created. Company-Owned. Status: Pending.'
    },
    {
      at: '2026-08-25T02:14:00.000Z', role: 'SAS', user: 'Mary Cris Mena',
      module: 'Site Creation', action: 'Create', entity: 'VIS-2026-0003',
      detail: 'Trade Area Lahug_Cebu City_VIS created. Company-Owned. Status: Pending.'
    },
    {
      at: '2026-08-24T08:30:00.000Z', role: 'SAM', user: 'Marichu Buot',
      module: 'Site Assessment', action: 'Return', entity: 'SL-2026-0002',
      detail: 'Returned to SAS for revision. Reason: Lessor contact number is incomplete.'
    },
    {
      at: '2026-08-24T01:02:00.000Z', role: 'Admin', user: 'Joel Ramirez',
      module: 'SAM / REM Assignment', action: 'Assign', entity: 'NCR North',
      detail: 'Sub-territory assigned to Ana Villareal.'
    }
  ];

  return {
    SEED_VERSION: SEED_VERSION,
    PSGC: PSGC, BARANGAYS: BARANGAYS, TERRITORIES: TERRITORIES, RETAIL_AREAS: RETAIL_AREAS,
    STATUS_ORDER: STATUS_ORDER, STATUS_COLOR: STATUS_COLOR, BASE_STATUS: BASE_STATUS, BASE_TERR: BASE_TERR,
    MONTHLY: MONTHLY,
    ROLES: ROLES, REMS: REMS, FRANCHISEE_STATUS: FRANCHISEE_STATUS,
    SAS_STEPS: SAS_STEPS,
    CLOSE_FROM: CLOSE_FROM, CLOSE_TO: CLOSE_TO, CLOSED: CLOSED,
    SAS_ASSIGNMENT: SAS_ASSIGNMENT, SAS_TEAM: SAS_TEAM, MANAGERS: MANAGERS,
    SEED_RECORDS: SEED_RECORDS, STATUS_CHIP: STATUS_CHIP,
    AUDIT_CHIP: AUDIT_CHIP, SEED_AUDIT: SEED_AUDIT,
    SEED_USERS: SEED_USERS, SEED_PROFILES: SEED_PROFILES
  };
})();
