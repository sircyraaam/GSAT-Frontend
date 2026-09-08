# GSAT — Role Profiles, Modules and Permissions

The access model for the Site Acquisition frontend, written from the code as it
stands. Six profiles, fifteen screens. A profile **is** a role: `SEED_PROFILES`
in `assets/js/data.js` gives each one a `key`, and that key is what every gate in
the app matches on.

---

## 1. How access is enforced

Three layers, in the order they run. Nothing else grants or removes access.

| Layer | Where | What it does |
|-------|-------|--------------|
| **Page guard** | `data-allow` on each page's `<body>`, read by `GSAT.page()` in `app.js` | Roles not listed are redirected to `GSAT.home()` before the page script runs |
| **Element gating** | `data-roles="SAS Admin"` on any element, applied in `initShell()` | The element is **removed from the DOM** for every other role — sidebar links, buttons, headings, whole dashboard sections |
| **Field / action locks** | Per-page scripts (`viewOnly`, `rowLocked()`, `canClose`, `canFranchisee`) | A role that may open a screen but not write on it gets locked inputs and hidden action buttons |

Two supporting rules:

- **Landing page.** `HOME` in `app.js` — `PM → site-assessment.html`,
  `FMS → report-site-assessment.html`, everyone else `dashboard.html`. Used at
  login *and* by the guard, so a role with no dashboard never ping-pongs between
  two pages it may not open.
- **Read-only handoff.** `state.readOnly` is set by the screen that *opens* a
  record. The Site Assessment list sets it for SAM and PM; the Site Assessment
  Report sets it for every viewer. The form itself also treats REM and FMS as
  viewers regardless of the flag.

---

## 2. The six profiles

| Key | Profile name (editable on Profiles) | Title | Seeded user | Lands on |
|-----|-------------------------------------|-------|-------------|----------|
| `SAS` | Site Acquisition Specialist | Site Acquisition Specialist | Mary Cris Mena | Dashboard |
| `Admin` | Site Admin | Administrator | Joel Ramirez | Dashboard |
| `SAM` | Site Acquisition Manager | Site Acquisition Manager | Marichu Buot | Dashboard |
| `PM` | Project Manager | Project Manager | Arnel Salcedo | Site Assessment |
| `REM` | Regional Expansion Manager | Regional Expansion Manager | Cristina Aquino | Site and Lessor Transaction |
| `FMS` | Franchise Management Service | Franchise Management Service | Bernadette Cruz | Site and Lessor Transaction |

The `key` is fixed and never edited — renaming it would silently lock its holders
out of their own modules. What an Admin owns on `profiles.html` is the **wording**
and whether the profile may still be **handed to new accounts**. Deactivating a
profile never takes it from the people who already hold it.

---

## 3. Module access matrix

**●** full access (may write) · **◐** may open, read-only or one writable field ·
**—** no access (redirected)

| # | Module / screen | File | SAS | Admin | SAM | PM | REM | FMS |
|---|-----------------|------|:---:|:-----:|:---:|:--:|:---:|:---:|
| 1 | Dashboard | `dashboard.html` | ● | ● | ● | — | ● | — |
| 2 | Site Creation | `site-creation.html` | ● | — | — | — | ◐ | ◐ |
| 3 | Site Assignment › SAS Assignment | `sas-assignment.html` | — | ● | — | — | — | — |
| 4 | Site Assignment › SAM / REM Assignment | `sam-assignment.html` | — | ● | — | — | — | — |
| 5 | Site Assessment › Site and Lessor Transactions | `site-assessment.html` | ● | — | ● | ◐ | — | — |
| 6 | Site Assessment form (11 tabs) | `site-details.html` | ● | — | ◐ | ◐ | ◐ | ◐ |
| 7 | Site Technical Checklist (5 tabs) | `site-checklist.html` | ● | — | ◐ | ◐ | — | — |
| 8 | Trade and Site Scorecard | `scorecard.html` | ● | — | ◐ | ◐ | — | — |
| 9 | Reports › Site and Lessor Transaction | `report-site-assessment.html` | — | ◐ | ● | — | ● | ◐ |
| 10 | Reports › Audit Trail Report | `report-audit-trail.html` | — | ◐ | — | — | — | — |
| 11 | User Management › User List | `user-list.html` | — | ● | — | — | — | — |
| 12 | User Management › User Creation | `user-creation.html` | — | ● | — | — | — | — |
| 13 | User Management › Profiles | `profiles.html` | — | ● | — | — | — | — |
| 14 | My Profile (user menu) | `my-profile.html` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |

### Sidebar visibility

The sidebar writes out every module and `initShell()` deletes what the role may
not see. Rows 6, 7 and 8 have **no sidebar link for anyone** — they are reached
from a row in the list or the report.

| Sidebar entry | Shown to |
|---------------|----------|
| Dashboard | SAS, Admin, SAM, REM |
| Site Creation | SAS |
| Site Assignment (group) | Admin |
| Site Assessment (group) | SAS, SAM, PM — labelled **For Approval** for SAM |
| Reports (group) | Admin, SAM, REM, FMS |
| — Site and Lessor Transaction | Admin, SAM, REM, FMS |
| — Audit Trail Report | Admin |
| User Management (group) | Admin |

---

## 4. Permissions per role

### SAS — Site Acquisition Specialist

The only role that creates and fills in a site.

**Modules:** Dashboard · Site Creation · Site Assessment (list, form, checklist,
scorecard) · My Profile

| May | May not |
|-----|---------|
| Create a trade area (PSGC cascade) and save it | Open any report |
| Fill the 11-tab Site Assessment, save drafts, finalize | Open User Management or Site Assignment |
| Fill the 5-tab Site Technical Checklist | Approve or return an assessment |
| Fill the Trade and Site Scorecard | Set a Franchisee Name (read-only for SAS) |
| Attach / remove the SAR (PPT or PDF) | Close a site out to Completed / Fall-Out |

**Scope:** the full record list, not filtered by territory.

**The submit rule.** No single form hands the site to the SAM. All three —
Site Assessment, Site Technical Checklist, Trade and Site Scorecard — must be
finalized; `GSAT.submitWhenReady()` then moves the status to **For SAM Approval**
and nothing else does. The first answer saved on a Pending site moves it to
Ongoing.

---

### Admin — Site Admin

Assignment and administration. Never touches an assessment.

**Modules:** Dashboard · Site Assignment (SAS, SAM/REM) · Reports (Site and Lessor
Transaction, Audit Trail) · User Management (User List, User
Creation, Profiles) · My Profile

| May | May not |
|-----|---------|
| Assign a Pending site to a SAS from the dashboard | Open Site Creation |
| Assign / remove an area to a SAS (`sas-assignment.html`) | Open the Site Assessment list, form, checklist or scorecard |
| Assign / remove a sub-territory to a SAM or REM (`sam-assignment.html`) | Approve, return or close out a site |
| Create and edit accounts; deactivate / reactivate them | Set a Franchisee Name |
| Rename a profile and switch it off for new accounts | Delete a user or a profile — there is no delete anywhere |
| Read the Audit Trail Report — the only role that can | Change a profile's `key` |

**Scope:** everything, unfiltered.

**User Management notes.** `user-creation.html` is both the new and the edit form,
told apart by `?code=000005` in the URL. Every save writes to the audit trail
under module *User Management*, and the six stamps at the foot are written by the
save, never typed. Creating an account does **not** create a login — the demo
signs in with one credential and the role picker.

---

### SAM — Site Acquisition Manager

The approver, scoped to one territory.

**Modules:** Dashboard · Site Assessment (approval queue + read-only forms) ·
Reports (Site and Lessor Transaction) · My Profile

| May | May not |
|-----|---------|
| See the approval queue — sites at **For SAM Approval** in their territory only | Edit any answer on the assessment, checklist or scorecard |
| Open the assessment, checklist and scorecard read-only | Create a trade area |
| **Approve** an assessment → status `Approved` | Set a Franchisee Name |
| **Return to SAS** with a written reason (mandatory) | Open User Management, Site Assignment or the Audit Trail |
| Close an approved site out to **Completed** or **Fall-Out** | See sites outside their territory |

**Scope:** `GSAT.samTerritory()` — the one territory the mapping master list (plus
any Admin override) puts them on. It filters the approval queue, the Location
mapping data and the Site and Lessor Transaction Module alike.

**Two separate decisions.** Approval stops at `Approved`, because on the day it is
approved nobody knows whether the site pushed through. Saying it did (`Completed`)
or did not (`Fall-Out`, with a written reason) is a later, separate act on the Site
Assessment Report. Both are final.

---

### PM — Project Manager

View-only across the assessment workflow, with exactly one writable field.

**Modules:** Site Assessment (list + forms, read-only) · My Profile — **no dashboard**
and **no reports**, lands on the list

| May | May not |
|-----|---------|
| Read every site record, unscoped | Edit any other field on any tab |
| Open the assessment, checklist and scorecard read-only | Approve, return or close out a site |
| Encode and save **Actual Floor Area (sqm)** — Tab 03, Commercial Terms | Create a trade area |
| | Set a Franchisee Name |
| | Open any report — Location Mapping, the Site Assessment Report or the Audit Trail |
| | Open User Management or Site Assignment |

**The one field.** `data-pm-only` on the Actual Floor Area row inverts the lock:
locked for everyone *except* PM, and open to PM even though the rest of the form is
read-only. Saving it writes an audit line and **does not change the site's status**.
A banner points at Tab 03 from every other tab.

---

### REM — Regional Expansion Manager

Regional oversight. Sees several territories, writes two things.

**Modules:** Dashboard · Site Creation (Franchisee Name only) · Site Assessment
form (read-only) · Reports (Site and Lessor Transaction) · My Profile

| May | May not |
|-----|---------|
| See every site in their **region** — a list of territories, not one | Fill in or edit an assessment, checklist or scorecard |
| Open a site's assessment read-only from the report | Open the Site Assessment list or the checklist / scorecard screens |
| Set or change a **Franchisee Name** | Approve or return an assessment |
| Close an approved site out to **Completed** or **Fall-Out** | Create a trade area |
| Read the Site and Lessor Transaction Module scoped to the region | Open the Audit Trail, User Management or Site Assignment |

**Scope:** `GSAT.remTerritories()` / `GSAT.inRemRegion()` — a **list**, because a
region can span several territories of the mapping master list. Seeded:
Cristina Aquino holds NCR + North Luzon + South Luzon; Edgardo Panganiban holds
Visayas + Mindanao.

---

### FMS — Franchise Management Service

Read everything, write one field.

**Modules:** Site Creation (Franchisee Name only) · Site Assessment form
(read-only) · Reports (Site and Lessor Transaction) · My Profile — **no dashboard**,
lands on the report

| May | May not |
|-----|---------|
| See every site in every territory | Edit anything on an assessment, checklist or scorecard |
| Open a site's assessment read-only from the report | Approve, return, or close a site out |
| Set or change a **Franchisee Name** — their one write | Create a trade area |
| | Open the Site Assessment list, the Audit Trail, User Management or Site Assignment |

**Scope:** unfiltered.

---

## 5. Cross-cutting rules

### Franchisee Name — three gates, all enforced everywhere

1. **Role.** Only REM and FMS may write it. Every other role sees it read-only.
2. **Ownership.** Only a `Franchise-Owned` site has one. Company-Owned is dimmed
   and locked for everyone, forever.
3. **Status.** Only from approval onward — `FRANCHISEE_STATUS = ['Approved',
   'Completed']`. A site in assessment, or fallen out, cannot be named.

`GSAT.franchiseeBlock(record)` is the single test for 2 and 3 and returns the
*reason* (`'ownership'`, `'status'`, `''`) so a screen can say which rule stopped
it. The report's Franchisee column reads the three states as **N/A** (never),
**—** (not yet), **Not set** (go ahead).

REM and FMS do not create sites, so they reach the field from the Site Assessment
Report: the person badge on a row opens Site Creation with that site loaded, every
other field locked, and **Save Franchisee** in place of Save.

### Status lifecycle and who moves it

| From → To | Who | Where |
|-----------|-----|-------|
| Pending → Ongoing | SAS | first answer saved on any of the three forms |
| Ongoing → For SAM Approval | SAS | all three forms finalized (`submitWhenReady()`) |
| For SAM Approval → Approved | SAM | Approve on the assessment |
| For SAM Approval → Returned | SAM | Return to SAS, written reason required |
| Approved → Completed / Fall-Out | SAM **or** REM | close-out in the Site and Lessor Transaction Module |

Everything at `Approved` and past it is closed: the assessment, checklist and
scorecard behind it are read-only. Fall-Out is in that list on purpose — the site
stays fully readable, it just stops moving.

### Audit trail

Every write writes a line first; reads are never logged. Only **Admin** can read
the trail (`report-audit-trail.html`). Modules recorded: Session, Site Creation,
Site Assessment, Site Technical Checklist, Trade and Site Scorecard, SAS
Assignment, SAM / REM Assignment, User Management, My Profile, Dashboard. A
refused sign-in is logged as `Denied`. `AUDIT_MAX` (500) is a storage quota, not a
retention policy.

### My Profile — the one screen open to all six

Reached from the topbar user menu. The split it is built around:

- **Yours to edit:** first name, MI, last name, email.
- **An administrator's, locked here:** profile, status, user code, Territory,
  Sub-Territory and the six stamps. A page that let you widen your own access
  would not be a profile page.

Territory / Sub-Territory answers per role: a SAS's fixed assignment, the
sub-territories a SAM holds, a REM's region spelled out as its territory list, and
*All territories / All sub-territories* for Admin, PM and FMS.

---

## 6. Points to be aware of

- **`site-details.html` allows REM and FMS, but the Site Assessment sidebar group
  does not.** That is deliberate: they reach the form through the View button on
  the Site and Lessor Transaction Module, which sets `readOnly` first. There is no menu route.
- **Admin cannot open any assessment screen.** Admin's read into the workflow is
  through the reports only.
- **Approval sets `Approved`, not `Completed`.** The README's Franchisee section
  still says approving sets `Completed`; `site-details.js` sets `Approved`, and the
  close-out on the report is what reaches `Completed`. The code is the authority.
- **The profile list is not extensible from the UI.** A seventh profile would be a
  key no screen grants anything to — adding one is a code change across the
  `data-allow` / `data-roles` attributes, not a checkbox.
- **Deactivation never removes.** Neither a user nor a profile can be deleted;
  `active: false` keeps every record they touched attributed to them.
