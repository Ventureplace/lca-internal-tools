/*
 * Chrome — renders the shared nav and footer into placeholders on every page.
 * Single source of truth for the LCA × Loblaw co-brand lockup.
 *
 * Each page declares which route is active by passing { active: 'home' | 'designs' | 'board' | 'timeline' | 'resources' }.
 */

const NAV_LINKS = [
  { id: 'home', label: 'Dashboard', href: 'index.html' },
  { id: 'requirements', label: 'Requirements', href: 'requirements.html' },
  { id: 'designs', label: 'Designs', href: 'designs.html' },
  { id: 'board', label: 'Board', href: 'board.html' },
  { id: 'timeline', label: 'Timeline', href: 'timeline.html' },
  { id: 'resources', label: 'Resources', href: 'resources.html' },
];

const LOBLAW_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Loblaw_Companies_Limited_logo_EN.svg';

export function renderChrome({ active = 'home' } = {}) {
  const navEl = document.getElementById('app-nav');
  if (navEl) {
    navEl.className = 'app-nav fade-up';
    navEl.innerHTML = `
      <div class="brand-lockup" aria-label="Loblaw × LCA — Project Remedy">
        <img class="loblaw-mark" src="${LOBLAW_LOGO}" alt="Loblaw" />
        <span class="brand-x" aria-hidden="true">×</span>
        <img class="lca-mark" src="lca.ico" alt="LCA" />
        <div class="nav-divider"></div>
        <span class="nav-section">Project Remedy</span>
      </div>
      <div class="nav-links">
        ${NAV_LINKS.map(l => `
          <a class="nav-link ${l.id === active ? 'active' : ''}" href="${l.href}">${l.label}</a>
        `).join('')}
      </div>
      <div class="nav-status">
        <span class="status-dot"></span>
        All systems operational
      </div>
    `;
  }

  const footEl = document.getElementById('app-footer');
  if (footEl) {
    footEl.className = 'app-footer';
    const year = new Date().getFullYear();
    footEl.innerHTML = `
      <span class="meta">© ${year} Late Checkout Agency × Loblaw Digital</span>
      <span class="meta">Project Remedy · Internal portal</span>
    `;
  }
}
