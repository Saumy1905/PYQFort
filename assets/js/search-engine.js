/**
 * search-engine.js — PYQFort Modern Search
 * Builds a unified search index from COLLEGE_DATA and provides instant,
 * categorized, relevance-ranked search with chip-based filters,
 * recent-search history, and keyboard shortcuts.
 *
 * Entirely self-contained — all element IDs use the "nsearch-*" namespace
 * so nothing collides with existing main.js code.
 */

(function () {
  'use strict';

  /* ─── Constants ───────────────────────────────────────────────────── */
  const RECENT_KEY       = 'pyqfort_recent_searches';
  const MAX_RECENT       = 8;
  const COLLEGES_LIMIT   = 4;
  const SUBJECTS_LIMIT   = 8;
  const PYQS_LIMIT       = 10;
  const LOAD_MORE_STEP   = 15;
  const DEBOUNCE_MS      = 220;

  /* ─── Search Index ────────────────────────────────────────────────── */
  let collegeIdx  = [];   // { name, slug, description, url, location, searchText }
  let subjectIdx  = [];   // { name, code, description, college(Name), collegeSlug, branch, branchSlug, semester(Num), semesterSlug, url, pdf_count, icon, searchText }
  let pyqIdx      = [];   // { title, subject, subjectSlug, college, collegeSlug, branch, branchSlug, semester, semesterSlug, year, examType, url, pdfUrl, searchText }

  /* ─── Active State ────────────────────────────────────────────────── */
  let activeQuery   = '';
  let activeFilters = { college: '', branch: '', semester: '', subject: '', year: '' };
  let lastResults   = { colleges: [], subjects: [], pyqs: [] };
  let pyqsShown     = 0;        // how many PYQs currently displayed (for load-more)
  let subjectsShown = 0;
  let openDropdown  = null;     // which filter dropdown is open

  /* ═══════════════════════════════════════════════════════════════════
     INDEX BUILDING
     ═══════════════════════════════════════════════════════════════════ */

  function buildIndex() {
    const data = window.COLLEGE_DATA;
    if (!data || !data.colleges) {
      console.warn('[Neo-Search] window.COLLEGE_DATA is missing or has no colleges array. Search will not work. Ensure college-data.js is loaded before search-engine.js.');
      return;
    }

    var warnings = [];

    data.colleges.forEach(function (college) {
      // ── Validate critical college fields
      if (!college.slug) { warnings.push('College "' + (college.name || 'UNNAMED') + '" is missing a slug — it will generate broken URLs.'); }
      if (!college.name) { warnings.push('College with slug "' + (college.slug || '?') + '" is missing a name — it will show blank in results.'); }

      var loc = (college.ranking && college.ranking.location) || '';

      collegeIdx.push({
        name:        college.name || '',
        slug:        college.slug || '',
        description: college.description || '',
        location:    loc,
        url:         '/colleges/' + college.slug + '/',
        searchText:  [college.name, college.slug, college.description, loc, (college.keywords || []).join(' ')].join(' ').toLowerCase()
      });

      (college.branches || []).forEach(function (branch) {
        if (!branch.slug) { warnings.push('Branch "' + (branch.name || 'UNNAMED') + '" in ' + college.name + ' is missing a slug.'); }

        (branch.semesters || []).forEach(function (semester) {
          if (!semester.slug || !semester.number) { warnings.push('Semester in ' + college.name + ' > ' + branch.name + ' is missing slug or number.'); }

          (semester.subjects || []).forEach(function (subject) {
            if (!subject.slug) { warnings.push('Subject "' + (subject.name || 'UNNAMED') + '" in ' + college.name + ' > ' + branch.name + ' > Sem ' + semester.number + ' is missing a slug.'); }

            var sUrl = '/colleges/' + college.slug + '/' + branch.slug + '/' + semester.slug + '/' + subject.slug + '/';

            subjectIdx.push({
              name:         subject.name || '',
              code:         subject.id   || '',
              description:  subject.description || '',
              college:      college.name || '',
              collegeSlug:  college.slug || '',
              branch:       branch.name  || '',
              branchSlug:   branch.slug  || '',
              semester:     semester.number || 0,
              semesterSlug: semester.slug || '',
              url:          sUrl,
              pdf_count:    (subject.pyqs || []).length,
              icon:         subject.icon || 'book',
              searchText:   [subject.name, subject.id, subject.description, college.name, branch.name, (subject.keywords || []).join(' ')].join(' ').toLowerCase()
            });

            (subject.pyqs || []).forEach(function (pyq) {
              if (!pyq.id) { warnings.push('PYQ "' + (pyq.title || 'UNTITLED') + '" in ' + subject.name + ' is missing an id — PDF viewer URL will be broken.'); }

              pyqIdx.push({
                title:        pyq.title || subject.name,
                subject:      subject.name || '',
                subjectSlug:  subject.slug || '',
                college:      college.name || '',
                collegeSlug:  college.slug || '',
                branch:       branch.name  || '',
                branchSlug:   branch.slug  || '',
                semester:     semester.number || 0,
                semesterSlug: semester.slug || '',
                year:         pyq.year || 0,
                examType:     pyq.exam_type || '',
                url:          sUrl,
                pdfUrl:       '/pdf-viewer/' + college.slug + '/' + branch.slug + '/' + semester.slug + '/' + subject.slug + '/' + (pyq.id || '') + '/',
                searchText:   [pyq.title, subject.name, college.name, branch.name, pyq.exam_type || '', String(pyq.year || '')].join(' ').toLowerCase()
              });
            });
          });
        });
      });
    });

    // ── Diagnostic summary (visible in DevTools console)
    console.info(
      '[Neo-Search] Index built — ' +
      collegeIdx.length + ' colleges, ' +
      subjectIdx.length + ' subjects, ' +
      pyqIdx.length + ' PYQs indexed.'
    );
    if (warnings.length) {
      console.warn('[Neo-Search] ' + warnings.length + ' data integrity warning(s):');
      warnings.forEach(function (w) { console.warn('  ⚠ ' + w); });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SEARCH ALGORITHM — token-based relevance scoring
     ═══════════════════════════════════════════════════════════════════ */

  function search(query, filters) {
    var q      = (query || '').toLowerCase().trim();
    var tokens = q.split(/\s+/).filter(Boolean);
    var fC     = filters.college;
    var fB     = filters.branch;
    var fS     = filters.semester ? parseInt(filters.semester, 10) : 0;
    var fSub   = filters.subject;
    var fY     = filters.year  ? parseInt(filters.year, 10)     : 0;

    function score(text, name) {
      if (!q) return 1;                                     // filter-only mode
      var s = 0;
      var nameLc = (name || '').toLowerCase();
      if (text.indexOf(q) !== -1) s += 10;                  // full query match
      if (nameLc === q) s += 20;                             // exact name
      if (nameLc.indexOf(q) === 0) s += 8;                  // starts-with
      var matched = 0;
      for (var i = 0; i < tokens.length; i++) {
        if (text.indexOf(tokens[i]) !== -1) matched++;
      }
      s += matched * 3;
      if (matched === 0) return 0;
      return matched === tokens.length ? s : s * 0.4;
    }

    // Colleges
    var colleges = [];
    for (var i = 0; i < collegeIdx.length; i++) {
      var c = collegeIdx[i];
      var cs = score(c.searchText, c.name);
      if (cs <= 0) continue;
      if (fC && c.slug !== fC) continue;
      colleges.push(assign({}, c, { _score: cs }));
    }
    colleges.sort(function (a, b) { return b._score - a._score; });

    // Subjects (deduplicate by URL)
    var seenSubj = {};
    var subjects = [];
    for (var j = 0; j < subjectIdx.length; j++) {
      var su = subjectIdx[j];
      var ss = score(su.searchText, su.name);
      if (ss <= 0) continue;
      if (fC && su.collegeSlug !== fC) continue;
      if (fB && su.branchSlug !== fB) continue;
      if (fS && su.semester !== fS) continue;
      if (fSub && su.url !== fSub) continue;
      if (seenSubj[su.url]) continue;
      seenSubj[su.url] = true;
      subjects.push(assign({}, su, { _score: ss }));
    }
    subjects.sort(function (a, b) { return b._score - a._score; });

    // PYQs
    var pyqs = [];
    for (var k = 0; k < pyqIdx.length; k++) {
      var p = pyqIdx[k];
      var ps = score(p.searchText, p.title);
      if (ps <= 0) continue;
      if (fC && p.collegeSlug !== fC) continue;
      if (fB && p.branchSlug !== fB) continue;
      if (fY && p.year !== fY) continue;
      if (fS && p.semester !== fS) continue;
      if (fSub && p.url !== fSub) continue;
      pyqs.push(assign({}, p, { _score: ps }));
    }
    pyqs.sort(function (a, b) { return b._score - a._score || (b.year || 0) - (a.year || 0); });

    return { colleges: colleges, subjects: subjects, pyqs: pyqs };
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDERING
     ═══════════════════════════════════════════════════════════════════ */

  function runSearch() {
    var startTime = performance.now();
    activeQuery = (el('nsearch-input').value || '').trim();

    if (!activeQuery && !activeFilters.college && !activeFilters.branch && !activeFilters.semester && !activeFilters.subject && !activeFilters.year) {
      showState('idle');
      updatePills();
      updateResetBtn();
      return;
    }

    // Save to recent
    if (activeQuery) saveRecent(activeQuery);

    lastResults   = search(activeQuery, activeFilters);
    pyqsShown     = 0;
    subjectsShown = 0;

    var total = lastResults.colleges.length + lastResults.subjects.length + lastResults.pyqs.length;
    var ms    = Math.round(performance.now() - startTime);

    if (total === 0) {
      showState('empty');
      elShow('nsearch-status', true);
      el('nsearch-count').textContent = '0 results';
      el('nsearch-time').textContent  = '(' + ms + ' ms)';
      updatePills();
      updateResetBtn();
      return;
    }

    elShow('nsearch-status', true);
    el('nsearch-count').textContent = total + ' result' + (total !== 1 ? 's' : '');
    el('nsearch-time').textContent  = '(' + ms + ' ms)';

    renderColleges();
    renderSubjects();
    renderPYQs();
    showState('results');
    updatePills();
    updateResetBtn();
  }

  /* ── Colleges ──────────────────────────────────────────────────── */
  function renderColleges() {
    var items = lastResults.colleges.slice(0, COLLEGES_LIMIT);
    var grp   = el('nsearch-grp-colleges');
    var list  = el('nsearch-list-colleges');
    var cnt   = el('nsearch-cnt-colleges');
    if (!items.length) { grp.style.display = 'none'; return; }
    grp.style.display = 'block';
    cnt.textContent   = lastResults.colleges.length;
    list.innerHTML    = items.map(collegeCard).join('');
  }

  function collegeCard(c) {
    return '<a class="nsearch-college-card" href="' + c.url + '">' +
      '<div class="nsearch-college-icon"><i class="fas fa-university"></i></div>' +
      '<div class="nsearch-college-info">' +
        '<span class="nsearch-college-name">' + esc(c.name) + '</span>' +
        (c.location ? '<span class="nsearch-college-loc"><i class="fas fa-map-marker-alt"></i> ' + esc(c.location) + '</span>' : '') +
      '</div>' +
      '<i class="fas fa-chevron-right nsearch-college-arrow"></i>' +
    '</a>';
  }

  /* ── Subjects ──────────────────────────────────────────────────── */
  function renderSubjects() {
    subjectsShown = SUBJECTS_LIMIT;
    var items = lastResults.subjects.slice(0, subjectsShown);
    var grp   = el('nsearch-grp-subjects');
    var list  = el('nsearch-list-subjects');
    var cnt   = el('nsearch-cnt-subjects');
    if (!items.length) { grp.style.display = 'none'; return; }
    grp.style.display = 'block';
    cnt.textContent   = lastResults.subjects.length;
    list.innerHTML    = items.map(subjectCard).join('');
    updateMoreBtn();
  }

  function subjectCard(s) {
    var pdfLabel = s.pdf_count === 1 ? 'PDF' : 'PDFs';
    return '<a class="nsearch-subject-card" href="' + s.url + '">' +
      '<div class="nsearch-subj-icon"><i class="fas fa-' + esc(s.icon) + '"></i></div>' +
      '<div class="nsearch-subj-body">' +
        '<span class="nsearch-subj-name">' + esc(s.name) + '</span>' +
        '<span class="nsearch-subj-meta">' +
          '<span><i class="fas fa-university"></i> ' + esc(s.college) + '</span>' +
          '<span><i class="fas fa-code-branch"></i> ' + esc(s.branch) + '</span>' +
          '<span><i class="fas fa-layer-group"></i> Sem ' + s.semester + '</span>' +
          '<span><i class="fas fa-file-pdf"></i> ' + s.pdf_count + ' ' + pdfLabel + '</span>' +
        '</span>' +
      '</div>' +
      '<i class="fas fa-chevron-right nsearch-subj-arrow"></i>' +
    '</a>';
  }

  /* ── PYQs ──────────────────────────────────────────────────────── */
  function renderPYQs() {
    pyqsShown = PYQS_LIMIT;
    var items = lastResults.pyqs.slice(0, pyqsShown);
    var grp   = el('nsearch-grp-pyqs');
    var list  = el('nsearch-list-pyqs');
    var cnt   = el('nsearch-cnt-pyqs');
    if (!items.length) { grp.style.display = 'none'; return; }
    grp.style.display = 'block';
    cnt.textContent   = lastResults.pyqs.length;
    list.innerHTML    = items.map(pyqCard).join('');
    updateMoreBtn();
  }

  function pyqCard(p) {
    return '<div class="nsearch-pyq-card">' +
      '<div class="nsearch-pyq-left">' +
        '<div class="nsearch-pyq-icon"><i class="fas fa-file-pdf"></i></div>' +
        '<div class="nsearch-pyq-info">' +
          '<span class="nsearch-pyq-title">' + esc(p.title) + '</span>' +
          '<span class="nsearch-pyq-meta">' +
            '<span><i class="fas fa-university"></i> ' + esc(p.college) + '</span>' +
            '<span><i class="fas fa-layer-group"></i> Sem ' + p.semester + '</span>' +
            (p.year ? '<span><i class="fas fa-calendar-alt"></i> ' + p.year + '</span>' : '') +
            (p.examType ? '<span><i class="fas fa-clipboard-check"></i> ' + esc(p.examType) + '</span>' : '') +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="nsearch-pyq-actions">' +
        '<a href="' + p.url + '" class="nsearch-pyq-btn nsearch-pyq-btn--subject" title="View subject"><i class="fas fa-book"></i><span>Subject</span></a>' +
        '<a href="' + p.pdfUrl + '" class="nsearch-pyq-btn nsearch-pyq-btn--pdf" title="View PDF"><i class="fas fa-eye"></i><span>View</span></a>' +
      '</div>' +
    '</div>';
  }

  /* ── Load More ─────────────────────────────────────────────────── */
  function loadMore() {
    var listS = el('nsearch-list-subjects');
    var listP = el('nsearch-list-pyqs');

    // First expand subjects if needed
    if (subjectsShown < lastResults.subjects.length) {
      var nextS = lastResults.subjects.slice(subjectsShown, subjectsShown + LOAD_MORE_STEP);
      subjectsShown += nextS.length;
      listS.insertAdjacentHTML('beforeend', nextS.map(subjectCard).join(''));
    }
    // Then expand PYQs
    if (pyqsShown < lastResults.pyqs.length) {
      var nextP = lastResults.pyqs.slice(pyqsShown, pyqsShown + LOAD_MORE_STEP);
      pyqsShown += nextP.length;
      listP.insertAdjacentHTML('beforeend', nextP.map(pyqCard).join(''));
    }
    updateMoreBtn();
  }

  function updateMoreBtn() {
    var hasMore = (subjectsShown < lastResults.subjects.length) || (pyqsShown < lastResults.pyqs.length);
    elShow('nsearch-more-wrap', hasMore);
  }

  /* ═══════════════════════════════════════════════════════════════════
     FILTER CHIPS & DROPDOWNS
     ═══════════════════════════════════════════════════════════════════ */

  function renderFilterDropdowns() {
    // ── College dropdown
    var colleges = collegeIdx.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    el('nsearch-dd-college').innerHTML = '<div class="nsearch-dd-list">' +
      colleges.map(function (c) {
        return '<button class="nsearch-dd-item" data-value="' + esc(c.slug) + '">' + esc(c.name) + '</button>';
      }).join('') +
    '</div>';

    // ── Semester dropdown (dynamic — extracted from actual data)
    var semSet = {};
    for (var s = 0; s < subjectIdx.length; s++) {
      if (subjectIdx[s].semester) semSet[subjectIdx[s].semester] = true;
    }
    var semNums = Object.keys(semSet).map(Number).sort(function (a, b) { return a - b; });
    var semHtml = '<div class="nsearch-dd-list nsearch-dd-grid">';
    semNums.forEach(function (n) {
      semHtml += '<button class="nsearch-dd-item" data-value="' + n + '">Semester ' + n + '</button>';
    });
    semHtml += '</div>';
    el('nsearch-dd-semester').innerHTML = semHtml;

    // ── Branch dropdown (unique branch names, sorted, with search)
    var branchMap = {};
    for (var b = 0; b < subjectIdx.length; b++) {
      var br = subjectIdx[b];
      if (br.branchSlug && !branchMap[br.branchSlug]) branchMap[br.branchSlug] = br.branch;
    }
    var branchSlugs = Object.keys(branchMap).sort(function (a, b) { return branchMap[a].localeCompare(branchMap[b]); });
    el('nsearch-dd-branch').innerHTML =
      '<input type="text" class="nsearch-dd-search" placeholder="Search branches…" data-dd-filter="branch">' +
      '<div class="nsearch-dd-list">' +
      branchSlugs.map(function (slug) {
        return '<button class="nsearch-dd-item" data-value="' + esc(slug) + '">' + esc(branchMap[slug]) + '</button>';
      }).join('') +
      '</div>';

    // ── Subject dropdown (unique subject names, sorted, with search, URL as value)
    var subjMap = {};
    for (var u = 0; u < subjectIdx.length; u++) {
      var su = subjectIdx[u];
      if (su.url && !subjMap[su.url]) subjMap[su.url] = su.name;
    }
    var subjUrls = Object.keys(subjMap).sort(function (a, b) { return subjMap[a].localeCompare(subjMap[b]); });
    el('nsearch-dd-subject').innerHTML =
      '<input type="text" class="nsearch-dd-search" placeholder="Search subjects…" data-dd-filter="subject">' +
      '<div class="nsearch-dd-list">' +
      subjUrls.map(function (url) {
        return '<button class="nsearch-dd-item" data-value="' + esc(url) + '">' + esc(subjMap[url]) + '</button>';
      }).join('') +
      '</div>';

    // Wire up in-dropdown search filtering
    document.querySelectorAll('.nsearch-dd-search').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var term = inp.value.toLowerCase();
        var items = inp.parentElement.querySelectorAll('.nsearch-dd-item');
        items.forEach(function (item) {
          item.style.display = item.textContent.toLowerCase().indexOf(term) !== -1 ? '' : 'none';
        });
      });
      // Prevent click from closing dropdown
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    // ── Year dropdown
    var years = {};
    for (var j = 0; j < pyqIdx.length; j++) { if (pyqIdx[j].year) years[pyqIdx[j].year] = true; }
    var sortedYears = Object.keys(years).sort(function (a, b) { return b - a; });
    el('nsearch-dd-year').innerHTML = '<div class="nsearch-dd-list nsearch-dd-grid">' +
      sortedYears.map(function (y) {
        return '<button class="nsearch-dd-item" data-value="' + y + '">' + y + '</button>';
      }).join('') +
    '</div>';
  }

  function toggleDropdown(filterName) {
    var ddId = 'nsearch-dd-' + filterName;
    if (openDropdown === filterName) {
      closeAllDropdowns();
      return;
    }
    closeAllDropdowns();
    el(ddId).style.display = 'block';
    el('nsearch-chip-' + filterName).classList.add('nsearch-chip--open');
    openDropdown = filterName;
  }

  function closeAllDropdowns() {
    ['college', 'branch', 'semester', 'subject', 'year'].forEach(function (f) {
      el('nsearch-dd-' + f).style.display = 'none';
      el('nsearch-chip-' + f).classList.remove('nsearch-chip--open');
    });
    openDropdown = null;
  }

  function selectFilter(filterName, value) {
    activeFilters[filterName] = value;
    closeAllDropdowns();
    updateChipLabels();
    runSearch();
  }

  function clearFilter(filterName) {
    activeFilters[filterName] = '';
    updateChipLabels();
    runSearch();
  }

  function resetAll() {
    el('nsearch-input').value = '';
    activeQuery = '';
    activeFilters = { college: '', branch: '', semester: '', subject: '', year: '' };
    updateChipLabels();
    closeAllDropdowns();
    showState('idle');
    elShow('nsearch-status', false);
    updatePills();
    updateResetBtn();
  }

  function updateChipLabels() {
    // College
    var cVal = el('nsearch-chip-college-val');
    if (activeFilters.college) {
      var col = collegeIdx.find(function (c) { return c.slug === activeFilters.college; });
      cVal.textContent = col ? col.name : activeFilters.college;
      el('nsearch-chip-college').classList.add('nsearch-chip--active');
    } else {
      cVal.textContent = '';
      el('nsearch-chip-college').classList.remove('nsearch-chip--active');
    }
    // Branch
    var bVal = el('nsearch-chip-branch-val');
    if (activeFilters.branch) {
      var brObj = subjectIdx.find(function (s) { return s.branchSlug === activeFilters.branch; });
      bVal.textContent = brObj ? brObj.branch : activeFilters.branch;
      el('nsearch-chip-branch').classList.add('nsearch-chip--active');
    } else {
      bVal.textContent = '';
      el('nsearch-chip-branch').classList.remove('nsearch-chip--active');
    }
    // Semester
    var sVal = el('nsearch-chip-semester-val');
    if (activeFilters.semester) {
      sVal.textContent = 'Sem ' + activeFilters.semester;
      el('nsearch-chip-semester').classList.add('nsearch-chip--active');
    } else {
      sVal.textContent = '';
      el('nsearch-chip-semester').classList.remove('nsearch-chip--active');
    }
    // Subject
    var subVal = el('nsearch-chip-subject-val');
    if (activeFilters.subject) {
      var subObj = subjectIdx.find(function (s) { return s.url === activeFilters.subject; });
      subVal.textContent = subObj ? subObj.name : 'Selected';
      el('nsearch-chip-subject').classList.add('nsearch-chip--active');
    } else {
      subVal.textContent = '';
      el('nsearch-chip-subject').classList.remove('nsearch-chip--active');
    }
    // Year
    var yVal = el('nsearch-chip-year-val');
    if (activeFilters.year) {
      yVal.textContent = activeFilters.year;
      el('nsearch-chip-year').classList.add('nsearch-chip--active');
    } else {
      yVal.textContent = '';
      el('nsearch-chip-year').classList.remove('nsearch-chip--active');
    }
  }

  function updateResetBtn() {
    var hasAnything = activeQuery || activeFilters.college || activeFilters.branch || activeFilters.semester || activeFilters.subject || activeFilters.year;
    elShow('nsearch-reset', !!hasAnything);
  }

  /* ── Active pills above results ────────────────────────────────── */
  function updatePills() {
    var pillsEl = el('nsearch-pills');
    var parts   = [];

    if (activeQuery) {
      parts.push(pill('Search', '"' + activeQuery + '"', function () {
        el('nsearch-input').value = '';
        runSearch();
      }));
    }
    if (activeFilters.college) {
      var col = collegeIdx.find(function (c) { return c.slug === activeFilters.college; });
      parts.push(pill('College', col ? col.name : activeFilters.college, function () { clearFilter('college'); }));
    }
    if (activeFilters.branch) {
      var brPill = subjectIdx.find(function (s) { return s.branchSlug === activeFilters.branch; });
      parts.push(pill('Branch', brPill ? brPill.branch : activeFilters.branch, function () { clearFilter('branch'); }));
    }
    if (activeFilters.semester) {
      parts.push(pill('Semester', activeFilters.semester, function () { clearFilter('semester'); }));
    }
    if (activeFilters.subject) {
      var subPill = subjectIdx.find(function (s) { return s.url === activeFilters.subject; });
      parts.push(pill('Subject', subPill ? subPill.name : 'Selected', function () { clearFilter('subject'); }));
    }
    if (activeFilters.year) {
      parts.push(pill('Year', activeFilters.year, function () { clearFilter('year'); }));
    }

    pillsEl.innerHTML = '';
    if (parts.length) {
      pillsEl.style.display = 'flex';
      parts.forEach(function (p) { pillsEl.appendChild(p); });
    } else {
      pillsEl.style.display = 'none';
    }
  }

  function pill(label, value, onRemove) {
    var span = document.createElement('span');
    span.className = 'nsearch-pill';
    span.innerHTML = '<span class="nsearch-pill-label">' + esc(label) + ':</span> ' + esc(value) + ' <button aria-label="Remove"><i class="fas fa-times"></i></button>';
    span.querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      onRemove();
    });
    return span;
  }

  /* ═══════════════════════════════════════════════════════════════════
     RECENT SEARCHES
     ═══════════════════════════════════════════════════════════════════ */

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
  }

  function saveRecent(q) {
    var list = getRecent().filter(function (r) { return r !== q; });
    list.unshift(q);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* noop */ }
  }

  function renderRecentSearches() {
    var list = getRecent();
    var wrap = el('nsearch-recent');
    var cont = el('nsearch-recent-list');
    if (!list.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    cont.innerHTML = list.map(function (q) {
      return '<button class="nsearch-recent-btn" data-query="' + esc(q) + '"><i class="fas fa-history"></i> ' + esc(q) + '</button>';
    }).join('');
  }

  function clearRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch (e) { /* noop */ }
    el('nsearch-recent').style.display = 'none';
  }

  /* ═══════════════════════════════════════════════════════════════════
     URL PARAMETERS  (works with header search bar ?q=…)
     ═══════════════════════════════════════════════════════════════════ */

  function checkURLParams() {
    var params = new URLSearchParams(window.location.search);
    var q      = params.get('q') || params.get('query') || '';
    var c      = params.get('college')  || '';
    var br     = params.get('branch')   || '';
    var s      = params.get('semester') || '';
    var sub    = params.get('subject')  || '';
    var y      = params.get('year')     || '';

    if (q)   el('nsearch-input').value = q;
    if (c)   activeFilters.college  = c;
    if (br)  activeFilters.branch   = br;
    if (s)   activeFilters.semester = s;
    if (sub) activeFilters.subject  = sub;
    if (y)   activeFilters.year     = y;
    updateChipLabels();

    if (q || c || br || s || sub || y) {
      setTimeout(runSearch, 120);   // tiny delay for COLLEGE_DATA to be ready
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  function showState(state) {
    ['idle', 'loading', 'results', 'empty'].forEach(function (s) {
      elShow('nsearch-' + s, s === state);
    });
  }

  function el(id)      { return document.getElementById(id); }
  function elShow(id, show) {
    var e = document.getElementById(id);
    if (e) e.style.display = show ? (e.dataset.display || 'block') : 'none';
  }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var key in src) { if (src.hasOwnProperty(key)) target[key] = src[key]; }
    }
    return target;
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     EVENT WIRING
     ═══════════════════════════════════════════════════════════════════ */

  function setup() {
    if (!el('nsearch-input')) return;  // not on search page

    buildIndex();
    renderFilterDropdowns();
    renderRecentSearches();

    var input = el('nsearch-input');
    var clearBtn = el('nsearch-clear');

    // Live search
    var debouncedSearch = debounce(runSearch, DEBOUNCE_MS);
    input.addEventListener('input', function () {
      clearBtn.style.display = input.value ? 'flex' : 'none';
      el('nsearch-kbd').style.display = input.value ? 'none' : 'inline-block';
      debouncedSearch();
    });

    // Clear button
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.style.display = 'none';
      el('nsearch-kbd').style.display = 'inline-block';
      input.focus();
      runSearch();
    });

    // Enter key triggers instant search
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSearch();
      }
    });

    // "/" keyboard shortcut to focus search
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input && !isEditing()) {
        e.preventDefault();
        input.focus();
      }
    });

    // Chip click → toggle dropdown
    ['college', 'branch', 'semester', 'subject', 'year'].forEach(function (f) {
      el('nsearch-chip-' + f).addEventListener('click', function () { toggleDropdown(f); });
    });

    // Dropdown item selection — delegated
    ['college', 'branch', 'semester', 'subject', 'year'].forEach(function (f) {
      el('nsearch-dd-' + f).addEventListener('click', function (e) {
        var btn = e.target.closest('.nsearch-dd-item');
        if (!btn) return;
        var val = btn.getAttribute('data-value');
        // Toggle off if same value
        if (activeFilters[f] === val) { clearFilter(f); } else { selectFilter(f, val); }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nsearch-chips') && !e.target.closest('.nsearch-dropdown-anchor')) {
        closeAllDropdowns();
      }
    });

    // Reset
    el('nsearch-reset').addEventListener('click', resetAll);
    el('nsearch-empty-reset').addEventListener('click', resetAll);

    // Recent search click
    el('nsearch-recent-list').addEventListener('click', function (e) {
      var btn = e.target.closest('.nsearch-recent-btn');
      if (!btn) return;
      input.value = btn.getAttribute('data-query');
      clearBtn.style.display = 'flex';
      el('nsearch-kbd').style.display = 'none';
      runSearch();
    });

    // Clear recent
    el('nsearch-clear-recent').addEventListener('click', clearRecent);

    // Popular / quick-access buttons
    document.querySelectorAll('.nsearch-popular-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-query') || '';
        var c = btn.getAttribute('data-college') || '';
        if (q) input.value = q;
        if (c) activeFilters.college = c;
        clearBtn.style.display = (q || input.value) ? 'flex' : 'none';
        el('nsearch-kbd').style.display = (q || input.value) ? 'none' : 'inline-block';
        updateChipLabels();
        runSearch();
      });
    });

    // Load more
    el('nsearch-more').addEventListener('click', loadMore);

    // URL params (header search bar ?q=…)
    checkURLParams();

    // Focus input on page load if no params triggered search
    if (!activeQuery && !activeFilters.college && !activeFilters.branch && !activeFilters.semester && !activeFilters.subject && !activeFilters.year) {
      input.focus();
    }
  }

  function isEditing() {
    var tag = (document.activeElement || {}).tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  /* ─── Boot ────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

})();
