/*
 * Dashboard page — current design tasks (kanban), design links, resources, timeline snapshot.
 */

import { renderChrome } from '../chrome.js';
import {
  getBoard,
  hasTimelineColumns,
  activeTasks,
  priorityClass,
  scopeClass,
  bucketKanban,
  extractTaskLink,
  versionOf,
  versionLabel,
  KANBAN_COLUMNS,
  SLACK_LIST_URL,
} from '../data/board.js';
import { VERSIONS, getVersion } from '../data/figma.js';

const ARROW_SVG = `<svg viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2"/><polyline points="4,2 10,2 10,8"/></svg>`;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── QUICKNAV — primary destinations under the hero ── */

const QUICKNAV_TILES = [
  {
    href: 'requirements.html',
    title: '<em>Requirements</em>',
    countLabel: 'Live PRD',
    arrowLabel: 'Vision · Roadmap · Workstreams',
    icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  },
  {
    href: 'designs.html',
    title: '<em>Designs</em>',
    countLabel: 'V1 · V2',
    arrowLabel: 'Figma files & specs',
    icon: `<svg viewBox="0 0 24 24"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 0 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>`,
  },
  {
    href: 'board.html',
    title: '<em>Board</em>',
    countId: 'qn-board-count',
    countLabel: 'Tasks',
    arrowLabel: 'Slack-list mirror',
    icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
  },
  {
    href: 'timeline.html',
    title: '<em>Timeline</em>',
    countLabel: 'Workstreams',
    arrowLabel: 'Design Review Ledger',
    icon: `<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/></svg>`,
  },
  {
    href: 'resources.html',
    title: '<em>Resources</em>',
    countLabel: 'Tools · Decks',
    arrowLabel: 'Doctronic, V1 components',
    icon: `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  },
];

const ARROW_OUT = `<svg viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2"/><polyline points="4,2 10,2 10,8"/></svg>`;

function renderQuicknav() {
  const el = document.getElementById('dash-quicknav');
  if (!el) return;
  el.innerHTML = QUICKNAV_TILES.map(t => `
    <a class="quicknav-tile" href="${t.href}">
      <div class="quicknav-tile-top">
        <div class="quicknav-tile-icon">${t.icon}</div>
        <span class="quicknav-tile-count" ${t.countId ? `id="${t.countId}"` : ''}>${escapeHtml(t.countLabel)}</span>
      </div>
      <div class="quicknav-tile-title">${t.title}</div>
      <div class="quicknav-tile-arrow">
        <span>${escapeHtml(t.arrowLabel)}</span>
        ${ARROW_OUT}
      </div>
    </a>
  `).join('');
}

function setQuicknavCounts({ tasks }) {
  const boardCount = document.getElementById('qn-board-count');
  if (boardCount) boardCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
}

/* ── HERO ── */

function setHeroSub({ tasks }) {
  const total = tasks.length;
  const active = activeTasks(tasks).length;
  const done = total - active;
  const sub = document.getElementById('hero-sub');
  if (!total) return;
  sub.innerHTML = `<strong>${active}</strong> active · <strong>${done}</strong> shipped · across <strong>${VERSIONS.length}</strong> design files. Loblaw Digital × LCA.`;
}

/* ── KANBAN — current design tasks ── */

function pickTaskUrl(task) {
  const extracted = extractTaskLink(task);
  return extracted ? extracted.url : SLACK_LIST_URL;
}

function taskCard(t, { compact } = {}) {
  const url = pickTaskUrl(t);
  const isHigh = (t.priority || '').toLowerCase() === 'high';
  const isDone = (t.status || '').toLowerCase() === 'done';
  const v = versionOf(t);
  const vClass = v === 'v1' ? 'sky' : v === 'v2' ? 'mint' : 'navy';
  return `
    <a class="task ${isHigh ? 'priority-high' : ''} ${isDone ? 'done' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Open in Slack list">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta">
        <span class="tag ${vClass}">${versionLabel(t)}</span>
        ${t.priority && !compact ? `<span class="tag ${priorityClass(t.priority)} dot">${escapeHtml(t.priority)}</span>` : ''}
        ${t.effort ? `<span>${escapeHtml(t.effort)}</span>` : ''}
        ${t.dueDate ? `<span>${escapeHtml(t.dueDate)}</span>` : ''}
      </div>
    </a>
  `;
}

function renderKanban(tasks) {
  const el = document.getElementById('dash-kanban');
  const buckets = bucketKanban(tasks);
  // Home "Up Next" is the actively-queued lane only — Prioritized status,
  // not the broader Backlog / Parking Lot pool. Keeps the dashboard sharp.
  buckets.upnext = buckets.upnext.filter(t => (t.status || '').toLowerCase() === 'prioritized');
  const limits = { upnext: 6, progress: 6, review: 6 };
  // Home dashboard hides Complete — the full board page still surfaces it.
  const visibleCols = KANBAN_COLUMNS.filter(c => c.id !== 'done');
  el.innerHTML = `
    <div class="kanban cols-${visibleCols.length}">
      ${visibleCols.map(c => {
        const list = buckets[c.id] || [];
        const visible = list.slice(0, limits[c.id] ?? 6);
        return `
          <div class="kanban-col">
            <div class="kanban-col-head ${c.id}">
              <span>${c.label}</span>
              <span class="kanban-col-count">${list.length}</span>
            </div>
            ${visible.length ? visible.map(t => taskCard(t)).join('') : `<div class="empty-state" style="padding:14px;font-size:var(--fs-eyebrow);">Nothing here.</div>`}
            ${list.length > visible.length ? `<a class="meta" style="padding:8px 4px;" href="board.html">+${list.length - visible.length} more →</a>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ── DESIGN LINKS (V1 left / Complete · V2 right / Active) ── */

function designCard(v) {
  const isV1 = v.id === 'v1';
  const tagClass = isV1 ? 'mint' : 'amber';
  const tagText = isV1 ? 'Complete' : 'Active';
  return `
    <a class="card" href="designs.html?v=${v.id}">
      <div class="card-top">
        <div class="card-icon">
          <svg viewBox="0 0 24 24"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 0 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>
        </div>
        <span class="tag ${tagClass} dot">${tagText}</span>
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
      <div class="card-footer">
        <span class="card-url">${v.sections.length} section${v.sections.length !== 1 ? 's' : ''}</span>
        <div class="card-arrow">${ARROW_SVG}</div>
      </div>
    </a>
  `;
}

function renderDesignLinks() {
  const el = document.getElementById('dash-designs');
  // Force order: V1 (Complete) on the left, V2 (Active) on the right.
  const v1 = getVersion('v1');
  const v2 = getVersion('v2');
  el.innerHTML = designCard(v1) + designCard(v2);
}

/* ── RESOURCES (PRD · V1 Design Components · Doctronic Playground) ── */

function renderResources() {
  const el = document.getElementById('dash-resources');
  const tiles = [
    {
      href: 'requirements.html',
      icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      tag: 'Doc',
      tagClass: 'coral',
      title: 'Product Requirements',
      desc: 'Tabbed PRD synced from the live Google Doc — vision, roadmap, every workstream.',
      label: 'requirements.html',
      external: false,
    },
    {
      href: 'https://lca-devhandoff.figma.site/',
      icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><circle cx="17" cy="17" r="4"/></svg>`,
      tag: 'Design',
      tagClass: 'sky',
      title: 'V1 Design Components',
      desc: 'Component library reference for the V1 build — tokens, anatomy, code refs.',
      label: 'lca-devhandoff.figma.site',
      external: true,
    },
    {
      href: 'https://doctronic-playground-fe-nextjs.vercel.app/',
      icon: `<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>`,
      tag: 'Sandbox',
      tagClass: 'navy',
      title: 'Doctronic Playground',
      desc: 'Interactive environment for testing Doctronic chat + triage prototypes.',
      label: 'doctronic-playground-fe-nextjs.vercel.app',
      external: true,
    },
  ];
  el.innerHTML = tiles.map(t => `
    <a class="card" href="${t.href}"${t.external ? ' target="_blank" rel="noopener"' : ''}>
      <div class="card-top">
        <div class="card-icon">${t.icon}</div>
        <span class="tag ${t.tagClass}">${escapeHtml(t.tag)}</span>
      </div>
      <div>
        <h2 class="card-title">${escapeHtml(t.title)}</h2>
        <p class="card-desc">${escapeHtml(t.desc)}</p>
      </div>
      <div class="card-footer">
        <span class="card-url">${escapeHtml(t.label)}</span>
        <div class="card-arrow">${ARROW_SVG}</div>
      </div>
    </a>
  `).join('');
}

/* ── TIMELINE — workstream ledger (time × category) ──
 *
 * High-level progress view, NOT a priority/version drill-down (those live in
 * the kanban + board page). Rows are workstream categories; columns are weeks.
 * Bars are colored by Slack-board status. Tasks without explicit Due Dates
 * are inferred onto sensible positions (Done → past, In Progress → around now,
 * Up Next → starting now) so the chart actually reads as progress.
 */

function statusKind(task) {
  const s = (task.status || '').toLowerCase();
  if (s === 'done') return 'done';
  if (s === 'in progress' || s === 'design specs' || s === 'in product review') return 'progress';
  return 'upnext';
}

function scopeKind(task) {
  const v = versionOf(task);
  if (v === 'v1') return { code: 'V1', cls: 'v1' };
  if (v === 'v2') return { code: 'V2', cls: 'v2' };
  return { code: 'V3', cls: 'lt' };
}

const LEDGER_WEEKS_BACK = 10;
const LEDGER_WEEKS_FWD = 4;
const LEDGER_TOTAL_WEEKS = LEDGER_WEEKS_BACK + LEDGER_WEEKS_FWD;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(d) {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function ledgerWindow() {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const start = new Date(weekStart.getTime() - LEDGER_WEEKS_BACK * MS_PER_WEEK);
  const end = new Date(weekStart.getTime() + LEDGER_WEEKS_FWD * MS_PER_WEEK);
  const weeks = [];
  for (let i = 0; i < LEDGER_TOTAL_WEEKS; i++) weeks.push(new Date(start.getTime() + i * MS_PER_WEEK));
  return { start, end, weeks, today, weekStart };
}

function pctFor(date, win) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const total = win.end - win.start;
  return ((d - win.start) / total) * 100;
}

/* Categories — keyword-based bucketing of titles into design workstreams.
 * "Other" picks up anything that doesn't match. */
const LEDGER_SECTIONS = [
  { num: '01', title: 'Entry Points & Chat Interface',    match: /entry|chat ui|chat history|chat deletion|onboarding|nux|prompt chips|conversation history/i },
  { num: '02', title: 'Triage & Care Routing',            match: /triage|red[-\s]?flag|navigation|care routing|conversation end|escalation|urgent/i },
  { num: '03', title: 'Sources, Verifiability & Explain', match: /source|citation|explain|table component|thumbs|in-?line|verifiability/i },
  { num: '04', title: 'Personalization & Transparency',   match: /personali[sz]ation|transparen|consent|permission|profile|incognito|caregiver|chat for someone|memory|medication/i },
  { num: '05', title: 'GA Release & Visual Identity',     match: /ga release|visual styling|visual identity|wcag|accessibility|action card|store location|file reorg|slt presentation|figma file|thinking state|appointment booking|record retrieval|presentation/i },
  { num: '06', title: 'Discovery & Long-term Tracks',     match: /phr|prescription|chronic|planning|prevention|proactive|voice|file upload|web designs|android|sdm/i },
];

function bucketLedger(tasks) {
  const sections = LEDGER_SECTIONS.map(s => ({ ...s, items: [] }));
  const fallback = { num: '07', title: 'Other workstreams', items: [] };
  for (const t of tasks) {
    if (!t.title) continue;
    const found = sections.find(s => s.match.test(t.title));
    (found ? found.items : fallback.items).push(t);
  }
  if (fallback.items.length) sections.push(fallback);
  // Within each section: in-progress first, then up-next, then done.
  const order = { progress: 0, upnext: 1, done: 2 };
  for (const s of sections) s.items.sort((a, b) => order[statusKind(a)] - order[statusKind(b)]);
  return sections.filter(s => s.items.length);
}

/* Inferred bar positioning when an explicit Due Date isn't present.
 * Done    → 4 → 1 weeks ago
 * Progress → 2 weeks ago → 1 week ahead (centered on now)
 * Up Next → starting this week, 3 weeks long */
function inferBar(task, win) {
  const kind = statusKind(task);
  const wkPct = 100 / LEDGER_TOTAL_WEEKS;
  const todayPct = pctFor(win.weekStart, win);
  if (kind === 'done') {
    const right = todayPct - wkPct;
    return { left: Math.max(right - wkPct * 3, 0), right: Math.max(right, wkPct), kind };
  }
  if (kind === 'progress') {
    return { left: Math.max(todayPct - wkPct * 2, 0), right: Math.min(todayPct + wkPct * 1.5, 100), kind };
  }
  return { left: Math.min(todayPct, 100 - wkPct * 2), right: Math.min(todayPct + wkPct * 3, 100), kind };
}

function renderLedgerBar(task, win) {
  const kind = statusKind(task);
  let left, right;
  if (task.startDate && task.endDate) {
    left = pctFor(task.startDate, win);
    right = pctFor(task.endDate, win);
  } else if (task.dueDate) {
    const due = pctFor(task.dueDate, win);
    if (due == null) return '';
    if (due < 0) return ''; // off-window past
    if (due > 100) return '';
    // 3-week bar ending at due date.
    const wkPct = 100 / LEDGER_TOTAL_WEEKS;
    left = Math.max(due - wkPct * 3, 0);
    right = due;
  } else {
    const inferred = inferBar(task, win);
    left = inferred.left;
    right = inferred.right;
  }
  if (left == null || right == null) return '';
  left = Math.max(left, 0);
  right = Math.min(right, 100);
  if (right <= 0 || left >= 100 || right - left < 1) return '';
  return `<span class="ledger-bar ${kind}" style="left:${left}%;width:${right - left}%;" title="${escapeHtml(task.title)}${task.dueDate ? ' · due ' + escapeHtml(task.dueDate) : ''}"></span>`;
}

function renderLedgerRow(task, win) {
  const kind = statusKind(task);
  const scope = scopeKind(task);
  const url = pickTaskUrl(task);
  return `
    <div class="ledger-row">
      <a class="ledger-label" href="${escapeHtml(url)}" target="_blank" rel="noopener">
        <span class="ledger-label-dot ${kind}"></span>
        <span class="ledger-label-name">${escapeHtml(task.title)}</span>
        <span class="ledger-scope ${scope.cls}">${scope.code}</span>
      </a>
      <div class="ledger-track">${renderLedgerBar(task, win)}</div>
    </div>
  `;
}

function renderTimelineSnapshot({ tasks }) {
  const el = document.getElementById('dash-timeline');
  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state">No tasks in the source.</div>`;
    return;
  }
  const win = ledgerWindow();
  const sections = bucketLedger(tasks);
  if (!sections.length) {
    el.innerHTML = `<div class="empty-state">Nothing to chart yet.</div>`;
    return;
  }

  const todayPct = pctFor(win.today, win);
  const weekCols = win.weeks.map(d => {
    const date = d.toLocaleString('en', { month: 'short', day: 'numeric' });
    const wn = `W${String(Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`;
    return `<div class="ledger-week"><span class="ledger-week-date">${date}</span><span class="ledger-week-month">${wn}</span></div>`;
  }).join('');

  el.innerHTML = `
    <div class="ledger">
      <div class="ledger-legend">
        <span class="ledger-legend-item"><span class="ledger-legend-swatch done"></span>Done</span>
        <span class="ledger-legend-item"><span class="ledger-legend-swatch progress"></span>In Progress</span>
        <span class="ledger-legend-item"><span class="ledger-legend-swatch upnext"></span>Up Next</span>
        <span class="ledger-legend-item" style="margin-left:auto;">V1 · pilot · V2 · GA · V3 · long-term</span>
      </div>
      <div class="ledger-grid">
        <div class="ledger-head">
          <div class="ledger-corner">Workstream / Task</div>
          <div class="ledger-weeks" style="grid-template-columns: repeat(${LEDGER_TOTAL_WEEKS}, 1fr);">${weekCols}</div>
        </div>
        ${sections.map(s => `
          <div class="ledger-section">
            <span class="ledger-section-num">${s.num}</span>
            <span class="ledger-section-title">${escapeHtml(s.title)}</span>
            <span class="ledger-section-rule"></span>
            <span class="ledger-section-meta">${s.items.length} task${s.items.length !== 1 ? 's' : ''}</span>
          </div>
          ${s.items.map(t => renderLedgerRow(t, win)).join('')}
        `).join('')}
      </div>
    </div>
  `;
}

/* ── BOOT ── */

async function init() {
  renderChrome({ active: 'home' });
  renderQuicknav();
  renderDesignLinks();
  renderResources();

  document.getElementById('dash-kanban').innerHTML = `<div class="empty-state">Loading current tasks…</div>`;
  document.getElementById('dash-timeline').innerHTML = `<div class="empty-state">Loading timeline…</div>`;

  const board = await getBoard();
  if (board.error) {
    document.getElementById('dash-kanban').innerHTML = `<div class="empty-state">Could not load Kanban data.</div>`;
    document.getElementById('dash-timeline').innerHTML = `<div class="empty-state">Could not load timeline.</div>`;
    return;
  }
  setHeroSub(board);
  setQuicknavCounts(board);
  renderKanban(board.tasks);
  renderTimelineSnapshot(board);
}

init();
