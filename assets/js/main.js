document.addEventListener('DOMContentLoaded', function() {
  
  // Toggle mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', function() {
      siteNav.classList.toggle('active');
    });
  }
  
  // Toggle search bar
  const searchToggle = document.querySelector('.search-toggle');
  const searchContainer = document.querySelector('.search-container');
  
  if (searchToggle && searchContainer) {
    searchToggle.addEventListener('click', function() {
      searchContainer.classList.toggle('active');
      if (searchContainer.classList.contains('active')) {
        document.querySelector('#search-input').focus();
      }
    });
  }
  
  // Toggle dark mode
  const themeToggle = document.querySelector('.theme-toggle');
  const html = document.documentElement; // Use <html> for dark-theme class
  
  // Update toggle icon based on current theme
  if (html.classList.contains('dark-theme')) {
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
  } else {
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      html.classList.toggle('dark-theme');
      
      let theme = 'light';
      if (html.classList.contains('dark-theme')) {
        theme = 'dark';
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      }
      
      localStorage.setItem('theme', theme);
    });
  }
  
  // Subject filtering
  const filterButtons = document.querySelectorAll('.filter-btn');
  const subjectCards = document.querySelectorAll('.subject-card');
  
  if (filterButtons.length > 0 && subjectCards.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        const filter = this.getAttribute('data-filter');
        
        subjectCards.forEach(card => {
          if (filter === 'all') {
            card.style.display = 'block';
          } else {
            if (card.getAttribute('data-category') === filter) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          }
        });
      });
    });
  }

  // ============================================== [Search] [Animation] [PDF Viewer] =======================
  
  // Initialize search functionality
  initializeEnhancedSearch();
  
  // Initialize card animations
  initializeCardAnimations();
  
  // Initialize college cards scroll animation - DISABLED for better UX
  // initializeCollegeCardsAnimation();
  
  // Initialize advanced filtering
  initializeAdvancedFiltering();
  
  // Initialize scroll-based navigation
  setupScrollNavigation();
  
  // Initialize PDF viewer if on a PDF viewer page
  if (document.querySelector('.pdf-viewer-container')) {
    initializePDFViewer();
  }
  
  // Initialize syllabus documentation feature
  initializeSyllabusModal();
  
  // Initialize subject documentation feature
  initializeSubjectDocModal();
  
  // Initialize PYQ documentation feature
  initializePyqDocModal();
});

// ============================================== [PDF VIEWER FUNCTIONALITY] =======================

let currentViewer = 'iframe';
let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
let scale = 5.0; // Set to 500% by default for PDF.js
let rotation = 0;

// Mobile scrolling viewer variables
let mobilePdfDoc = null;
let mobileScale = 3.0; // Set to 300% (maximum) by default for mobile
let mobileRenderedPages = new Set();

// PDF Viewer initialization
function initializePDFViewer() {
  // Detect device type
  const isMobile = window.innerWidth <= 768;
  
  // Set up iframe error handling
  const iframe = document.getElementById('pdf-iframe');
  if (iframe) {
    iframe.addEventListener('error', function() {
      showIframeFallback();
    });
    
    // Check if iframe loaded successfully
    iframe.addEventListener('load', function() {
      hideLoading();
    });
  }
  
  // Initialize mobile scrolling viewer for mobile devices
  if (isMobile) {
    initializeMobileScrollViewer();
  }
  
  // Set up PDF.js viewer (secondary viewer)
  initializePDFJS();
  
  // Set up viewer switching
  setupViewerSwitching();
  
  // Set up fullscreen functionality
  setupFullscreen();
  
  // Set up print functionality
  setupPrint();
  
  // Hide loading after a delay
  setTimeout(hideLoading, 2000);
}

function switchViewer(viewerType) {
  currentViewer = viewerType;
  
  // Update tabs
  document.querySelectorAll('.viewer-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetTab = document.querySelector(`[data-viewer="${viewerType}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Update viewer content
  document.querySelectorAll('.viewer-content').forEach(content => {
    content.classList.remove('active');
  });
  const targetViewer = document.getElementById(`${viewerType}-viewer`);
  if (targetViewer) {
    targetViewer.classList.add('active');
  }
  
  // Update description
  const descriptions = {
    iframe: window.innerWidth <= 768 
      ? 'Mobile-optimized scrolling PDF viewer with touch-friendly controls'
      : 'Default browser PDF viewer with standard controls',
    pdfjs: 'Advanced PDF.js viewer with enhanced features and better mobile support'
  };
  
  const descElement = document.getElementById('viewer-description');
  if (descElement) {
    descElement.innerHTML = 
      `<i class="fas fa-info-circle"></i> ${descriptions[viewerType]}`;
  }
  
  // If switching to PDF.js, load the PDF with 500% zoom
  if (viewerType === 'pdfjs' && !pdfDoc) {
    scale = 5.0; // Set to 500% zoom
    loadPDFJS();
  } else if (viewerType === 'pdfjs' && pdfDoc) {
    // If PDF already loaded, just update zoom to 500%
    scale = 5.0;
    updateZoomSelect();
    queueRenderPage(pageNum);
  }
}

function setupViewerSwitching() {
  // Keep iframe as default for all devices
  // No auto-switching behavior
}

function showIframeFallback() {
  const fallback = document.querySelector('.iframe-fallback');
  if (fallback) {
    fallback.style.display = 'flex';
  }
}

function hideLoading() {
  const loading = document.getElementById('pdf-loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

function showError(message) {
  const errorDiv = document.getElementById('pdf-error');
  if (errorDiv) {
    const errorP = errorDiv.querySelector('p');
    if (errorP) {
      errorP.textContent = message;
    }
    errorDiv.style.display = 'flex';
  }
}

// PDF.js functionality
function initializePDFJS() {
  // Set up PDF.js controls
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageNumInput = document.getElementById('page-num');
  const zoomSelect = document.getElementById('zoom-select');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const rotateLeftBtn = document.getElementById('rotate-left');
  const rotateRightBtn = document.getElementById('rotate-right');
  
  if (prevBtn) prevBtn.addEventListener('click', onPrevPage);
  if (nextBtn) nextBtn.addEventListener('click', onNextPage);
  if (pageNumInput) {
    pageNumInput.addEventListener('change', function() {
      const pageNumber = parseInt(this.value);
      if (pageNumber > 0 && pageNumber <= (pdfDoc ? pdfDoc.numPages : 1)) {
        pageNum = pageNumber;
        queueRenderPage(pageNum);
      }
    });
  }
  
  if (zoomSelect) {
    zoomSelect.addEventListener('change', function() {
      handleZoomChange(this.value);
    });
  }
  
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => changeZoom(1.25));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => changeZoom(0.8));
  if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => rotatePages(-90));
  if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => rotatePages(90));
}

function loadPDFJS() {
  const loading = document.querySelector('.pdfjs-loading');
  if (loading) loading.style.display = 'block';
  
  // Get PDF URL from the page
  const iframe = document.getElementById('pdf-iframe');
  if (!iframe) return;
  
  const pdfUrl = iframe.src.split('#')[0];
  
  // Check if PDF.js is available
  if (typeof pdfjsLib === 'undefined') {
    console.warn('PDF.js library not loaded');
    if (loading) loading.style.display = 'none';
    return;
  }
  
  // Set default zoom to 500%
  scale = 5.0;
  
  pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    const pageCount = document.getElementById('page-count');
    if (pageCount) {
      pageCount.textContent = pdfDoc.numPages;
    }
    
    // Set max value for page input
    const pageNumInput = document.getElementById('page-num');
    if (pageNumInput) {
      pageNumInput.max = pdfDoc.numPages;
    }
    
    // Set zoom select to 500%
    updateZoomSelect();
    
    // Render first page
    renderPage(pageNum);
    
    if (loading) loading.style.display = 'none';
  }).catch(err => {
    console.error('Error loading PDF:', err);
    showError('Failed to load PDF with PDF.js viewer');
    if (loading) loading.style.display = 'none';
  });
}

function updateZoomSelect() {
  const zoomSelect = document.getElementById('zoom-select');
  if (zoomSelect) {
    // Check if 500% option exists, if not create it
    let option500 = zoomSelect.querySelector('option[value="5"]');
    if (!option500) {
      option500 = document.createElement('option');
      option500.value = '5';
      option500.textContent = '500%';
      zoomSelect.appendChild(option500);
    }
    
    // Set to 500%
    zoomSelect.value = '5';
  }
}

function renderPage(num) {
  if (!pdfDoc) return;
  
  pageIsRendering = true;
  
  pdfDoc.getPage(num).then(page => {
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculate scale based on container width
    const container = document.querySelector('.pdfjs-content');
    if (!container) return;
    
    const containerWidth = container.clientWidth - 40; // Account for padding
    const viewport = page.getViewport({ scale: 1, rotation: rotation });
    
    let calculatedScale = scale;
    const zoomSelect = document.getElementById('zoom-select');
    if (zoomSelect) {
      if (zoomSelect.value === 'auto') {
        calculatedScale = containerWidth / viewport.width;
      } else if (zoomSelect.value === 'page-width') {
        calculatedScale = containerWidth / viewport.width;
      }
    }
    
    const scaledViewport = page.getViewport({ scale: calculatedScale, rotation: rotation });
    
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport
    };
    
    page.render(renderContext).promise.then(() => {
      pageIsRendering = false;
      
      if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
      }
      
      // Update page number in input
      const pageNumInput = document.getElementById('page-num');
      if (pageNumInput) {
        pageNumInput.value = num;
      }
      
      // Update navigation buttons
      updateNavigationButtons();
    });
  });
}

function queueRenderPage(num) {
  if (pageIsRendering) {
    pageNumIsPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  if (prevBtn) prevBtn.disabled = pageNum <= 1;
  if (nextBtn) nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
}

function handleZoomChange(zoomValue) {
  switch(zoomValue) {
    case 'auto':
    case 'page-width':
      // These are calculated in renderPage
      break;
    case 'page-actual':
      scale = 1;
      break;
    default:
      scale = parseFloat(zoomValue);
  }
  
  if (pdfDoc) {
    queueRenderPage(pageNum);
  }
}

function changeZoom(factor) {
  scale *= factor;
  scale = Math.max(0.25, Math.min(5, scale)); // Limit zoom between 25% and 500%
  
  // Update select to show custom zoom
  const zoomSelect = document.getElementById('zoom-select');
  if (zoomSelect) {
    const percentage = Math.round(scale * 100) + '%';
    zoomSelect.value = scale.toString();
    
    // If this isn't a standard zoom level, we might need to handle it differently
    if (!zoomSelect.value) {
      // Create a temporary option for custom zoom
      const existingCustom = zoomSelect.querySelector('[data-custom]');
      if (existingCustom) existingCustom.remove();
      
      const customOption = document.createElement('option');
      customOption.value = scale.toString();
      customOption.textContent = percentage;
      customOption.setAttribute('data-custom', 'true');
      customOption.selected = true;
      zoomSelect.appendChild(customOption);
    }
  }
  
  if (pdfDoc) {
    queueRenderPage(pageNum);
  }
}

function rotatePages(degrees) {
  rotation += degrees;
  rotation = rotation % 360;
  
  if (pdfDoc) {
    queueRenderPage(pageNum);
  }
}

function setupFullscreen() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const pdfContainer = document.querySelector('.pdf-viewer-container');
  
  if (fullscreenBtn && pdfContainer) {
    fullscreenBtn.addEventListener('click', function() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        const targetContainer = currentViewer === 'iframe' ? pdfContainer : document.querySelector('.pdfjs-container');
        if (targetContainer) {
          targetContainer.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
          });
        }
      }
    });
  }
}

function setupPrint() {
  const printBtn = document.getElementById('print-btn');
  
  if (printBtn) {
    printBtn.addEventListener('click', function() {
      if (currentViewer === 'iframe') {
        const iframe = document.getElementById('pdf-iframe');
        if (iframe) {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            // Fallback: open PDF in new window for printing
            window.open(iframe.src, '_blank');
          }
        }
      } else {
        // For PDF.js viewer, open PDF in new window for printing
        const iframe = document.getElementById('pdf-iframe');
        if (iframe) {
          const pdfUrl = iframe.src.split('#')[0];
          window.open(pdfUrl, '_blank');
        }
      }
    });
  }
}

// ============================================== [MOBILE SCROLLING VIEWER] =======================

function initializeMobileScrollViewer() {
  const container = document.getElementById('mobile-scroll-container');
  if (!container) return;
  
  // Get PDF URL
  const iframe = document.getElementById('pdf-iframe');
  if (!iframe) return;
  
  const pdfUrl = iframe.src.split('#')[0];
  
  // Check if PDF.js is available
  if (typeof pdfjsLib === 'undefined') {
    console.warn('PDF.js library not loaded for mobile viewer');
    return;
  }
  
  // Show loading
  const loading = container.querySelector('.mobile-pdf-loading');
  if (loading) loading.style.display = 'flex';
  
  // Load PDF
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    mobilePdfDoc = pdf;
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    // Render all pages
    renderAllMobilePages();
    
  }).catch(err => {
    console.error('Error loading PDF for mobile viewer:', err);
    if (loading) {
      loading.innerHTML = '<p>Error loading PDF. Please try downloading instead.</p>';
    }
  });
}

function renderAllMobilePages() {
  if (!mobilePdfDoc) return;
  
  const container = document.getElementById('mobile-scroll-container');
  if (!container) return;
  
  // Clear existing loading message
  const loading = container.querySelector('.mobile-pdf-loading');
  if (loading) loading.remove();
  
  const numPages = mobilePdfDoc.numPages;
  
  // Create canvases for all pages
  for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'mobile-page-container';
    pageContainer.dataset.pageNumber = pageNumber;
    
    const canvas = document.createElement('canvas');
    canvas.id = `mobile-canvas-${pageNumber}`;
    canvas.className = 'mobile-pdf-canvas';
    
    pageContainer.appendChild(canvas);
    container.appendChild(pageContainer);
  }
  
  // Render first 3 pages immediately for quick initial display
  for (let pageNumber = 1; pageNumber <= Math.min(3, numPages); pageNumber++) {
    renderMobilePage(pageNumber);
  }
  
  // Render remaining pages with a slight delay to improve initial load
  if (numPages > 3) {
    setTimeout(() => {
      for (let pageNumber = 4; pageNumber <= numPages; pageNumber++) {
        renderMobilePage(pageNumber);
      }
    }, 500);
  }
}

function renderMobilePage(pageNumber) {
  if (!mobilePdfDoc) return;
  
  mobilePdfDoc.getPage(pageNumber).then(page => {
    const canvas = document.getElementById(`mobile-canvas-${pageNumber}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculate scale based on container width for mobile
    const container = document.getElementById('mobile-scroll-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth - 20; // Account for padding
    const viewport = page.getViewport({ scale: 1 });
    
    // Scale to fit width of container
    const calculatedScale = (containerWidth / viewport.width) * mobileScale;
    const scaledViewport = page.getViewport({ scale: calculatedScale });
    
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport
    };
    
    page.render(renderContext).promise.then(() => {
      mobileRenderedPages.add(pageNumber);
    });
  });
}

// ============================================== [END MOBILE SCROLLING VIEWER] =======================

// ==============================================  [SEARCH FUNCTIONALITY] =======================

let allPYQs = [];
let filteredPYQs = [];  // Separate array for filtered results
let searchResults = [];
let currentResultsPage = 1;
let resultsPerPage = 15;
let currentView = 'list';
let filtersVisible = false;
let availableSubjects = {};
let availableYears = new Set();

function initializeEnhancedSearch() {
  // Load PYQ data from your existing data structure
  loadPYQData();
  
  // Show filters on load if we're on the search page
  if (window.location.pathname.includes('/search')) {
    setTimeout(() => {
      const filtersContent = document.getElementById('filters-content');
      if (filtersContent) filtersContent.style.display = 'block';
      filtersVisible = true;
      const toggleBtn = document.querySelector('.filters-toggle');
      if (toggleBtn) {
        const toggleText = toggleBtn.querySelector('.toggle-text');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        if (toggleText) toggleText.textContent = 'Hide Filters';
        if (toggleIcon) toggleIcon.textContent = '▲';
      }
    }, 100);
  }
  
  // Check for URL parameters
  checkURLParameters();
  
  // Set up form submission
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      performAdvancedSearch();
    });
  }
  
  // Set up real-time search
  const mainSearch = document.getElementById('main-search');
  if (mainSearch) {
    mainSearch.addEventListener('input', debounce(function() {
      updateActiveFilters();
    }, 500));
  }
  
  // Set up filter change events
  setupFilterChangeEvents();
}

function setupFilterChangeEvents() {
  const collegeFilter = document.getElementById('college-filter');
  const branchFilter = document.getElementById('branch-filter');
  const semesterFilter = document.getElementById('semester-filter');
  const subjectFilter = document.getElementById('subject-filter');
  const yearFilter = document.getElementById('year-filter');
  
  if (collegeFilter) collegeFilter.addEventListener('change', () => updateDependentFilters('college'));
  if (branchFilter) branchFilter.addEventListener('change', () => updateDependentFilters('branch'));
  if (semesterFilter) semesterFilter.addEventListener('change', () => updateDependentFilters('semester'));
  if (subjectFilter) subjectFilter.addEventListener('change', updateActiveFilters);
  if (yearFilter) yearFilter.addEventListener('change', updateActiveFilters);
}

// Use pre-loaded global data from college-data.js
function loadPYQData() {
  allPYQs = [];
  availableSubjects = {};
  availableYears = new Set();
  
  try {
    // Use the globally available data from window.COLLEGE_DATA
    const collegeData = window.COLLEGE_DATA;
    // Get the baseurl from a global variable or default to empty string
    const baseUrl = '';
    
    if (!collegeData || !collegeData.colleges) {
      console.warn('Global college data not found. Make sure college-data.js is loaded before main.js');
      return;
    }
    
    // Process the global data with your specific structure
    collegeData.colleges.forEach(college => {
      if (!college.branches || !Array.isArray(college.branches)) return;
      
      college.branches.forEach(branch => {
        if (!branch.semesters || !Array.isArray(branch.semesters)) return;
        
        branch.semesters.forEach(semester => {
          if (!semester.subjects || !Array.isArray(semester.subjects)) return;
          
          semester.subjects.forEach(subject => {
            if (!subject.pyqs || !Array.isArray(subject.pyqs)) return;
            
            // Store subject for filter options
            const subjectKey = `${college.id}-${branch.id}-${semester.id}`;
            if (!availableSubjects[subjectKey]) {
              availableSubjects[subjectKey] = [];
            }
            
            availableSubjects[subjectKey].push({
              id: subject.id,
              name: subject.name
            });
            
            subject.pyqs.forEach(pyq => {
              // Ensure slugs are properly defined
              const collegeSlug = escapeJavaScript(college.slug || college.id || '');
              const branchSlug = escapeJavaScript(branch.slug || branch.id || '');
              const semesterSlug = escapeJavaScript(semester.slug || semester.id || '');
              const subjectSlug = escapeJavaScript(subject.slug || subject.id || '');
              
              // Store year for filter options
              if (pyq.year) {
                availableYears.add(parseInt(pyq.year));
              }
              
              // Process each PYQ and add to searchable array
              allPYQs.push({
                title: escapeJavaScript(subject.name || ''),
                college: escapeJavaScript(college.name || ''),
                collegeId: escapeJavaScript(college.id || ''),
                collegeSlug: collegeSlug,
                branch: escapeJavaScript(branch.name || ''),
                branchId: escapeJavaScript(branch.id || ''),
                branchSlug: branchSlug,
                branchIcon: escapeJavaScript(branch.icon || 'book'),
                semester: semester.number || '',
                semesterId: escapeJavaScript(semester.id || ''),
                semesterSlug: semesterSlug,
                subject: escapeJavaScript(subject.name || ''),
                subjectId: escapeJavaScript(subject.id || ''),
                subjectSlug: subjectSlug,
                subjectDescription: escapeJavaScript(subject.description || ''),
                subjectIcon: escapeJavaScript(subject.icon || 'book'),
                year: parseInt(pyq.year) || 0,
                file: escapeJavaScript(pyq.file || ''),
                pyqId: escapeJavaScript(pyq.id || ''),
                pages: parseInt(pyq.pages) || 0,
                pyqTitle: escapeJavaScript(pyq.title || ''),
                difficulty: escapeJavaScript(pyq.difficulty || ''),
                examType: escapeJavaScript(pyq.exam_type || ''),
                // Build URLs for navigation with trailing slash
                url: `/colleges/${collegeSlug}/${branchSlug}/${semesterSlug}/${subjectSlug}/`,
                pdfUrl: `/pdf-viewer/${collegeSlug}/${branchSlug}/${semesterSlug}/${subjectSlug}/${pyq.id}/`,
                downloadUrl: `/assets/pdfs/${pyq.file}`
              });
            });
          });
        });
      });
    });
    
    console.log(`✅ Loaded ${allPYQs.length} PYQs from ${collegeData.colleges.length} colleges (Global Data Store)`);
    console.log(`🔍 Found ${availableYears.size} unique years and ${Object.keys(availableSubjects).length} subject groups`);
    
    // Log some sample data for debugging
    if (allPYQs.length > 0) {
      console.log('📄 Sample PYQ data:', allPYQs[0]);
      console.log('🌐 Generated subject URL:', allPYQs[0].url);
    }
    
    // Populate year filter
    populateYearFilter();
    
  } catch (error) {
    console.error('❌ Error loading PYQ data from global store:', error);
    allPYQs = [];
  }
}

// Update dependent filters based on college, branch, semester selections
function updateDependentFilters(changedFilter) {
  const collegeFilter = document.getElementById('college-filter');
  const branchFilter = document.getElementById('branch-filter');
  const semesterFilter = document.getElementById('semester-filter');
  const subjectFilter = document.getElementById('subject-filter');
  
  if (!collegeFilter || !branchFilter || !semesterFilter || !subjectFilter) return;
  
  const collegeValue = collegeFilter.value;
  const branchValue = branchFilter.value;
  const semesterValue = semesterFilter.value;
  
  // Clear subject filter options and add default
  subjectFilter.innerHTML = '<option value="">All Subjects</option>';
  
  // If college, branch, and semester are selected, populate subjects
  if (changedFilter === 'college' || changedFilter === 'branch' || changedFilter === 'semester') {
    // When college changes, filter available branches
    if (changedFilter === 'college') {
      // Reset branch and semester filters
      branchFilter.innerHTML = '<option value="">All Branches</option>';
      semesterFilter.innerHTML = '<option value="">All Semesters</option>';
      
      if (collegeValue) {
        // Find unique branches for this college
        const branches = new Set();
        allPYQs.forEach(pyq => {
          if (pyq.collegeSlug === collegeValue || pyq.collegeId === collegeValue) {
            branches.add(pyq.branchId);
          }
        });
        
        // Add branch options
        branches.forEach(branchId => {
          const branchName = allPYQs.find(pyq => pyq.branchId === branchId)?.branch || branchId;
          const option = document.createElement('option');
          option.value = branchId;
          option.textContent = branchName;
          branchFilter.appendChild(option);
        });
      }
    }
    
    // When branch changes, filter available semesters
    if (changedFilter === 'college' || changedFilter === 'branch') {
      // Reset semester filter
      semesterFilter.innerHTML = '<option value="">All Semesters</option>';
      
      if (branchValue) {
        // Find unique semesters for this branch
        const semesters = new Set();
        allPYQs.forEach(pyq => {
          if ((!collegeValue || pyq.collegeSlug === collegeValue || pyq.collegeId === collegeValue) && 
              (pyq.branchSlug === branchValue || pyq.branchId === branchValue)) {
            semesters.add(pyq.semesterId);
          }
        });
        
        // Add semester options
        const semesterArray = Array.from(semesters);
        semesterArray.sort((a, b) => {
          const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
          const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
          return numA - numB;
        });
        
        semesterArray.forEach(semesterId => {
          const semesterPYQ = allPYQs.find(pyq => pyq.semesterId === semesterId);
          const semesterName = semesterPYQ ? `Semester ${semesterPYQ.semester}` : semesterId;
          const option = document.createElement('option');
          option.value = semesterId;
          option.textContent = semesterName;
          semesterFilter.appendChild(option);
        });
      }
    }
    
    // Populate subject filter based on college, branch, and semester
    if (collegeValue && branchValue && semesterValue) {
      const subjectKey = `${collegeValue}-${branchValue}-${semesterValue}`;
      const subjects = availableSubjects[subjectKey] || [];
      
      subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        subjectFilter.appendChild(option);
      });
    }
  }
  
  // Update active filters display
  updateActiveFilters();
}

// Populate year filter with years from data
function populateYearFilter() {
  const yearFilter = document.getElementById('year-filter');
  if (!yearFilter) return;
  
  // Clear and add default option
  yearFilter.innerHTML = '<option value="">All Years</option>';
  
  // Add year options sorted newest first
  const sortedYears = Array.from(availableYears).sort((a, b) => b - a);
  sortedYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year.toString();
    option.textContent = year.toString();
    yearFilter.appendChild(option);
  });
}

// Helper function to safely escape JavaScript strings
function escapeJavaScript(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/['"\\]/g, '\\$&')
            .replace(/\r?\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
}

function performAdvancedSearch() {
  const startTime = Date.now();
  
  showSearchState('loading');
  
  // Get search parameters with null checks
  const query = document.getElementById('main-search')?.value?.toLowerCase().trim() || '';
  const college = document.getElementById('college-filter')?.value || '';
  const branch = document.getElementById('branch-filter')?.value || '';
  const semester = document.getElementById('semester-filter')?.value || '';
  const subject = document.getElementById('subject-filter')?.value || '';
  const year = document.getElementById('year-filter')?.value || '';
  const sortBy = document.getElementById('sort-by')?.value || 'relevance';
  
  // Validate that we have data to search
  if (!Array.isArray(allPYQs) || allPYQs.length === 0) {
    console.warn('⚠️ No PYQ data available for search');
    showSearchState('no-results');
    return;
  }
  
  // Reset pagination
  currentResultsPage = 1;
  
  // Filter PYQs with comprehensive matching
  searchResults = allPYQs.filter(pyq => {
    try {
      // Text-based search across multiple fields
      const matchesQuery = !query || 
        (pyq.title && pyq.title.toLowerCase().includes(query)) ||
        (pyq.college && pyq.college.toLowerCase().includes(query)) ||
        (pyq.branch && pyq.branch.toLowerCase().includes(query)) ||
        (pyq.subject && pyq.subject.toLowerCase().includes(query)) ||
        (pyq.subjectDescription && pyq.subjectDescription.toLowerCase().includes(query)) ||
        (pyq.pyqTitle && pyq.pyqTitle.toLowerCase().includes(query)) ||
        (pyq.difficulty && pyq.difficulty.toLowerCase().includes(query)) ||
        (pyq.examType && pyq.examType.toLowerCase().includes(query));
      
      // Filter-based matching
      const matchesCollege = !college || pyq.collegeSlug === college || pyq.collegeId === college;
      const matchesBranch = !branch || pyq.branchSlug === branch || pyq.branchId === branch;
      const matchesSemester = !semester || pyq.semesterSlug === semester || pyq.semesterId === semester;
      const matchesSubject = !subject || pyq.subjectSlug === subject || pyq.subjectId === subject;
      const matchesYear = !year || pyq.year.toString() === year;
      
      return matchesQuery && matchesCollege && matchesBranch && matchesSemester && matchesSubject && matchesYear;
    } catch (error) {
      console.warn('⚠️ Error filtering PYQ:', pyq, error);
      return false;
    }
  });
  
  // Store filtered results
  filteredPYQs = [...searchResults];
  
  // Sort results
  sortSearchResults(sortBy);
  
  const searchTime = Date.now() - startTime;
  
  // Display results with a slight delay for better UX
  setTimeout(() => {
    displaySearchResults(searchTime);
    updateActiveFilters();
  }, 300);
}

function sortSearchResults(sortBy) {
  try {
    searchResults.sort((a, b) => {
      switch(sortBy) {
        case 'title':
          return (a.subject || '').localeCompare(b.subject || '');
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'college':
          return (a.college || '').localeCompare(b.college || '');
        case 'branch':
          return (a.branch || '').localeCompare(b.branch || '');
        case 'semester':
          return (a.semester || 0) - (a.semester || 0);
        case 'relevance':
        default:
          return 0; // Keep original order for relevance
      }
    });
  } catch (error) {
    console.warn('⚠️ Error sorting search results:', error);
  }
}

function displaySearchResults(searchTime) {
  const resultsCount = searchResults.length;
  
  // Update search status
  const resultsCountEl = document.getElementById('results-count');
  const searchTimeEl = document.getElementById('search-time');
  
  if (resultsCountEl) {
    resultsCountEl.textContent = `${resultsCount} PYQ${resultsCount !== 1 ? 's' : ''} found`;
  }
  
  if (searchTimeEl) {
    searchTimeEl.textContent = `(${searchTime}ms)`;
  }
  
  // Show search status
  const searchStatus = document.getElementById('search-status');
  if (searchStatus) {
    searchStatus.style.display = 'flex';
  }
  
  if (resultsCount === 0) {
    showSearchState('no-results');
    return;
  }
  
  // Pagination
  const paginationControls = document.getElementById('pagination-controls');
  const displayResults = searchResults.slice(0, resultsPerPage);
  
  if (paginationControls) {
    if (searchResults.length > resultsPerPage) {
      paginationControls.style.display = 'block';
    } else {
      paginationControls.style.display = 'none';
    }
  }
  
  // Generate results HTML with error handling
  const resultsList = document.getElementById('results-list');
  if (resultsList) {
    try {
      resultsList.innerHTML = displayResults.map(pyq => createPYQResultHTML(pyq)).join('');
    } catch (error) {
      console.error('❌ Error displaying search results:', error);
      resultsList.innerHTML = '<p class="error-message">Error displaying search results. Please try again.</p>';
    }
  }
  
  showSearchState('results');
}

function loadMoreResults() {
  // Calculate next page of results
  const startIndex = currentResultsPage * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const moreResults = searchResults.slice(startIndex, endIndex);
  
  if (moreResults.length > 0) {
    currentResultsPage++;
    
    // Add new results to existing list
    const resultsList = document.getElementById('results-list');
    if (resultsList) {
      const newResultsHTML = moreResults.map(pyq => createPYQResultHTML(pyq)).join('');
      resultsList.innerHTML += newResultsHTML;
    }
    
    // Hide pagination if no more results
    if (endIndex >= searchResults.length) {
      const paginationControls = document.getElementById('pagination-controls');
      if (paginationControls) {
        paginationControls.style.display = 'none';
      }
    }
  }
}

function createPYQResultHTML(pyq) {
  // Safely escape and validate all data for HTML output
  const subject = escapeHTML(pyq.subject || 'Unknown Subject');
  const college = escapeHTML(pyq.college || 'Unknown College');
  const branch = escapeHTML(pyq.branch || 'Unknown Branch');
  const semester = pyq.semester || 'Unknown';
  const year = pyq.year || 'Unknown';
  const pages = pyq.pages || 'Unknown';
  const description = escapeHTML(pyq.subjectDescription || '');
  const pyqTitle = escapeHTML(pyq.pyqTitle || pyq.subject || 'Unknown');
  const difficulty = escapeHTML(pyq.difficulty || '');
  const examType = escapeHTML(pyq.examType || '');
  const url = pyq.url || '#';
  const pdfUrl = pyq.pdfUrl || '#';
  const downloadUrl = pyq.downloadUrl || '#';
  const branchIcon = pyq.branchIcon || 'book';
  const subjectIcon = pyq.subjectIcon || 'book-open';
  
  return `
    <div class="search-result-item pyq-result-card" 
         data-college="${pyq.collegeId}" 
         data-branch="${pyq.branchId}" 
         data-semester="${pyq.semesterId}" 
         data-subject="${pyq.subjectId}" 
         data-year="${pyq.year}">
      <div class="result-header">
        <div class="result-icon">
          <i class="fas fa-${branchIcon}" title="${branch}"></i>
        </div>
        <div class="result-meta">
          <h3 class="result-title">
            <a href="${url}" title="View ${subject} details">${pyqTitle}</a>
          </h3>
          <div class="result-info">
            <span class="result-college" title="College">
              <i class="fas fa-university"></i> ${college}
            </span>
            <span class="result-branch" title="Branch">
              <i class="fas fa-code-branch"></i> ${branch}
            </span>
            <span class="result-semester" title="Semester">
              <i class="fas fa-calendar"></i> Semester ${semester}
            </span>
            <span class="result-year" title="Year">
              <i class="fas fa-calendar-alt"></i> ${year}
            </span>
            
            ${examType ? `<span class="result-exam-type" title="Exam Type"><i class="fas fa-clipboard-check"></i> ${examType}</span>` : ''}
            ${difficulty ? `<span class="result-difficulty" title="Difficulty"><i class="fas fa-signal"></i> ${difficulty}</span>` : ''}
          </div>
          ${description ? `<div class="result-description">${description}</div>` : ''}
        </div>
        <div class="result-actions">
          <a href="${url}" class="btn btn-primary btn-small" title="View subject page">
            <i class="fas fa-eye"></i> View Subject
          </a>
          <a href="${pdfUrl}" class="btn btn-outline btn-small" title="View PDF file">
            <i class="fas fa-file-pdf"></i> View PDF
          </a>
        </div>
      </div>
    </div>
  `;
}

// Helper function to escape HTML
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showSearchState(state) {
  const states = ['welcome', 'loading', 'results', 'no-results'];
  
  states.forEach(s => {
    const element = document.getElementById(s === 'welcome' ? 'search-welcome' : 
                                         s === 'loading' ? 'search-loading' :
                                         s === 'results' ? 'search-results' : 'no-results');
    if (element) {
      element.style.display = s === state ? 'block' : 'none';
    }
  });
}

// ============================================== [COLLEGE CARDS SCROLL ANIMATION] ==============================================

function initializeCollegeCardsAnimation() {
  // Only run on laptops (screen width >= 1024px)
  if (window.innerWidth < 1024) {
    return;
  }
  
  const container = document.querySelector('.college-cards-container');
  if (!container) {
    return;
  }
  
  const cards = container.querySelectorAll('.card');
  if (cards.length === 0) {
    return;
  }
  
  // Identify the middle card - adjust logic for correct middle selection
  // For arrays: [0,1,2,3] -> middle should be index 1 (2nd card)
  // For arrays: [0,1,2,3,4] -> middle should be index 2 (3rd card)
  const middleIndex = Math.floor((cards.length - 1) / 2);
  cards[middleIndex].classList.add('middle-card');
  
  // Apply dynamic circular positioning for better arc motion
  cards.forEach((card, index) => {
    if (index !== middleIndex) {
      // Calculate circular position based on card index relative to middle
      const relativeIndex = index - middleIndex;
      const angle = (relativeIndex * 45) + (Math.random() * 30 - 15); // Add some randomness
      const distance = Math.abs(relativeIndex) * 80 + 150; // Distance from center
      
      // Calculate x and y positions in a circular pattern
      const radians = (angle * Math.PI) / 180;
      const x = Math.cos(radians) * distance;
      const y = Math.sin(radians) * distance * 0.6; // Compress Y for better layout
      const rotation = relativeIndex * 8; // Slight rotation for organic feel
      
      // Store the calculated positions as data attributes
      card.setAttribute('data-circle-x', x);
      card.setAttribute('data-circle-y', y);
      card.setAttribute('data-circle-rotation', rotation);
      
      console.log(`Card ${index}: angle=${angle}°, distance=${distance}px, x=${x}, y=${y}, rotation=${rotation}°`);
    }
  });
  
  // Add animation-ready class after a short delay to prepare for animation
  setTimeout(() => {
    container.classList.add('animation-ready');
    
    // Apply the dynamic positioning via CSS custom properties
    cards.forEach((card, index) => {
      if (index !== middleIndex) {
        const x = card.getAttribute('data-circle-x');
        const y = card.getAttribute('data-circle-y');
        const rotation = card.getAttribute('data-circle-rotation');
        
        const collegeCard = card.querySelector('.college-card');
        if (collegeCard) {
          collegeCard.style.setProperty('--dynamic-x', `${x}px`);
          collegeCard.style.setProperty('--dynamic-y', `${y}px`);
          collegeCard.style.setProperty('--dynamic-rotation', `${rotation}deg`);
        }
      }
    });
  }, 100);
  
  // Set up Intersection Observer for scroll detection
  const observerOptions = {
    threshold: 0.3, // Trigger when 30% of the container is visible
    rootMargin: '0px 0px -100px 0px' // Trigger a bit before the element comes into view
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Trigger the circular splash animation
        entry.target.classList.add('is-visible');
        
        console.log('🎯 Circular college cards animation triggered!');
        
        // Optionally unobserve after first animation
        // observer.unobserve(entry.target);
      } else {
        // Remove animation class when scrolling back up (converge back to center)
        entry.target.classList.remove('is-visible');
      }
    });
  }, observerOptions);
  
  // Start observing the container
  observer.observe(container);
  
  // Handle window resize to disable/enable animation based on screen size
  window.addEventListener('resize', function() {
    if (window.innerWidth < 1024) {
      // Disable animation on smaller screens
      container.classList.remove('is-visible', 'animation-ready');
      observer.disconnect();
    } else {
      // Re-enable animation on larger screens
      container.classList.add('animation-ready');
      observer.observe(container);
    }
  });
  
  console.log('✅ Circular college cards scroll animation initialized for laptop screens');
  console.log(`📊 Found ${cards.length} cards, middle card is at index ${middleIndex}`);
  console.log('🔄 Dynamic circular positioning applied to non-middle cards');
}

// ============================================== [CARD ANIMATIONS] ==============================================

function initializeCardAnimations() {
  // Check for IntersectionObserver support
  if (!('IntersectionObserver' in window)) {
    console.warn('⚠️ IntersectionObserver not supported, skipping animations');
    return;
  }
  
  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  // Observe elements for animation
  const animateElements = document.querySelectorAll('.college-card, .branch-card, .semester-card, .subject-card, .pdf-card');
  animateElements.forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
  
  // Add hover effects
  initializeHoverEffects();
}

function initializeHoverEffects() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const cards = document.querySelectorAll('.college-card, .branch-card, .semester-card, .subject-card, .pdf-card');
  
  cards.forEach(card => {
    if (card.dataset.hoverInitialized) return;
    
    if (isTouchDevice) {
      // Elegant touch effects for mobile
      card.addEventListener('touchstart', handleTouchStart, { passive: true });
      card.addEventListener('touchend', handleTouchEnd, { passive: true });
      card.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    } else {
      // Desktop hover effects
      card.addEventListener('mouseenter', handleCardHover);
      card.addEventListener('mouseleave', resetCardHover);
    }
    
    card.dataset.hoverInitialized = 'true';
  });
}

function handleCardHover(e) {
  const card = e.currentTarget;
  
  // Add will-change for better performance
  card.style.willChange = 'transform, box-shadow';
  // Simple outward transform - card comes toward the user
  card.style.transform = 'translateZ(20px) scale(1.05)';
  card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
}

function resetCardHover(e) {
  const card = e.currentTarget;
  card.style.willChange = 'auto';
  // Reset to normal position
  card.style.transform = 'translateZ(0) scale(1)';
  card.style.boxShadow = '';
}

// Elegant touch handlers for mobile devices
function handleTouchStart(e) {
  const card = e.currentTarget;
  
  // Smooth 3D lift effect - card elegantly comes forward
  card.style.willChange = 'transform, box-shadow';
  card.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease';
  card.style.transform = 'translateY(-8px) scale(1.02)';
  card.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
}

function handleTouchEnd(e) {
  const card = e.currentTarget;
  
  // Smooth return with elegant easing
  card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.5s ease';
  card.style.transform = 'translateY(0) scale(1)';
  card.style.boxShadow = '';
  
  // Clean up after animation
  setTimeout(() => {
    card.style.willChange = 'auto';
  }, 500);
}

// ============================================== [ADVANCED FILTERING] ==============================================

function initializeAdvancedFiltering() {
  // Set up filter toggle functionality
  const filtersToggle = document.querySelector('.filters-toggle');
  if (filtersToggle) {
    // Remove any existing event listeners by cloning and replacing the element
    const newFiltersToggle = filtersToggle.cloneNode(true);
    filtersToggle.parentNode.replaceChild(newFiltersToggle, filtersToggle);
    
    // Add the event listener to the new element
    newFiltersToggle.addEventListener('click', toggleFilters);
  }
  
  // Set up clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }
  
  // Set up clear all button
  const clearAllBtn = document.getElementById('clear-all');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllSearchFilters);
  }
}

// ============================================== [UTILITY FUNCTIONS] ==============================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function toggleFilters(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const filtersContent = document.getElementById('filters-content');
  const toggleBtn = document.querySelector('.filters-toggle');
  const toggleText = toggleBtn?.querySelector('.toggle-text');
  const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
  
  filtersVisible = !filtersVisible;
  
  if (filtersContent) {
    if (filtersVisible) {
      filtersContent.style.display = 'block';
      if (toggleText) toggleText.textContent = 'Hide Filters';
      if (toggleIcon) toggleIcon.textContent = '▲';
    } else {
      filtersContent.style.display = 'none';
      if (toggleText) toggleText.textContent = 'Show Filters';
      if (toggleIcon) toggleIcon.textContent = '▼';
    }
  }
  
  // Log for debugging
  console.log('Filters toggled, now ' + (filtersVisible ? 'visible' : 'hidden'));
  
  return false;
}

function clearFilters() {
  const filters = ['college-filter', 'branch-filter', 'semester-filter', 'subject-filter', 'year-filter'];
  filters.forEach(filterId => {
    const filter = document.getElementById(filterId);
    if (filter) filter.value = '';
  });
  
  const sortBy = document.getElementById('sort-by');
  if (sortBy) sortBy.value = 'relevance';
  
  // Reset dependent filters
  updateDependentFilters('college');
  
  const mainSearch = document.getElementById('main-search');
  if (mainSearch && mainSearch.value) {
    performAdvancedSearch();
  } else {
    updateActiveFilters();
  }
}

function clearAllSearchFilters() {
  const mainSearch = document.getElementById('main-search');
  if (mainSearch) mainSearch.value = '';
  clearFilters();
  showSearchState('welcome');
  updateActiveFilters();
}

function quickSearch(query = '', college = '', branch = '', semester = '', subject = '', year = '') {
  const mainSearch = document.getElementById('main-search');
  const collegeFilter = document.getElementById('college-filter');
  const branchFilter = document.getElementById('branch-filter');
  const semesterFilter = document.getElementById('semester-filter');
  const subjectFilter = document.getElementById('subject-filter');
  const yearFilter = document.getElementById('year-filter');
  
  if (mainSearch) mainSearch.value = query;
  if (collegeFilter) collegeFilter.value = college;
  if (branchFilter) branchFilter.value = branch;
  if (semesterFilter) semesterFilter.value = semester;
  if (subjectFilter) subjectFilter.value = subject;
  if (yearFilter) yearFilter.value = year;
  
  // Update dependent dropdowns
  updateDependentFilters('college');
  
  performAdvancedSearch();
}

function changeResultsView(view) {
  currentView = view;
  const viewBtns = document.querySelectorAll('.view-controls .view-btn');
  
  viewBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === view);
  });
  
  const resultsList = document.getElementById('results-list');
  if (resultsList) {
    resultsList.className = view === 'grid' ? 'results-grid' : 'results-list';
  }
}

function updateActiveFilters() {
  const mainSearch = document.getElementById('main-search');
  const collegeFilter = document.getElementById('college-filter');
  const branchFilter = document.getElementById('branch-filter');
  const semesterFilter = document.getElementById('semester-filter');
  const yearFilter = document.getElementById('year-filter');
  
  const query = mainSearch?.value || '';
  const college = collegeFilter?.value || '';
  const branch = branchFilter?.value || '';
  const semester = semesterFilter?.value || '';
  const year = yearFilter?.value || '';
  
  const hasFilters = query || college || branch || semester || year;
  const activeFilters = document.getElementById('active-filters');
  const filterTags = document.getElementById('filter-tags');
  
  if (activeFilters && filterTags) {
    if (hasFilters) {
      activeFilters.style.display = 'flex';
      filterTags.innerHTML = '';
      
      if (query) {
        filterTags.appendChild(createFilterTag('Search', `"${query}"`, () => {
          if (mainSearch) mainSearch.value = '';
          performAdvancedSearch();
        }));
      }
      
      if (college) {
        const collegeName = document.querySelector(`#college-filter option[value="${college}"]`)?.textContent || college;
        filterTags.appendChild(createFilterTag('College', collegeName, () => {
          if (collegeFilter) collegeFilter.value = '';
          performAdvancedSearch();
        }));
      }
      
      if (branch) {
        const branchName = document.querySelector(`#branch-filter option[value="${branch}"]`)?.textContent || branch;
        filterTags.appendChild(createFilterTag('Branch', branchName, () => {
          if (branchFilter) branchFilter.value = '';
          performAdvancedSearch();
        }));
      }
      
      if (semester) {
        const semesterName = document.querySelector(`#semester-filter option[value="${semester}"]`)?.textContent || semester;
        filterTags.appendChild(createFilterTag('Semester', semesterName, () => {
          if (semesterFilter) semesterFilter.value = '';
          performAdvancedSearch();
        }));
      }
      
      if (year) {
        filterTags.appendChild(createFilterTag('Year', year, () => {
          if (yearFilter) yearFilter.value = '';
          performAdvancedSearch();
        }));
      }
    } else {
      activeFilters.style.display = 'none';
    }
  }
}

function createFilterTag(label, value, onRemove) {
  const tag = document.createElement('span');
  tag.className = 'filter-tag';
  tag.innerHTML = `${escapeHTML(label)}: ${escapeHTML(value)} <button onclick="this.parentElement.remove(); arguments[0].stopPropagation();" onmousedown="event.preventDefault();">×</button>`;
  
  const button = tag.querySelector('button');
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });
  
  return tag;
}

function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const mainSearch = document.getElementById('main-search');
  const collegeFilter = document.getElementById('college-filter');
  const branchFilter = document.getElementById('branch-filter');
  const semesterFilter = document.getElementById('semester-filter');
  const subjectFilter = document.getElementById('subject-filter');
  const yearFilter = document.getElementById('year-filter');
  
  let hasParams = false;
  
  if (urlParams.get('q') && mainSearch) {
    mainSearch.value = urlParams.get('q');
    hasParams = true;
  }
  
  if (urlParams.get('query') && mainSearch) {
    mainSearch.value = urlParams.get('query');
    hasParams = true;
  }
  
  if (urlParams.get('college') && collegeFilter) {
    collegeFilter.value = urlParams.get('college');
    hasParams = true;
    
    // Update dependent filters
    updateDependentFilters('college');
  }
  
  if (urlParams.get('branch') && branchFilter) {
    branchFilter.value = urlParams.get('branch');
    hasParams = true;
    
    // Update dependent filters
    updateDependentFilters('branch');
  }
  
  if (urlParams.get('semester') && semesterFilter) {
    semesterFilter.value = urlParams.get('semester');
    hasParams = true;
    
    // Update dependent filters
    updateDependentFilters('semester');
  }
  
  if (urlParams.get('subject') && subjectFilter) {
    setTimeout(() => {
      subjectFilter.value = urlParams.get('subject');
      hasParams = true;
    }, 200);
  }
  
  if (urlParams.get('year') && yearFilter) {
    yearFilter.value = urlParams.get('year');
    hasParams = true;
  }
  
  // Perform search if there are parameters
  if (hasParams) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      performAdvancedSearch();
    }, 300);
  }
}

// ============================================== [SCROLL-BASED NAVIGATION] ==============================================

// Guard to prevent multiple initializations
let scrollNavigationInitialized = false;

function setupScrollNavigation() {
  // Get the header element
  const header = document.querySelector('.site-header');
  if (!header) return;
  
  // Prevent duplicate initialization
  if (scrollNavigationInitialized) {
    console.warn('Scroll navigation already initialized, skipping');
    return;
  }
  scrollNavigationInitialized = true;

  // Add a new class to the header for styling purposes
  header.classList.add('scroll-nav');

  // Variables to track scroll state
  let lastScrollTop = 0;
  let scrollThreshold = 100; // Minimum scroll amount before showing/hiding
  let scrollDelayTimer;
  let isHeaderVisible = true;
  
  // Detect if device is mobile/touch for better throttling
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Add CSS styles for the slide-up and slide-down animations
  const style = document.createElement('style');
  style.textContent = `
    .site-header.scroll-nav {
      transition: transform 0.3s ease, background-color 0.3s;
    }
    .site-header.scroll-nav.slide-up {
      transform: translateY(-100%);
    }
    .site-header.scroll-nav.slide-down {
      transform: translateY(0);
    }
    .site-header.scroll-nav.scrolled {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .dark-theme .site-header.scroll-nav.scrolled {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .search-container.active {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 200;
    }
  `;
  document.head.appendChild(style);

  // Handle scroll events with throttling for better performance
  window.addEventListener('scroll', function() {
    clearTimeout(scrollDelayTimer);
    
    scrollDelayTimer = setTimeout(function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Add scrolled class when not at the top
      if (scrollTop > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      
      // Only hide header when scrolling down and past the threshold
      if (scrollTop > lastScrollTop && scrollTop > scrollThreshold) {
        // Scrolling down
        if (isHeaderVisible) {
          header.classList.add('slide-up');
          header.classList.remove('slide-down');
          isHeaderVisible = false;
        }
      } else if (scrollTop < lastScrollTop) {
        // Scrolling up - show the header
        if (!isHeaderVisible) {
          header.classList.add('slide-down');
          header.classList.remove('slide-up');
          isHeaderVisible = true;
        }
      }
      
      lastScrollTop = scrollTop;
    }, isMobile ? 50 : 10); // Higher delay on mobile for smoother animations
  });

  // Show header when hovering near the top of the page
  document.addEventListener('mousemove', function(e) {
    if (e.clientY < 20 && !isHeaderVisible) {
      header.classList.add('slide-down');
      header.classList.remove('slide-up');
      isHeaderVisible = true;
    }
  });
  
  // Handle mobile touches at the top to reveal the header
  document.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    if (touch && touch.clientY < 20 && !isHeaderVisible) {
      header.classList.add('slide-down');
      header.classList.remove('slide-up');
      isHeaderVisible = true;
    }
  });
}

// ============================================== [SYLLABUS DOCUMENTATION FEATURE] ==============================================

function initializeSyllabusModal() {
  const toggleBtn = document.getElementById('syllabus-toggle');
  const modal = document.getElementById('syllabus-modal');
  const closeBtn = document.getElementById('syllabus-close');
  const overlay = document.getElementById('syllabus-overlay');
  
  if (!toggleBtn || !modal) return;
  
  // Open modal
  toggleBtn.addEventListener('click', function() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Add escape key listener
    document.addEventListener('keydown', handleEscapeKey);
  });
  
  // Close modal function
  function closeSyllabusModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSyllabusModal);
  }
  
  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', closeSyllabusModal);
  }
  
  // Escape key handler
  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeSyllabusModal();
    }
  }
  
  // Prevent modal content click from closing
  const syllabusContainer = modal?.querySelector('.syllabus-container');
  if (syllabusContainer) {
    syllabusContainer.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// ============================================== [SUBJECT DOCUMENTATION FEATURE] ==============================================

function initializeSubjectDocModal() {
  const toggleBtn = document.getElementById('subject-doc-toggle');
  const modal = document.getElementById('subject-doc-modal');
  const closeBtn = document.getElementById('subject-doc-close');
  const overlay = document.getElementById('subject-doc-overlay');
  
  if (!toggleBtn || !modal) return;
  
  // Open modal
  toggleBtn.addEventListener('click', function() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Add escape key listener
    document.addEventListener('keydown', handleSubjectDocEscapeKey);
  });
  
  // Close modal function
  function closeSubjectDocModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleSubjectDocEscapeKey);
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSubjectDocModal);
  }
  
  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', closeSubjectDocModal);
  }
  
  // Escape key handler
  function handleSubjectDocEscapeKey(e) {
    if (e.key === 'Escape') {
      closeSubjectDocModal();
    }
  }
  
  // Prevent modal content click from closing
  const subjectDocContainer = modal?.querySelector('.subject-doc-container');
  if (subjectDocContainer) {
    subjectDocContainer.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// ============================================== [PYQ DOCUMENTATION FEATURE] ==============================================

function initializePyqDocModal() {
  const toggleBtn = document.getElementById('pyq-doc-toggle');
  const modal = document.getElementById('pyq-doc-modal');
  const closeBtn = document.getElementById('pyq-doc-close');
  const overlay = document.getElementById('pyq-doc-overlay');
  
  if (!toggleBtn || !modal) return;
  
  // Open modal
  toggleBtn.addEventListener('click', function() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Add escape key listener
    document.addEventListener('keydown', handlePyqDocEscapeKey);
  });
  
  // Close modal function
  function closePyqDocModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
    
    // Remove escape key listener
    document.removeEventListener('keydown', handlePyqDocEscapeKey);
  }
  
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closePyqDocModal);
  }
  
  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', closePyqDocModal);
  }
  
  // Escape key handler
  function handlePyqDocEscapeKey(e) {
    if (e.key === 'Escape') {
      closePyqDocModal();
    }
  }
  
  // Prevent modal content click from closing
  const pyqDocContainer = modal?.querySelector('.pyq-doc-container');
  if (pyqDocContainer) {
    pyqDocContainer.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// ============================================== [GLOBAL HELPER FUNCTIONS] ==============================================

// Make functions globally available for onclick handlers
window.quickSearch = quickSearch;
window.changeResultsView = changeResultsView;
window.clearFilters = clearFilters;
window.clearAllSearchFilters = clearAllSearchFilters;
window.toggleFilters = toggleFilters;
window.switchViewer = switchViewer;
window.updateDependentFilters = updateDependentFilters;
window.performAdvancedSearch = performAdvancedSearch;
window.loadMoreResults = loadMoreResults;

// Handle window resize for responsive behavior
window.addEventListener('resize', function() {
  // Handle PDF.js viewer resize
  if (pdfDoc && currentViewer === 'pdfjs') {
    // Re-render current page with new scale
    setTimeout(() => {
      queueRenderPage(pageNum);
    }, 100);
  }
  
  // Handle viewport changes between mobile and desktop
  const wasMobile = document.querySelector('.mobile-scroll-viewer') && 
                    document.querySelector('.mobile-scroll-viewer').style.display !== 'none';
  const isMobile = window.innerWidth <= 768;
  
  if (wasMobile !== isMobile && currentViewer === 'iframe') {
    // Reinitialize mobile viewer if switching to mobile
    if (isMobile && !mobilePdfDoc) {
      initializeMobileScrollViewer();
    }
  }
});

// Debug function to check if data is loaded correctly
window.debugPYQData = function() {
  console.log('🔍 PYQ Data Debug Info:');
  console.log('📊 Total PYQs loaded:', allPYQs.length);
  console.log('🏫 Colleges available:', [...new Set(allPYQs.map(p => p.college))]);
  console.log('🎓 Branches available:', [...new Set(allPYQs.map(p => p.branch))]);
  console.log('� Semesters available:', [...new Set(allPYQs.map(p => p.semester))].sort());
  console.log('📚 Subjects available:', Object.keys(availableSubjects).length);
  console.log('📅 Years available:', [...availableYears].sort());
  console.log('📄 Sample PYQ:', allPYQs[0]);
  console.log('🌐 Global data source:', window.COLLEGE_DATA ? 'Available' : 'Missing');
  console.log('📱 Current PDF viewer:', currentViewer);
  console.log('📄 PDF document loaded:', pdfDoc ? 'Yes' : 'No');
  console.log('🔍 Current zoom scale:', scale);
};







// Removed download button from search query results
// Need to placed after search query results to enable the download option in the search query results

// Present in range [774, 821]

/*
Code to placed after is given as:

<div class="result-actions">
          <a href="${url}" class="btn btn-primary btn-small" title="View subject page">
            <i class="fas fa-eye"></i> View Subject
          </a>
          <a href="${pdfUrl}" class="btn btn-outline btn-small" title="View PDF file">
            <i class="fas fa-file-pdf"></i> View PDF
          </a>
        </div>
*/


/*
<a href="${downloadUrl}" class="btn btn-secondary btn-small" title="Download PDF" download>
            <i class="fas fa-download"></i> Download
          </a>
*/








// 'Pages' and 'Difficulty' information in search query results removed 
// Present in range [774, 821]
// Line 802

// After this code

/* 
<span class="result-year" title="Year">
              <i class="fas fa-calendar-alt"></i> ${year}
            </span>
*/

// Before this code

/* 
${examType ? `<span class="result-exam-type" title="Exam Type"><i class="fas fa-clipboard-check"></i> ${examType}</span>` : ''}
          </div>
          ${description ? `<div class="result-description">${description}</div>` : ''}
*/


///////////// [[[[[[[[[[[[[[[[[[[   Pages + Difficulty code    ]]]]]]]]]]]]]]]]]]]

/*

<span class="result-pages" title="Pages">
              <i class="fas fa-file-alt"></i> ${pages} pages
            </span>
            ${difficulty ? `<span class="result-difficulty" title="Difficulty"><i class="fas fa-signal"></i> ${difficulty}</span>` : ''}

*/