/**
 * refact.js — PYQFort "Refact" Feature
 * Pick-and-place subject saving with localStorage persistence.
 * Handles: badge counter, add/remove from subject cards, Refact page rendering.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'pyqfort_refact';

  /* ─── Storage helpers ─────────────────────────────────────────────── */

  function getItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) { /* quota exceeded — fail silently */ }
  }

  function addItem(item) {
    const items = getItems();
    // Deduplicate by URL
    if (items.some(i => i.url === item.url)) return false;
    items.unshift(item); // newest first
    saveItems(items);
    return true;
  }

  function removeItem(url) {
    const items = getItems().filter(i => i.url !== url);
    saveItems(items);
  }

  function isItemSaved(url) {
    return getItems().some(i => i.url === url);
  }

  /* ─── Badge counter ───────────────────────────────────────────────── */

  function updateBadge() {
    const count = getItems().length;
    const badge = document.getElementById('refact-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /* ─── Breadcrumb context helper ───────────────────────────────────── */

  function getBreadcrumbContext() {
    // Breadcrumb: Home > College > Branch > Semester (current text)
    const links = Array.from(document.querySelectorAll('.breadcrumbs a'));
    // links[0] = Home, links[1] = College, links[2] = Branch
    // The current page <span> = Semester
    const spans = Array.from(document.querySelectorAll('.breadcrumbs span'));
    return {
      college: links[1] ? links[1].textContent.trim() : '',
      branch: links[2] ? links[2].textContent.trim() : '',
      semester: spans[0] ? spans[0].textContent.trim() : ''
    };
  }

  /* ─── Mark already-saved cards ────────────────────────────────────── */

  function markSavedCards() {
    document.querySelectorAll('.subject-card[data-refact-url]').forEach(card => {
      const url = card.getAttribute('data-refact-url');
      const btn = card.querySelector('.refact-add-btn');
      if (!btn) return;
      if (isItemSaved(url)) {
        card.classList.add('refact-saved');
        btn.classList.add('refact-saved-btn');
        btn.setAttribute('title', 'Saved to Refact – click to remove');
        btn.setAttribute('aria-label', 'Remove from Refact');
      } else {
        card.classList.remove('refact-saved');
        btn.classList.remove('refact-saved-btn');
        btn.setAttribute('title', 'Save to Refact');
        btn.setAttribute('aria-label', 'Add to Refact');
      }
    });
  }

  /* ─── Subject-card add/remove handler ────────────────────────────── */

  function initSubjectCardButtons() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.refact-add-btn');
      if (!btn) return;

      // Stop the click from navigating (e.g. if card is inside an <a>)
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.subject-card[data-refact-url]');
      if (!card) return;

      const url = card.getAttribute('data-refact-url');

      if (isItemSaved(url)) {
        // Remove
        removeItem(url);
        card.classList.remove('refact-saved');
        btn.classList.remove('refact-saved-btn');
        btn.setAttribute('title', 'Save to Refact');
        btn.setAttribute('aria-label', 'Add to Refact');
        showToast('Removed from Refact', 'remove');
      } else {
        // Add
        const ctx = getBreadcrumbContext();
        const item = {
          url: url,
          name: card.getAttribute('data-refact-name') || '',
          code: card.getAttribute('data-refact-code') || '',
          description: card.getAttribute('data-refact-description') || '',
          pdf_count: parseInt(card.getAttribute('data-refact-pdf-count'), 10) || 0,
          college: ctx.college,
          branch: ctx.branch,
          semester: ctx.semester,
          saved_at: Date.now()
        };
        addItem(item);
        card.classList.add('refact-saved');
        btn.classList.add('refact-saved-btn');
        btn.setAttribute('title', 'Saved to Refact – click to remove');
        btn.setAttribute('aria-label', 'Remove from Refact');
        showToast('Saved to Refact!', 'add');
      }

      updateBadge();
    });
  }

  /* ─── Toast notification ──────────────────────────────────────────── */

  let toastTimer = null;

  function showToast(message, type) {
    let toast = document.getElementById('refact-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'refact-toast';
      toast.className = 'refact-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = type === 'add'
      ? `<i class="fa-solid fa-rotate"></i> ${message}`
      : `<i class="fas fa-times-circle"></i> ${message}`;
    toast.className = 'refact-toast refact-toast--' + type + ' refact-toast--show';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('refact-toast--show');
    }, 2400);
  }

  /* ─── Refact page rendering ───────────────────────────────────────── */

  function renderRefactPage() {
    const grid = document.getElementById('refact-grid');
    const emptyEl = document.getElementById('refact-empty');
    const clearBtn = document.getElementById('refact-clear-all');
    if (!grid) return; // Not on the Refact page

    function render() {
      const items = getItems();
      grid.innerHTML = '';

      if (items.length === 0) {
        grid.style.display = 'none';
        emptyEl.style.display = 'flex';
        if (clearBtn) clearBtn.style.display = 'none';
        updateBadge();
        return;
      }

      emptyEl.style.display = 'none';
      grid.style.display = 'grid';
      if (clearBtn) clearBtn.style.display = 'inline-flex';

      items.forEach(function (item) {
        const card = document.createElement('div');
        card.className = 'refact-card';

        // Build breadcrumb trail for the card
        const crumbParts = [item.college, item.branch, item.semester].filter(Boolean);
        const crumbHtml = crumbParts.length
          ? `<p class="refact-card-crumb"><i class="fas fa-map-marker-alt"></i> ${crumbParts.join(' › ')}</p>`
          : '';

        const pdfLabel = item.pdf_count !== 1 ? 'PDFs' : 'PDF';

        card.innerHTML = `
          <div class="refact-card-header">
            <div class="refact-card-icon"><i class="fas fa-book"></i></div>
            <button class="refact-card-remove" data-url="${escapeHtml(item.url)}" aria-label="Remove ${escapeHtml(item.name)} from Refact" title="Remove from Refact">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="refact-card-body">
            <h2 class="refact-card-title">${escapeHtml(item.name)}</h2>
            <p class="refact-card-code">${escapeHtml(item.code)}</p>
            ${item.description ? `<p class="refact-card-desc">${escapeHtml(item.description)}</p>` : ''}
            <p class="refact-card-meta"><i class="fas fa-file-pdf"></i> ${item.pdf_count} ${pdfLabel} available</p>
            ${crumbHtml}
          </div>
          <div class="refact-card-footer">
            <a href="${item.url}" class="btn-view">View Subject</a>
          </div>
        `;

        grid.appendChild(card);
      });

      updateBadge();
    }

    render();

    // Remove button handler
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('.refact-card-remove');
      if (!btn) return;
      const url = btn.getAttribute('data-url');
      removeItem(url);
      render();
      showToast('Removed from Refact', 'remove');
    });

    // Clear all handler
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('Remove all saved subjects from Refact?')) {
          saveItems([]);
          render();
          showToast('Refact cleared', 'remove');
        }
      });
    }
  }

  /* ─── Utility ─────────────────────────────────────────────────────── */

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Init ────────────────────────────────────────────────────────── */

  function init() {
    updateBadge();
    markSavedCards();
    initSubjectCardButtons();
    renderRefactPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
