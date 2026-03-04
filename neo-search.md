# Neo-Search — PYQFort Search Modernization Documentation

> **Version:** 1.1  
> **Date:** March 4, 2026  
> **Scope:** Complete replacement of the old search UI & logic with a modern, instant, categorized search system under the `nsearch-*` namespace.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Old Search — What Was Replaced](#2-old-search--what-was-replaced)
3. [Architecture Overview](#3-architecture-overview)
4. [File Inventory & Roles](#4-file-inventory--roles)
5. [Namespace Strategy — The `nsearch-*` Convention](#5-namespace-strategy--the-nsearch--convention)
6. [HTML Structure (search/index.html)](#6-html-structure-searchindexhtml)
7. [JavaScript Engine (assets/js/search-engine.js)](#7-javascript-engine-assetsjssearch-enginejs)
    - 7.1 [IIFE Encapsulation](#71-iife-encapsulation)
    - 7.2 [Constants & Tuning Knobs](#72-constants--tuning-knobs)
    - 7.3 [Index Building — `buildIndex()`](#73-index-building--buildindex)
    - 7.4 [Search Algorithm — Token-Based Relevance Scoring](#74-search-algorithm--token-based-relevance-scoring)
    - 7.5 [Rendering Pipeline](#75-rendering-pipeline)
    - 7.6 [Filter Chips & Dropdowns](#76-filter-chips--dropdowns)
    - 7.7 [Recent Searches (localStorage)](#77-recent-searches-localstorage)
    - 7.8 [URL Parameter Support](#78-url-parameter-support)
    - 7.9 [Keyboard Shortcuts](#79-keyboard-shortcuts)
    - 7.10 [Load-More Pagination](#710-load-more-pagination)
    - 7.11 [Utility Functions](#711-utility-functions)
    - 7.12 [Boot Sequence](#712-boot-sequence)
8. [CSS Styling (assets/css/main.css)](#8-css-styling-assetscssmaincsss)
    - 8.1 [Variable Dependency Map](#81-variable-dependency-map)
    - 8.2 [Component Selector Reference](#82-component-selector-reference)
    - 8.3 [Responsive Breakpoints](#83-responsive-breakpoints)
    - 8.4 [Dark Theme Support](#84-dark-theme-support)
9. [Integration Points](#9-integration-points)
    - 9.1 [Header Search Bar Hand-off](#91-header-search-bar-hand-off)
    - 9.2 [Script Loading Order (default.html)](#92-script-loading-order-defaulthtml)
    - 9.3 [COLLEGE_DATA Dependency](#93-college_data-dependency)
10. [Coexistence with Old Search Code](#10-coexistence-with-old-search-code)
11. [State Machine & UI Flow](#11-state-machine--ui-flow)
12. [Data Flow Diagram](#12-data-flow-diagram)
13. [**How New Data Becomes Searchable — The Data Pipeline**](#13-how-new-data-becomes-searchable--the-data-pipeline)
    - 13.1 [The Two-File System: colleges.yml ↔ college-data.js](#131-the-two-file-system-collegesyml--college-datajs)
    - 13.2 [Step-by-Step: Adding a New College](#132-step-by-step-adding-a-new-college)
    - 13.3 [Step-by-Step: Adding a New Branch / Semester / Subject](#133-step-by-step-adding-a-new-branch--semester--subject)
    - 13.4 [Step-by-Step: Adding a New PYQ PDF](#134-step-by-step-adding-a-new-pyq-pdf)
    - 13.5 [What Parameters Decide If Something Appears in Search Results](#135-what-parameters-decide-if-something-appears-in-search-results)
    - 13.6 [Fields in YAML That Neo-Search Does NOT Read](#136-fields-in-yaml-that-neo-search-does-not-read)
    - 13.7 [Data Integrity Diagnostics (Console Warnings)](#137-data-integrity-diagnostics-console-warnings)
14. [**Where Neo-Search Fails — Known Limitations**](#14-where-neo-search-fails--known-limitations)
    - 14.1 [Failures From Data Issues](#141-failures-from-data-issues)
    - 14.2 [Search Algorithm Limitations](#142-search-algorithm-limitations)
    - 14.3 [UI & Scale Limitations](#143-ui--scale-limitations)
    - 14.4 [Feature Gaps](#144-feature-gaps)
15. [Guide for Future Code Modification](#15-guide-for-future-code-modification)
    - 15.1 [Adding a New Filter (e.g., Branch)](#151-adding-a-new-filter-eg-branch)
    - 15.2 [Adding a New Result Category (e.g., Notes)](#152-adding-a-new-result-category-eg-notes)
    - 15.3 [Changing Result Limits / Pagination Behavior](#153-changing-result-limits--pagination-behavior)
    - 15.4 [Modifying the Scoring Algorithm](#154-modifying-the-scoring-algorithm)
    - 15.5 [Changing the Debounce Delay](#155-changing-the-debounce-delay)
    - 15.6 [Adding New Quick-Access / Popular Buttons](#156-adding-new-quick-access--popular-buttons)
    - 15.7 [Styling Changes & CSS Variables](#157-styling-changes--css-variables)
    - 15.8 [Removing Old Search Code Safely](#158-removing-old-search-code-safely)
    - 15.9 [Integrating with Refact Feature](#159-integrating-with-refact-feature)
    - 15.10 [SEO & Accessibility Improvements](#1510-seo--accessibility-improvements)
16. [**Future-Proofing — No-Migration Guarantee**](#16-future-proofing--no-migration-guarantee)
17. [Testing Checklist](#17-testing-checklist)
18. [Glossary](#18-glossary)

---

## 1. Executive Summary

The **Neo-Search** system replaces PYQFort's original multi-step, form-based search with a modern, instant-search experience. Key improvements:

| Feature | Old Search | Neo-Search |
|---------|-----------|------------|
| Search trigger | Form submit / button click | Live debounced typing (220 ms) |
| Result categories | Flat PYQ list only | 3 categories: Colleges, Subjects, Papers |
| Filtering | Dropdown `<select>` elements in a collapsible form | Chip-based inline filters with animated dropdowns |
| Ranking | Basic string matching / includes | Multi-signal token-based relevance scoring |
| Recent searches | None | localStorage-persisted history with 1-click re-run |
| Keyboard support | None | `/` shortcut to focus, `Enter` for instant search |
| URL deep-links | `?q=` only | `?q=`, `?college=`, `?semester=`, `?year=` |
| Pagination | 15-per-page traditional pagination | Progressive "Load More" with configurable step |
| Namespace | Shared IDs with main.js | Fully isolated `nsearch-*` prefix |

---

## 2. Old Search — What Was Replaced

### Old HTML (`search/index.html` — 231 lines)
- Used element IDs: `main-search`, `college-filter`, `semester-filter`, `year-filter`, `subject-filter`, `search-form`, `filters-content`, `search-results`, etc.
- Had a collapsible "Advanced Filters" form with `<select>` dropdowns
- Single flat results list with view-toggle (grid/list)
- Statistics bar, filter tags section
- Required explicit submit

### Old JavaScript (`assets/js/main.js` — lines 764–1810)
- Functions: `initializeEnhancedSearch()`, `loadPYQData()`, `performAdvancedSearch()`, `quickSearch()`, `loadMoreResults()`, `populateFilters()`, etc.
- Exported to `window` at ~line 2089: `window.quickSearch`, `window.performAdvancedSearch`, `window.loadMoreResults`, `window.populateFilters`
- Used global mutable state: `allPYQs[]`, `filteredPYQs[]`, `searchResults[]`, `currentResultsPage`, `filtersVisible`, etc.

### Old CSS (`assets/css/main.css` — lines 1128–1680)
- Selectors: `.search-page`, `.search-header`, `.advanced-search-form`, `.filter-select`, `.search-result-item`, etc.
- Gradient header (`#667eea → #764ba2`)
- Responsive overrides at 768px and 480px (lines 1760–1820)

### Why the old code is left intact
The old JS and CSS remain in `main.js` and `main.css` but are **functionally inert** because:
1. The new HTML uses entirely different element IDs (`nsearch-*` vs `main-search`, `search-form`, etc.)
2. Old `document.getElementById()` calls return `null` → all old event listeners silently fail to attach
3. Old CSS selectors (`.search-page`, `.search-header`) no longer match any element in the new HTML

This strategy was chosen over deletion to allow rollback if needed.

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                  _layouts/default.html                      │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │college-data.js│→ │ main.js  │→ │ refact.js│→ │search- │ │
│  │  (12k lines) │  │(2.2k ln) │  │          │  │engine.js│ │
│  │  COLLEGE_DATA│  │(old srch)│  │          │  │(704 ln) │ │
│  └──────────────┘  └──────────┘  └──────────┘  └────────┘ │
│         ↓                                          ↓        │
│   window.COLLEGE_DATA                     buildIndex()      │
│                                                ↓            │
│                                    collegeIdx / subjectIdx  │
│                                         / pyqIdx            │
│                                                ↓            │
│                                      search(q, filters)     │
│                                                ↓            │
│                                   render → DOM (nsearch-*)  │
└────────────────────────────────────────────────────────────┘
```

**Script loading order** in `default.html`:
```
1. college-data.js   — populates window.COLLEGE_DATA
2. main.js           — site-wide features + old search (inert)
3. refact.js         — Refact bookmark feature
4. search-engine.js  — Neo-Search (reads COLLEGE_DATA, owns nsearch-*)
```

---

## 4. File Inventory & Roles

| File | Role | Lines | Status |
|------|------|-------|--------|
| `search/index.html` | Neo-Search page HTML | 183 | **Replaced** (was 231) |
| `assets/js/search-engine.js` | Search engine IIFE | 704 | **New file** |
| `assets/css/main.css` | Site-wide styles | 5693 | **Appended** ~400 lines of `nsearch-*` CSS at line 1678 |
| `_layouts/default.html` | Base layout | 217 | **Modified** — added `search-engine.js` `<script>` tag |
| `assets/js/main.js` | Main app JS | 2206 | **Untouched** — old search code dormant |
| `assets/js/college-data.js` | Data source | 12437 | **Untouched** — provides `window.COLLEGE_DATA` |

---

## 5. Namespace Strategy — The `nsearch-*` Convention

Every HTML `id`, CSS class, and JS DOM selector introduced by Neo-Search is prefixed with `nsearch-`. This guarantees:

- **Zero collision** with old search selectors (`.search-page`, `#main-search`, etc.)
- **Zero collision** with Refact selectors (`.refact-*`, `#refact-*`)
- **Zero collision** with global site selectors (`.container`, `.btn-view`, `.dark-theme`, etc.)
- **Easy greppability** — `grep -r "nsearch-"` instantly finds all Neo-Search code

### Naming Conventions Inside the Namespace

| Pattern | Meaning | Example |
|---------|---------|---------|
| `nsearch-*` (id) | Unique element target for JS | `nsearch-input`, `nsearch-clear` |
| `nsearch-chip-{filter}` | Filter chip button | `nsearch-chip-college` |
| `nsearch-chip-{filter}-val` | Value display inside chip | `nsearch-chip-college-val` |
| `nsearch-dd-{filter}` | Dropdown container | `nsearch-dd-college` |
| `nsearch-grp-{category}` | Result group wrapper | `nsearch-grp-subjects` |
| `nsearch-list-{category}` | Result list inside a group | `nsearch-list-colleges` |
| `nsearch-cnt-{category}` | Result count badge | `nsearch-cnt-pyqs` |
| `.nsearch-*-card` | Result card component | `.nsearch-college-card` |
| `.nsearch-*--modifier` | BEM-style modifier | `.nsearch-chip--active` |

---

## 6. HTML Structure (search/index.html)

The page uses Jekyll front matter with `layout: default`, giving it the full site shell (header, nav, footer, scripts).

### Section Map

```
<div class="nsearch-page">
  ├── <section class="nsearch-hero">          ← Hero / Search Bar
  │   ├── .nsearch-title / .nsearch-subtitle
  │   ├── .nsearch-bar-wrap → #nsearch-bar
  │   │   ├── #nsearch-input               ← Main text input
  │   │   ├── #nsearch-clear               ← ✕ clear button
  │   │   └── #nsearch-kbd                 ← "/" shortcut hint
  │   ├── .nsearch-chips                    ← Filter Chip row
  │   │   ├── #nsearch-chip-college
  │   │   ├── #nsearch-chip-semester
  │   │   ├── #nsearch-chip-year
  │   │   └── #nsearch-reset               ← Reset All button
  │   └── .nsearch-dropdown-anchor          ← Dropdown container
  │       ├── #nsearch-dd-college
  │       ├── #nsearch-dd-semester
  │       └── #nsearch-dd-year
  │
  └── <section class="nsearch-body">          ← Results Area
      ├── #nsearch-status                   ← "42 results (12 ms)"
      ├── #nsearch-pills                    ← Active filter pills
      ├── #nsearch-idle                     ← Welcome / idle state
      │   ├── .nsearch-idle-hero
      │   ├── #nsearch-recent               ← Recent searches
      │   └── .nsearch-popular              ← Quick Access buttons
      ├── #nsearch-loading                  ← Spinner
      ├── #nsearch-results                  ← Results container
      │   ├── #nsearch-grp-colleges         ← College results group
      │   ├── #nsearch-grp-subjects         ← Subject results group
      │   ├── #nsearch-grp-pyqs             ← PYQ/Paper results group
      │   └── #nsearch-more-wrap            ← Load More button
      └── #nsearch-empty                    ← No results state
```

### Key Design Decisions

- **All sections hidden by default** (`style="display:none;"` on result groups, pills, status bar, empty state) — JS toggles visibility via `showState()`.
- **Popular/Quick-Access buttons** use `data-query` or `data-college` attributes — JS reads them generically via `getAttribute()`.
- **Dropdown containers are empty** — JS fills them at page load via `renderFilterDropdowns()`.

---

## 7. JavaScript Engine (assets/js/search-engine.js)

### 7.1 IIFE Encapsulation

The entire file is wrapped in an **Immediately Invoked Function Expression**:

```javascript
(function () {
  'use strict';
  // ... all code ...
})();
```

**Why:** No globals leak. All variables, functions, and state are private to the closure. The only outside dependency is `window.COLLEGE_DATA` (read-only).

### 7.2 Constants & Tuning Knobs

```javascript
const RECENT_KEY       = 'pyqfort_recent_searches';   // localStorage key
const MAX_RECENT       = 8;    // Max recent search entries stored
const COLLEGES_LIMIT   = 4;    // Initial college results shown
const SUBJECTS_LIMIT   = 8;    // Initial subject results shown
const PYQS_LIMIT       = 10;   // Initial PYQ results shown
const LOAD_MORE_STEP   = 15;   // How many more to load per click
const DEBOUNCE_MS      = 220;  // Typing debounce delay (ms)
```

These are the primary levers for tuning search behavior. All are `const` at the top of the IIFE for easy discovery.

### 7.3 Index Building — `buildIndex()`

Called once during `setup()`. Traverses the nested `COLLEGE_DATA.colleges[]` hierarchy:

```
COLLEGE_DATA.colleges[]
  └── .branches[]
       └── .semesters[]
            └── .subjects[]
                 └── .pyqs[]
```

Produces three flat arrays:

| Array | Record Fields | Used For |
|-------|---------------|----------|
| `collegeIdx[]` | name, slug, description, location, url, **searchText** | College result cards |
| `subjectIdx[]` | name, code, description, college, collegeSlug, branch, branchSlug, semester, semesterSlug, url, pdf_count, icon, **searchText** | Subject result cards |
| `pyqIdx[]` | title, subject, subjectSlug, college, collegeSlug, branch, branchSlug, semester, semesterSlug, year, examType, url, pdfUrl, **searchText** | PYQ result cards |

The `searchText` field is a **pre-computed lowercase concatenation** of all searchable fields for that record. This avoids repeated `.toLowerCase()` calls during search.

### 7.4 Search Algorithm — Token-Based Relevance Scoring

```javascript
function search(query, filters) { ... }
```

**Tokenization:** The query string is lowercased, trimmed, and split on whitespace into tokens.

**Scoring function — `score(text, name)`:**

| Condition | Points | Description |
|-----------|--------|-------------|
| `text.indexOf(fullQuery) !== -1` | +10 | Full query substring match |
| `name === fullQuery` | +20 | Exact name match |
| `name.startsWith(fullQuery)` | +8 | Name starts with query |
| Per matching token | +3 each | Individual token matches |
| All tokens match | ×1.0 multiplier | Full score retained |
| Only some tokens match | ×0.4 multiplier | Score heavily penalized |
| Zero tokens match | **0** (excluded) | Result discarded |
| Filter-only mode (empty query) | **1** | All records pass to filter stage |

**Filtering:** After scoring, each category applies `activeFilters`:
- Colleges: filter by `slug === fC`
- Subjects: filter by `collegeSlug`, `semester`
- PYQs: filter by `collegeSlug`, `semester`, `year`

**Sorting:**
- Colleges & Subjects: by `_score` descending
- PYQs: by `_score` descending, then by `year` descending (newest first)

**Deduplication:** Subjects are deduplicated by URL to prevent the same subject from appearing multiple times across different data paths.

### 7.5 Rendering Pipeline

```
runSearch()
  ├── reads input value → activeQuery
  ├── saveRecent(activeQuery)
  ├── search(activeQuery, activeFilters) → lastResults
  ├── renderColleges()  → .nsearch-list-colleges innerHTML
  ├── renderSubjects()  → .nsearch-list-subjects innerHTML
  ├── renderPYQs()      → .nsearch-list-pyqs innerHTML
  ├── showState('results' | 'empty')
  ├── updatePills()
  └── updateResetBtn()
```

Each `render*()` function:
1. Slices results to the initial limit (`COLLEGES_LIMIT`, `SUBJECTS_LIMIT`, `PYQS_LIMIT`)
2. Checks if there are items — hides the group if empty
3. Sets the group count badge text
4. Maps items through a card-template function (`collegeCard()`, `subjectCard()`, `pyqCard()`)
5. Joins and sets `innerHTML`

**Card functions** return raw HTML strings. User-provided text is escaped via the `esc()` helper (creates a temporary DOM text node to safely encode HTML entities).

### 7.6 Filter Chips & Dropdowns

**Architecture:** Three symmetric filter channels — `college`, `semester`, `year`. Each has:
- A chip button (`#nsearch-chip-{name}`)
- A value label (`#nsearch-chip-{name}-val`)
- A dropdown container (`#nsearch-dd-{name}`)

**Flow:**
1. `renderFilterDropdowns()` — runs once at startup, populates dropdown HTML
   - College: alphabetically sorted list from `collegeIdx`
   - Semester: hardcoded 1–8 in a grid layout
   - Year: dynamically extracted from `pyqIdx`, sorted descending
2. Chip click → `toggleDropdown(filterName)` — opens/closes, manages `openDropdown` state
3. Dropdown item click → `selectFilter(filterName, value)` — sets `activeFilters[name]`, re-runs search
4. Clicking same value toggles it off → `clearFilter(filterName)`
5. Outside click → `closeAllDropdowns()`

**Visual states:**
- `.nsearch-chip--open` — dropdown is visible (arrow rotates)
- `.nsearch-chip--active` — filter has a value selected (chip turns primary color, label hidden, value shown)

### 7.7 Recent Searches (localStorage)

- **Storage key:** `pyqfort_recent_searches`
- **Format:** JSON array of strings, max 8 entries
- **Operations:**
  - `saveRecent(q)` — deduplicates, prepends, trims to `MAX_RECENT`
  - `getRecent()` — parses with try/catch fallback to `[]`
  - `renderRecentSearches()` — called on page load, builds clickable pill buttons
  - `clearRecent()` — removes key, hides section
- **Interaction:** Clicking a recent search button sets the input value and triggers `runSearch()`

### 7.8 URL Parameter Support

```javascript
function checkURLParams() { ... }
```

Reads from `window.location.search`:

| Param | Maps To | Example |
|-------|---------|---------|
| `q` or `query` | `nsearch-input` value + `activeQuery` | `?q=Data+Structures` |
| `college` | `activeFilters.college` | `?college=ymca` |
| `semester` | `activeFilters.semester` | `?semester=3` |
| `year` | `activeFilters.year` | `?year=2024` |

Parameters can be combined: `?q=math&college=igdtuw&semester=2`

The header search bar form (`action="/search/"`, `name="q"`) naturally produces `?q=...`, which Neo-Search picks up.

### 7.9 Keyboard Shortcuts

- **`/`** — Focuses the search input from anywhere on the page (unless already in an input/textarea/select).
- **`Enter`** — Immediately triggers search (bypasses debounce).

### 7.10 Load-More Pagination

Instead of traditional page numbers, Neo-Search uses progressive "Show More":

1. Initial render shows `SUBJECTS_LIMIT` subjects + `PYQS_LIMIT` PYQs
2. "Show More Results" button appears if there are more items in either category
3. Each click appends `LOAD_MORE_STEP` (15) more subjects, then PYQs
4. Uses `insertAdjacentHTML('beforeend', ...)` for efficient DOM appending (no re-rendering)
5. Button hides when all items are displayed

**Why subjects before PYQs:** Subjects are more actionable — they lead to pages with all related PYQs, so they're surfaced first.

### 7.11 Utility Functions

| Function | Purpose |
|----------|---------|
| `el(id)` | Shorthand for `document.getElementById(id)` |
| `elShow(id, show)` | Toggles element `display` between `'none'` and `dataset.display \|\| 'block'` |
| `esc(str)` | Safe HTML escaping via DOM `textContent` → `innerHTML` trick |
| `assign(target, ...sources)` | Simple `Object.assign` polyfill for broad compatibility |
| `debounce(fn, ms)` | Standard debounce — clears and resets setTimeout |
| `isEditing()` | Returns `true` if focus is in an INPUT, TEXTAREA, or SELECT (for keyboard shortcut safety) |

### 7.12 Boot Sequence

```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
```

`setup()` performs:
1. **Guard:** `if (!el('nsearch-input')) return;` — silently exits on non-search pages
2. `buildIndex()` — populates `collegeIdx`, `subjectIdx`, `pyqIdx`
3. `renderFilterDropdowns()` — fills dropdown HTML
4. `renderRecentSearches()` — shows recent search pills
5. Attaches all event listeners (input, clear, Enter, `/`, chips, dropdowns, reset, recent, popular, load-more, outside-click)
6. `checkURLParams()` — reads URL → triggers search if params exist
7. Auto-focuses input if no URL params triggered a search

---

## 8. CSS Styling (assets/css/main.css)

All Neo-Search styles are located in `main.css` starting from line 1678, immediately before the `ENHANCED CARD ANIMATIONS` section. They are wrapped in a clear comment block:

```css
/* ═══════════════════════════════════════════════════════════════════
   NEW SEARCH UI  (nsearch-* namespace — zero collision with old CSS)
   ═══════════════════════════════════════════════════════════════════ */
```

### 8.1 Variable Dependency Map

Neo-Search styles rely **exclusively** on pre-existing CSS custom properties:

| Variable | Light Default | Dark Override | Used In |
|----------|---------------|---------------|---------|
| `--primary-color` | `#4a6cf7` | `#5d7bf9` | Focused bar border, active chips, card hover, icons, buttons |
| `--primary-dark` | `#3a56c5` | `#4a6cf7` | Active chip hover, PDF button hover |
| `--background-color` | `#ffffff` | `#121212` | Page background |
| `--card-background` | `#ffffff` | `#1e1e1e` | Search bar, chips, dropdowns, result cards |
| `--text-color` | `#333333` | `#f0f0f0` | All text |
| `--secondary-color` | `#6c757d` | `#a0a0a0` | Meta text, icons, subtitle |
| `--border-color` | `#e9ecef` | `#2d2d2d` | All borders |
| `--light-gray` | `#f8f9fa` | `#1e1e1e` | Clear button hover, kbd bg, recent btn bg, load-more bg |
| `--btn-hover-color` | `rgba(74,108,247,0.1)` | `rgba(93,123,249,0.2)` | Chip hover, dropdown item hover, icon backgrounds |
| `--box-shadow` | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.3)` | Search bar shadow, card hover shadow |
| `--filter-tag-bg` | `#e3f2fd` | `#1e3a8a` | Active filter pills |
| `--filter-tag-color` | `#1976d2` | `#bfdbfe` | Active filter pill text |
| `--danger-color` | `#dc3545` | — | Reset button, PYQ icon accent |

**No new CSS variables** were introduced. This keeps theming unified.

### 8.2 Component Selector Reference

| Selector | Component | Key Properties |
|----------|-----------|----------------|
| `.nsearch-page` | Page wrapper | `min-height: 70vh` |
| `.nsearch-hero` | Top hero section | `padding: 3rem 0` |
| `.nsearch-bar` | Search bar flex container | `border-radius: 14px`, `box-shadow`, focus glow |
| `.nsearch-chip` | Filter chip button | `border-radius: 20px`, transition, hover & active states |
| `.nsearch-chip--active` | Chip with selected value | Primary bg, white text, label hidden |
| `.nsearch-dropdown` | Filter dropdown panel | `position: absolute`, `border-radius: 12px`, `max-height: 280px`, scroll, `nsearchDropIn` animation |
| `.nsearch-college-card` | College result card (anchor) | Flex row, hover lift + border color + arrow slide |
| `.nsearch-subject-card` | Subject result card (anchor) | Same hover pattern, meta line with icons |
| `.nsearch-pyq-card` | PYQ result card (div) | Flex between info + action buttons |
| `.nsearch-pyq-btn--pdf` | "View" PDF button | Primary color bg, white text |
| `.nsearch-pyq-btn--subject` | "Subject" link button | Outline style with primary text |
| `.nsearch-pill` | Active filter pill above results | Rounded, with × close button |
| `.nsearch-more-btn` | Load More button | Center-aligned, border card style |
| `.nsearch-empty` | No results state | Centered with icon, reset button |

### 8.3 Responsive Breakpoints

**768px (Tablet):**
- Hero padding reduced
- Title font shrinks: `2.2rem → 1.75rem`
- Search bar padding tightened
- Keyboard hint (`/`) hidden
- Popular grid: `170px → 150px` min column
- PYQ cards stack vertically; action buttons go full-width

**480px (Mobile):**
- Title: `1.75rem → 1.45rem`
- Chip padding/font tightened
- Popular grid: `1fr 1fr` (2 columns)
- Card padding reduced
- Dropdown max-height: `280px → 220px`

### 8.4 Dark Theme Support

All dark theme support is **automatic** via CSS custom properties. When `.dark-theme` is toggled on `<html>` or `<body>`, all `var(--*)` references resolve to dark values.

The only explicit dark-theme override in Neo-Search CSS is:

```css
.dark-theme .nsearch-bar:focus-within {
  box-shadow: 0 4px 24px rgba(93, 123, 249, 0.18);
}
.dark-theme .nsearch-pyq-icon {
  background: rgba(220, 53, 69, 0.15);
}
```

---

## 9. Integration Points

### 9.1 Header Search Bar Hand-off

The site header (`_layouts/default.html`, lines 112–118) has:

```html
<form class="search-form" action="{{ '/search/' | relative_url }}">
  <input type="text" id="search-input" name="q" placeholder="Search PDFs...">
  <button type="submit"><i class="fas fa-search"></i></button>
</form>
```

When submitted, the browser navigates to `/search/?q=...`. Neo-Search's `checkURLParams()` reads `params.get('q')` and auto-fills the input + triggers `runSearch()`.

### 9.2 Script Loading Order (default.html)

```html
<script src="{{ '/assets/js/college-data.js' | relative_url }}"></script>
<script src="{{ '/assets/js/main.js' | relative_url }}"></script>
<script src="{{ '/assets/js/refact.js' | relative_url }}"></script>
<script src="{{ '/assets/js/search-engine.js' | relative_url }}"></script>
```

**Order matters:** `search-engine.js` must load **after** `college-data.js` because `buildIndex()` reads `window.COLLEGE_DATA`.

### 9.3 COLLEGE_DATA Dependency

`window.COLLEGE_DATA` is a large JavaScript object (~12,400 lines) with structure:

```javascript
window.COLLEGE_DATA = {
  colleges: [
    {
      name: "...",
      slug: "...",
      description: "...",
      ranking: { location: "..." },
      branches: [
        {
          name: "...",
          slug: "...",
          semesters: [
            {
              number: 1,
              slug: "sem1",
              subjects: [
                {
                  name: "...",
                  id: "...",
                  slug: "...",
                  description: "...",
                  icon: "book",
                  keywords: ["..."],
                  pyqs: [
                    { id: "...", title: "...", year: 2024, exam_type: "..." }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
```

If `COLLEGE_DATA` structure changes, `buildIndex()` must be updated accordingly (see Section 13).

---

## 10. Coexistence with Old Search Code

| Aspect | Old Code | Neo-Search | Conflict? |
|--------|----------|------------|-----------|
| HTML element IDs | `main-search`, `search-form`, `college-filter`, etc. | `nsearch-input`, `nsearch-chips`, `nsearch-dd-*`, etc. | **None** |
| CSS selectors | `.search-page`, `.search-header`, `.search-result-item` | `.nsearch-page`, `.nsearch-hero`, `.nsearch-college-card` | **None** |
| JS global variables | `window.quickSearch`, `window.performAdvancedSearch` | All private inside IIFE | **None** |
| localStorage keys | None | `pyqfort_recent_searches` | **None** |
| URL parameters | `?q=` (read by old code) | `?q=`, `?college=`, `?semester=`, `?year=` | Shared `?q=`, but old code's `getElementById` returns null so it no-ops |

**It is safe to delete old search code from main.js (~lines 764–1810) and main.css (~lines 1128–1680) at any time.** See Section 13.8 for the procedure.

---

## 11. State Machine & UI Flow

The search page has **four mutually exclusive states**, managed by `showState(state)`:

```
                  ┌──────────────┐
        Page Load │    IDLE      │  (welcome hero + recent + popular)
                  └──────┬───────┘
                         │ user types / selects filter / clicks popular
                         ▼
                  ┌──────────────┐
                  │   LOADING    │  (spinner — currently instant, placeholder)
                  └──────┬───────┘
                         │ results computed
                    ┌────┴────┐
                    ▼         ▼
            ┌────────────┐  ┌──────────────┐
            │  RESULTS   │  │    EMPTY      │
            │(categorized│  │(no results    │
            │ cards)     │  │ message)      │
            └────────────┘  └──────────────┘
                    │              │
                    └──────┬───────┘
                           │ user clears / resets
                           ▼
                    ┌──────────────┐
                    │     IDLE     │
                    └──────────────┘
```

Each state (`idle`, `loading`, `results`, `empty`) maps to a DOM element (`#nsearch-idle`, `#nsearch-loading`, `#nsearch-results`, `#nsearch-empty`) — only one is visible at a time.

---

## 12. Data Flow Diagram

```
User types "data structures"
         │
         ▼
  input 'input' event fires
         │
         ▼
  debounce(220ms)
         │
         ▼
  runSearch()
    ├── activeQuery = "data structures"
    ├── saveRecent("data structures")
    ├── search("data structures", {college:'', semester:'', year:''})
    │     ├── tokenize → ["data", "structures"]
    │     ├── scan collegeIdx[]  → score each → filter → sort → colleges[]
    │     ├── scan subjectIdx[]  → score each → filter → dedupe → sort → subjects[]
    │     └── scan pyqIdx[]      → score each → filter → sort → pyqs[]
    │     └── return { colleges, subjects, pyqs }
    │
    ├── lastResults = returned object
    ├── renderColleges()  →  .nsearch-list-colleges.innerHTML = cards
    ├── renderSubjects()  →  .nsearch-list-subjects.innerHTML = cards
    ├── renderPYQs()      →  .nsearch-list-pyqs.innerHTML = cards
    ├── showState('results')
    ├── updatePills()     →  show active filter tags
    └── updateResetBtn()  →  show/hide reset button
```

---

## 13. How New Data Becomes Searchable — The Data Pipeline

### 13.1 The Two-File System: colleges.yml ↔ college-data.js

PYQFort uses **two parallel data sources** that must be kept in sync manually:

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│   _data/colleges.yml        │         │ assets/js/college-data.js   │
│   (YAML — 11,882 lines)     │         │ (JavaScript — 12,437 lines) │
│                              │         │                              │
│   Used by:                   │         │   Used by:                   │
│   • Jekyll layouts           │         │   • Neo-Search (search-engine│
│   • Page generation          │         │     .js → buildIndex())      │
│   • Liquid templates         │         │   • Old search (main.js)     │
│   • college.html, branch.html│         │   • Any client-side JS that  │
│     semester.html, subject   │         │     reads window.COLLEGE_DATA│
│     .html layouts            │         │                              │
└─────────────────────────────┘         └─────────────────────────────┘
         │                                          │
         │  ⚠ NOT auto-synced                       │
         │  Must be updated MANUALLY in BOTH files  │
         └──────────────┬───────────────────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  GOLDEN RULE:       │
             │  Every change in    │
             │  colleges.yml MUST  │
             │  be mirrored in     │
             │  college-data.js    │
             │  and vice versa.    │
             └─────────────────────┘
```

**YES, the existing flow still works.** Neo-Search does NOT change how data gets into the system. It reads from `window.COLLEGE_DATA` (populated by `college-data.js`), which is the same data source the old search used. So:

- ✅ If you add data to BOTH `colleges.yml` AND `college-data.js` → pages exist AND search finds them
- ❌ If you add data to `colleges.yml` ONLY → Jekyll creates pages but **search CANNOT find them** (invisible to Neo-Search)
- ❌ If you add data to `college-data.js` ONLY → search finds them but **links lead to 404** (no Jekyll page exists)

### What Each File Contains (Side by Side)

| Field | colleges.yml | college-data.js | Notes |
|-------|:---:|:---:|-------|
| `name` | ✅ | ✅ | **Required by both** |
| `slug` | ✅ | ✅ | **Required by both** — generates URLs |
| `id` | ✅ | ✅ | Used by Jekyll for page matching |
| `description` | ✅ | ✅ | Shown in UI, included in search text |
| `keywords` | ✅ | ✅ | Included in search text |
| `icon` | ✅ | ✅ | Used for subject cards |
| `ranking` (location, etc.) | ✅ | ✅ | Location shown in college cards |
| `branches[]` | ✅ | ✅ | Full hierarchy |
| `semesters[]` | ✅ | ✅ | Full hierarchy |
| `subjects[]` | ✅ | ✅ | Full hierarchy |
| `pyqs[]` | ✅ | ✅ | Full PYQ list |
| `pyqs[].year` | ✅ | ✅ | Used for year filter |
| `pyqs[].title` | ✅ | ✅ | Shown in PYQ cards, searched |
| `pyqs[].id` | ✅ | ✅ | **Critical** — builds PDF viewer URL |
| `pyqs[].file` | ✅ | ✅ | PDF filename (not used by Neo-Search directly) |
| `pyqs[].exam_type` | ✅ (rare) | ✅ (rare) | Shown as badge, included in search text |
| `pyqs[].upload` | ✅ | ❌ | YAML-only — not in JS, not searched |
| `pyqs[].new` | ✅ | ❌ | YAML-only — not in JS, not searched |
| `pyqs[].pages` | ❌ | ✅ | JS-only — not used by Neo-Search |
| `marketing_cards` | ✅ | ❌ | YAML-only — for Jekyll marketing cards |
| `special` (branch) | ✅ | ❌ | YAML-only — for Jekyll layout highlighting |

### 13.2 Step-by-Step: Adding a New College

**What you need to do:**

1. **Add to `_data/colleges.yml`** — insert a new top-level entry:
   ```yaml
   - name: "Delhi Technological University"
     slug: dtu
     id: dtu
     description: "DTU PYQs and resources"
     keywords: ["dtu", "delhi", "technological"]
     icon: university
     ranking:
       location: "Delhi"
     branches:
       - name: Computer Science
         slug: cse
         # ... (semesters, subjects, pyqs)
   ```

2. **Mirror in `assets/js/college-data.js`** — add the same data in JavaScript object format:
   ```javascript
   {
     name: "Delhi Technological University",
     slug: "dtu",
     id: "dtu",
     description: "DTU PYQs and resources",
     keywords: ["dtu", "delhi", "technological"],
     icon: "university",
     ranking: { location: "Delhi" },
     branches: [
       { name: "Computer Science", slug: "cse", /* ... */ }
     ]
   }
   ```

3. **Create the college page** at `colleges/dtu/index.html` (if not auto-generated by Jekyll)

4. **Upload PDF files** if applicable

5. **Rebuild** (`bundle exec jekyll build`)

6. **Verify** — open `/search/` and type "DTU". Open browser console — you should see:
   ```
   [Neo-Search] Index built — N colleges, M subjects, P PYQs indexed.
   ```

**Neo-Search requires ZERO code changes** to pick up a new college. Just add the data to `college-data.js`.

### 13.3 Step-by-Step: Adding a New Branch / Semester / Subject

Same principle — add in BOTH files, inside the correct college → branch → semester hierarchy.

For a **new subject**:
```yaml
# In colleges.yml, nested inside the correct college > branch > semester:
subjects:
  - name: "Artificial Intelligence"
    slug: ai
    id: ai
    description: "Introduction to AI and Machine Learning"
    keywords: ["ai", "machine learning", "neural networks"]
    icon: brain
    pyqs: []  # Add PYQs later
```

And mirror the same in `college-data.js` (same nesting).

**No search code changes needed.** `buildIndex()` traverses the entire tree automatically.

### 13.4 Step-by-Step: Adding a New PYQ PDF

Add inside the correct subject's `pyqs:` array in BOTH files:

```yaml
# colleges.yml
pyqs:
  - year: 2025
    file: dtu-ai-major-2025.pdf
    id: dtu-ai-major-2025
    title: "AI Major Exam 2025"
    exam_type: "major"          # Optional — shown as badge
    upload: "Contributor Name"   # YAML-only, not searched
    new: true                    # YAML-only, not searched
```

```javascript
// college-data.js
pyqs: [
  {
    year: 2025,
    file: "dtu-ai-major-2025.pdf",
    id: "dtu-ai-major-2025",
    title: "AI Major Exam 2025",
    exam_type: "major",
    pages: 4
  }
]
```

**The PYQ will appear in Neo-Search immediately** after rebuilding. The year filter dropdown auto-populates from actual data, so "2025" will appear without code changes. The PDF viewer URL is constructed automatically as:
```
/pdf-viewer/{college-slug}/{branch-slug}/{semester-slug}/{subject-slug}/{pyq-id}/
```

### 13.5 What Parameters Decide If Something Appears in Search Results

Here is the **exact truth** about what makes each type of result appear:

#### Colleges appear when:

| Condition | Details |
|-----------|---------|
| **Exists in `college-data.js`** | Must be in `COLLEGE_DATA.colleges[]` |
| **Has `name`** | Shown in the result card and searched |
| **Has `slug`** | Used to build the URL `/colleges/{slug}/` |
| **Matches the search query** | Any of: name, slug, description, location, keywords match the typed tokens |
| **Matches active college filter** | If a college filter chip is active, only that college appears |

**Fields that affect searchability:** `name`, `slug`, `description`, `ranking.location`, `keywords[]`  
**Fields that affect display:** `name`, `ranking.location`

#### Subjects appear when:

| Condition | Details |
|-----------|---------|
| **Exists in `college-data.js`** | Must be nested inside a college → branch → semester → subjects[] |
| **Has `name`** | Displayed and searched |
| **Has `slug`** | Used to build the URL |
| **Parent chain complete** | College, branch, and semester all have valid `slug` values |
| **Matches the search query** | Any of: subject name, id, description, parent college name, parent branch name, keywords match the typed tokens |
| **Matches active filters** | college slug filter, semester number filter |

**Fields that affect searchability:** `name`, `id`, `description`, `keywords[]`, parent `college.name`, parent `branch.name`  
**Fields that affect display:** `name`, `icon`, parent college name, parent branch name, semester number, `pyqs.length` (counted as PDF count)

#### PYQs/Papers appear when:

| Condition | Details |
|-----------|---------|
| **Exists in `college-data.js`** | Must be nested inside subjects[].pyqs[] |
| **Has `id`** | **Critical** — without it, the PDF viewer URL breaks |
| **Has `title` (or parent subject `name`)** | Falls back to subject name if title is empty |
| **Matches the search query** | Any of: title, subject name, college name, branch name, exam_type, year (as string) match the typed tokens |
| **Matches active filters** | college slug, semester number, year (exact integer match) |

**Fields that affect searchability:** `title`, parent `subject.name`, parent `college.name`, parent `branch.name`, `exam_type`, `year`  
**Fields that affect display:** `title`, parent college name, semester number, `year`, `exam_type`  
**Fields that affect navigation:** parent chain `slug` values, `id` (for PDF viewer URL)

#### Summary: "Just defining in the prior way will work?"

**YES** — if you continue adding data to **both** `_data/colleges.yml` and `assets/js/college-data.js` in the same format as existing entries, everything will be picked up by Neo-Search automatically. No code changes required. The critical minimum fields are:

For colleges: `name`, `slug`  
For branches: `name`, `slug`  
For semesters: `number`, `slug`  
For subjects: `name`, `slug`  
For PYQs: `id`, `title` (or parent subject name), `year`

### 13.6 Fields in YAML That Neo-Search Does NOT Read

These fields exist in `_data/colleges.yml` but are NOT present in `college-data.js` and therefore invisible to Neo-Search:

| YAML Field | Purpose | Impact |
|------------|---------|--------|
| `upload` (on PYQs) | Tracks who uploaded the paper | **Not searchable** — searching "Saumy" won't find their uploads |
| `new: true` (on PYQs) | Marks recently added papers | **Not filterable** — no "show new papers" filter exists |
| `special: true` (on branches) | Highlights branch in Jekyll layout | **Not used** — search treats all branches equally |
| `marketing_cards` (all levels) | Revenue/partnership content | **Not indexed** — marketing cards are layout-only |
| `branch_marketing_cards` | Branch-level marketing | Same |
| `semester_marketing_cards` | Semester-level marketing | Same |
| `subject_marketing_cards` | Subject-level marketing | Same |
| `pages` (on PYQs in JS) | Page count of PDF | In JS file but **not used** by Neo-Search display or search text |

### 13.7 Data Integrity Diagnostics (Console Warnings)

As of v1.1, `buildIndex()` now validates data at index-build time and reports to the browser console:

**Success message (always shown):**
```
[Neo-Search] Index built — 6 colleges, 120 subjects, 1126 PYQs indexed.
```

**Warnings (only when problems found):**
```
[Neo-Search] 3 data integrity warning(s):
  ⚠ College "UNNAMED" is missing a slug — it will generate broken URLs.
  ⚠ Subject "UNNAMED" in YMCA > CSE > Sem 3 is missing a slug.
  ⚠ PYQ "UNTITLED" in Data Structures is missing an id — PDF viewer URL will be broken.
```

**How to use this:** After adding new data, open the search page, press F12 → Console tab. If you see warnings, fix the indicated missing fields in `college-data.js`.

---

## 14. Where Neo-Search Fails — Known Limitations

### 14.1 Failures From Data Issues

| Failure Scenario | What Happens | Root Cause | Fix |
|------------------|-------------|------------|-----|
| Data added to `colleges.yml` but not `college-data.js` | Pages exist but search returns zero results | Neo-Search reads only from `college-data.js` | Always update both files |
| Data added to `college-data.js` but not `colleges.yml` | Search finds results but clicking leads to 404 | Jekyll has no source to generate the page | Always update both files |
| PYQ missing `id` field | PDF viewer link goes to `/pdf-viewer/.../undefined/` → 404 | `pdfUrl` is constructed from `pyq.id` | Add the `id` field |
| Subject missing `slug` | Subject card link goes to `.../undefined/` → 404 | URL is built from slug chain | Add the `slug` field |
| College missing `ranking.location` | No location badge on college result card | `loc` falls back to empty string | Add ranking.location (optional) |
| `exam_type` missing on PYQ | No exam type badge shown; "sessional" or "major" not searchable by that term | Only ~1 PYQ out of 1126 currently has this field | Add `exam_type` to more PYQs for better filtering |
| Typo in slug (e.g., "csse" instead of "cse") | Search finds it, but link goes to wrong/nonexistent page | Slug mismatch between YAML and JS | Verify slugs match |
| Duplicate subject URLs across branches | Subject appears only once (deduplicated by URL) | `buildIndex()` produces same URL pattern | Ensure unique slug paths |

### 14.2 Search Algorithm Limitations

| Limitation | Example | Impact |
|------------|---------|--------|
| **No fuzzy matching** | Typing "Dat Structres" (typo) returns zero results | Users must spell correctly |
| **No synonym/abbreviation awareness** | "DSA" won't find "Data Structures and Algorithms" unless "dsa" is in keywords | Users must know exact terms or keywords must be populated |
| **Token order irrelevant but all must match** | "structures data" works, but "data struct" fails (partial token "struct" ≠ "structures") | Partial word matching not supported |
| **No stemming** | "programming" won't match "programs" or "programmed" | Only exact substring matching within tokens |
| **Score relies on string indexOf** | Accented characters or Unicode may not match properly | English-centric matching only |
| **All-or-partial penalty** | If 2 of 3 tokens match, score is multiplied by 0.4 — may rank below a 1-token match | Multi-word queries penalized when partial match occurs |

### 14.3 UI & Scale Limitations

| Limitation | Current State | Breaking Point |
|------------|--------------|----------------|
| **Full client-side index** | ~1,126 PYQs, instant (<50ms) | At ~50,000+ items, page load slows (large `college-data.js`), search may lag |
| **No Web Worker** | Search runs on main thread | Heavy index with complex scoring could freeze UI briefly |
| **No search result caching** | Every keystroke re-scans entire index | Redundant work on similar queries |
| **No infinite scroll** | "Load More" button only | Users must click repeatedly for large result sets |
| **Dropdown lists unfiltered** | College dropdown shows ALL colleges | With 100+ colleges, the list becomes unwieldy |
| **No result highlighting** | Matched terms not visually highlighted in results | Harder to see why a result matched |
| **Status bar shows wall-clock time** | Includes DOM rendering time, not just search | May show higher numbers than actual algorithm time |

### 14.4 Feature Gaps

| Missing Feature | Impact | Difficulty to Add |
|-----------------|--------|-------------------|
| **Branch filter** | Can't narrow by CSE, ECE, etc. | Moderate (see Section 15.1) |
| **Exam type filter** | Can't filter "sessional" vs "major" | Easy (add chip, same pattern as year) |
| **Sort options** | No way to sort by year, name, relevance toggle | Moderate (add a sort dropdown, re-sort `lastResults`) |
| **Search within results** | Can't refine after initial search without retyping | Easy (add a secondary filter input) |
| **Bookmark/share search** | URL doesn't update as you type (only on page load via `?q=`) | Easy (use `history.replaceState()` on search) |
| **Offline search** | Requires page load with JS enabled | Hard (requires service worker caching of college-data.js) |
| **Voice search** | No microphone input | Moderate (Web Speech API + pipe to input) |
| **Search analytics** | No tracking of what users search for | Easy (send events to GA/Plausible in `saveRecent()`) |

---

## 15. Guide for Future Code Modification

### 15.1 Adding a New Filter (e.g., Branch)

Follow the symmetry of the existing `college`/`semester`/`year` pattern:

**HTML** (`search/index.html`):
1. Add a new chip button inside `.nsearch-chips`:
   ```html
   <button class="nsearch-chip" data-filter="branch" id="nsearch-chip-branch">
     <i class="fas fa-code-branch"></i>
     <span class="nsearch-chip-label">Branch</span>
     <span class="nsearch-chip-val" id="nsearch-chip-branch-val"></span>
     <i class="fas fa-chevron-down nsearch-chip-arrow"></i>
   </button>
   ```
2. Add a dropdown container inside `.nsearch-dropdown-anchor`:
   ```html
   <div class="nsearch-dropdown" id="nsearch-dd-branch" style="display:none;"></div>
   ```

**JavaScript** (`search-engine.js`):
1. Add `branch: ''` to `activeFilters` object
2. In `renderFilterDropdowns()`, populate `nsearch-dd-branch` — extract unique branches from `subjectIdx`
3. Add `'branch'` to all `['college', 'semester', 'year'].forEach(...)` arrays (3 occurrences in event wiring)
4. In `closeAllDropdowns()`, add `'branch'` to the `forEach` array
5. In `search()` function, add branch filter logic:
   ```javascript
   var fB = filters.branch || '';
   // In subjects loop: if (fB && su.branchSlug !== fB) continue;
   // In pyqs loop:     if (fB && p.branchSlug !== fB) continue;
   ```
6. In `updateChipLabels()`, add a block for `branch`
7. In `updatePills()`, add a pill for `activeFilters.branch`
8. In `resetAll()`, set `activeFilters.branch = ''`
9. In `checkURLParams()`, read `params.get('branch')`

**CSS**: No new CSS needed — existing `.nsearch-chip`, `.nsearch-dropdown`, `.nsearch-dd-item` styles apply automatically.

### 15.2 Adding a New Result Category (e.g., Notes)

1. **Index:** Add a `notesIdx[]` array. Populate it in `buildIndex()` if notes data exists in `COLLEGE_DATA`
2. **Search:** In `search()`, add a notes scoring/filtering loop. Return `notes: [...]` in the result object
3. **HTML:** Add a result group:
   ```html
   <div class="nsearch-group" id="nsearch-grp-notes" style="display:none;">
     <div class="nsearch-group-head">
       <h3><i class="fas fa-sticky-note"></i> Notes</h3>
       <span class="nsearch-group-count" id="nsearch-cnt-notes"></span>
     </div>
     <div class="nsearch-group-list" id="nsearch-list-notes"></div>
   </div>
   ```
4. **JS:** Add `renderNotes()` and `noteCard()` functions following the pattern of `renderSubjects()`/`subjectCard()`
5. **JS:** Call `renderNotes()` in `runSearch()` between `renderSubjects()` and `renderPYQs()`
6. **JS:** Update `total` count calculation
7. **Constants:** Add `NOTES_LIMIT` constant
8. **Load More:** Add notes expansion to `loadMore()` if needed

### 15.3 Changing Result Limits / Pagination Behavior

Edit the constants at the top of `search-engine.js`:

```javascript
const COLLEGES_LIMIT   = 4;    // → change to show more/fewer initially
const SUBJECTS_LIMIT   = 8;
const PYQS_LIMIT       = 10;
const LOAD_MORE_STEP   = 15;   // → change how many load per click
```

College results are NOT included in Load More — they always show up to `COLLEGES_LIMIT`.

### 15.4 Modifying the Scoring Algorithm

The `score(text, name)` function in `search()` is the single point of relevance control. To modify:

- **Boost exact matches more:** Increase the `+20` for `nameLc === q`
- **Weight recent/popular results:** Add a bonus based on external data
- **Add fuzzy matching:** Replace `text.indexOf(token)` with a Levenshtein distance check
- **Penalize very long matches:** Reduce score proportionally to `text.length`
- **Add field weighting:** Instead of a monolithic `searchText`, score each field separately with multipliers

### 15.5 Changing the Debounce Delay

```javascript
const DEBOUNCE_MS = 220;  // Increase for slower devices, decrease for snappier feel
```

`Enter` key always bypasses debounce and triggers immediately.

### 15.6 Adding New Quick-Access / Popular Buttons

Edit `search/index.html` inside `.nsearch-popular-list`. Two formats:

```html
<!-- Search by query -->
<button class="nsearch-popular-btn" data-query="Algorithms">
  <i class="fas fa-sitemap"></i> Algorithms
</button>

<!-- Filter by college -->
<button class="nsearch-popular-btn" data-college="vit-bhopal">
  <i class="fas fa-university"></i> VIT Bhopal
</button>
```

The JS handler reads both `data-query` and `data-college` attributes generically — no JS changes needed.

### 15.7 Styling Changes & CSS Variables

- **Change search bar border-radius:** Edit `.nsearch-bar` → `border-radius: 14px`
- **Change card hover color:** Edit `.nsearch-college-card:hover` → `border-color`
- **Change the primary color site-wide:** Modify `--primary-color` in `:root` — all Neo-Search components inherit automatically
- **Add a custom accent for Neo-Search only:** Define a new variable in `:root` (e.g., `--nsearch-accent`) like Refact's `--refact-color`

### 15.8 Removing Old Search Code Safely

When confident Neo-Search is stable:

1. **CSS:** Delete old `.search-page`, `.search-header`, etc. selectors in `main.css`
2. **JS:** Delete old search functions in `main.js` and their `window.*` exports
3. **Verify:** `grep -r "main-search\|search-form\|college-filter"` returns zero matches
4. **Build & test** the Jekyll site

### 15.9 Integrating with Refact Feature

Neo-Search result cards could include "Add to Refact" buttons:

1. In `subjectCard()`, add a Refact button with same `data-refact-*` attributes as `_includes/subject-card.html`
2. Refact's `refact.js` uses event delegation — should work automatically if delegation is on `document`

### 15.10 SEO & Accessibility Improvements

- Add `role="search"` to `.nsearch-bar`, `aria-expanded` to chips
- Add `aria-live="polite"` to `#nsearch-results`
- Consider `SearchAction` JSON-LD in page front matter
- Make dropdowns keyboard-navigable (Arrow keys, Escape)

---

## 16. Future-Proofing — No-Migration Guarantee

This section explains the design decisions that ensure Neo-Search **will not need to be migrated** to a different search system as PYQFort grows.

### 16.1 Why Neo-Search Won't Need Replacement

| Design Decision | What It Prevents |
|-----------------|-----------------|
| **IIFE encapsulation** | No globals leak — adding any new feature/library won't break search |
| **`nsearch-*` namespace** | No naming collision possible with future features, frameworks, or libraries |
| **Data-agnostic indexing** | `buildIndex()` traverses whatever tree shape `COLLEGE_DATA` has — adding fields to the data source doesn't break anything |
| **Defensive `\|\|` fallbacks everywhere** | Missing fields produce empty strings or zero, never crash the engine |
| **No dependency on any library** | No jQuery, no Fuse.js, no Algolia — pure vanilla JS. No version upgrades, no breaking changes from dependencies |
| **CSS uses only pre-existing variables** | Theme changes (light/dark, color palette updates) propagate automatically without touching Neo-Search CSS |
| **Dynamic filter dropdowns** | Semester list built from actual data, year list built from actual data, college list built from actual data — no hardcoded values that go stale |

### 16.2 Scaling Path (When Data Grows)

| Data Size | Current Performance | What To Do |
|-----------|--------------------|------------|
| **<5,000 PYQs** | Instant (<50ms) | Nothing — current code handles this perfectly |
| **5,000–20,000 PYQs** | Still fast (<200ms) | Consider pre-computed search text during build step (Jekyll plugin generates `college-data.js` with pre-lowercased searchText) |
| **20,000–100,000 PYQs** | Noticeable lag on mobile | Move `buildIndex()` and `search()` into a **Web Worker** — decode in background thread, post results back to main thread |
| **100,000+ PYQs** | `college-data.js` becomes too large to load | Split into per-college JSON files, lazy-load on demand. Or switch to a search API backend (Algolia, MeiliSearch, Typesense) |

**Key Point:** The architecture supports ALL of these upgrades **without changing the HTML or CSS** — only the data-loading and search functions in `search-engine.js` need modification.

### 16.3 Version-Proofing Checklist

Follow this checklist with every data update to avoid issues:

- [ ] Both `colleges.yml` and `college-data.js` updated with identical content
- [ ] Every new college/branch/semester/subject has a `slug` field
- [ ] Every new PYQ has an `id` field
- [ ] Jekyll build produces no new errors (`bundle exec jekyll build`)
- [ ] Open `/search/` → F12 Console → verify `[Neo-Search] Index built — N colleges, M subjects, P PYQs indexed.`
- [ ] Zero `⚠` warnings in console
- [ ] Search for the newly added content → verify it appears
- [ ] Click the result → verify the page loads (not 404)
- [ ] Test on mobile viewport (Chrome DevTools responsive mode)

### 16.4 If You Must Migrate in the Future

If PYQFort outgrows client-side search entirely (100k+ items), here's the safe migration path:

1. **Keep the HTML structure** (`search/index.html`) — it's already well-structured
2. **Replace only the data-loading and search functions** in `search-engine.js`:
   - Swap `buildIndex()` for API calls
   - Swap the `search()` function for fetch-to-backend
   - Keep all rendering, filter, and UI event code unchanged
3. **The CSS, HTML, and event wiring require ZERO changes** — the rendering functions receive the same `{ colleges, subjects, pyqs }` shape regardless of where the data comes from

This means even a "migration" would only touch ~100 lines of JavaScript, not a full rewrite.

---

## 17. Testing Checklist

Use this checklist when modifying Neo-Search:

- [ ] **Basic search:** Type a subject name → relevant results appear
- [ ] **Multi-token:** Type "data structures ymca" → results from YMCA rank highest
- [ ] **Empty query + filter:** Select College chip without typing → all subjects/PYQs for that college shown
- [ ] **Multiple filters:** College + Semester + Year all active → narrow results correctly
- [ ] **Filter toggle off:** Click active chip value again → filter clears
- [ ] **Reset button:** Appears when any filter/query is active; clears everything
- [ ] **Active pills:** Each filter/query shows a removable pill above results
- [ ] **Load More:** Click "Show More Results" → additional items append
- [ ] **Recent searches:** After searching, return to idle → recent searches visible. Click one → re-runs
- [ ] **Clear recent:** "Clear" button removes all recent entries
- [ ] **Popular/Quick Access:** Each button triggers correct search or filter
- [ ] **URL params:** Navigate to `/search/?q=math&college=ymca` → auto-populates and searches
- [ ] **Header search bar:** Type in header → submits to `/search/?q=...` → Neo-Search picks it up
- [ ] **Keyboard `/`:** Press `/` while not in an input → focuses search bar
- [ ] **Enter key:** Press Enter → instant search (no debounce wait)
- [ ] **No results:** Search for gibberish → "No results found" state with Reset button
- [ ] **Dark theme:** Toggle dark mode → all components render correctly
- [ ] **Mobile (480px):** Chips, cards, dropdowns, buttons all usable on small screens
- [ ] **Tablet (768px):** PYQ cards stack, keyboard hint hides
- [ ] **No old-search interference:** Old search elements don't appear anywhere
- [ ] **Console diagnostics:** Open DevTools → see index count, zero `⚠` warnings
- [ ] **Jekyll build:** `bundle exec jekyll build` completes without search-related errors
- [ ] **New data verification:** Newly added college/subject/PYQ appears in search + link works

---

## 18. Glossary

| Term | Definition |
|------|-----------|
| **Neo-Search** | The new modernized search system (this documentation) |
| **Old Search** | The previous form-based search in `main.js` lines 764–1810 |
| **IIFE** | Immediately Invoked Function Expression — `(function(){ ... })()` |
| **Chip** | A compact, pill-shaped filter button (College, Semester, Year) |
| **Dropdown** | The panel that opens beneath a chip showing selectable values |
| **Pill** | A removable tag shown above results indicating an active filter |
| **Score** | Numeric relevance value computed by the search algorithm |
| **Token** | A single word from the search query after splitting on whitespace |
| **searchText** | Pre-computed lowercase concatenation of all searchable fields in an index record |
| **COLLEGE_DATA** | The global JavaScript object containing all college/branch/semester/subject/PYQ data |
| **nsearch-*** | The CSS/ID namespace prefix for all Neo-Search DOM elements |
| **Debounce** | Technique to delay execution until input pauses (220ms) |
| **Load More** | Progressive pagination — appending more results rather than paging |
| **Refact** | PYQFort's bookmark/save feature (separate system, uses `refact-*` namespace) |
| **Dual-source** | The `colleges.yml` + `college-data.js` parallel data maintenance requirement |
| **Data integrity warning** | Console message from `buildIndex()` when fields are missing |

---

*End of Neo-Search Documentation — v1.1*
