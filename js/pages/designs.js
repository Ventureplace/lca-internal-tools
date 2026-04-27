/*
 * Designs page — V1 / V2 selector, section deep-links, live Figma frame embed.
 */

import { renderChrome } from '../chrome.js';
import { VERSIONS, getVersion, embedUrl } from '../data/figma.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SUB_ARROW = `<svg class="sublink-icon" viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2"/><polyline points="4,2 10,2 10,8"/></svg>`;

let activeId = null;
let activeFrameUrl = null;

function renderSegmented() {
  const el = document.getElementById('designs-segmented');
  el.innerHTML = VERSIONS.map(v => `
    <button data-version="${v.id}" class="${v.id === activeId ? 'active' : ''}">${escapeHtml(v.label)}</button>
  `).join('');
  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => setVersion(btn.dataset.version));
  });
}

function renderSidebar(v) {
  const el = document.getElementById('designs-sidebar');
  el.innerHTML = `
    <div class="card-top">
      <div class="card-icon">
        <svg viewBox="0 0 24 24"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 0 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>
      </div>
      <span class="tag ${v.tagClass}">${escapeHtml(v.tag)}</span>
    </div>
    <div>
      <h2 class="card-title">${escapeHtml(v.title)}</h2>
      <p class="card-desc">${escapeHtml(v.desc)}</p>
      <div class="card-meta">
        <span class="card-meta-item">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${escapeHtml(v.date)}
        </span>
        <span class="card-meta-item">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${escapeHtml(v.audience)}
        </span>
      </div>
    </div>
    <div class="sublinks">
      <p class="sublinks-label">Sections</p>
      ${v.sections.map(s => `
        <a class="sublink" data-frame="${escapeHtml(s.url)}" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">
          <span>${escapeHtml(s.name)}</span>
          ${SUB_ARROW}
        </a>
      `).join('')}
    </div>
  `;
  // Click on a section name → load that frame in the embed (without opening Figma).
  // Modifier-click or arrow icon click follows the link as normal.
  el.querySelectorAll('.sublink').forEach(a => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      setFrame(a.dataset.frame);
    });
  });
}

function setFrame(canonical) {
  activeFrameUrl = canonical;
  const el = document.getElementById('designs-frame');
  el.innerHTML = `<iframe loading="lazy" src="${escapeHtml(embedUrl(canonical))}" allowfullscreen></iframe>`;
}

function setVersion(id) {
  const v = getVersion(id);
  activeId = v.id;
  const url = new URL(window.location.href);
  url.searchParams.set('v', v.id);
  window.history.replaceState({}, '', url);
  document.getElementById('designs-open').href = v.fileUrl;
  renderSegmented();
  renderSidebar(v);
  setFrame(v.coverFrame);
}

function init() {
  renderChrome({ active: 'designs' });
  const params = new URLSearchParams(window.location.search);
  const initialId = params.get('v') || VERSIONS[0].id;
  setVersion(initialId);
}

init();
