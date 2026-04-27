/*
 * Timeline page — full Design Review Ledger (time × workstream).
 * Bigger window than the home snapshot so you can see the whole project arc.
 */

import { renderChrome } from '../chrome.js';
import { getBoard, taskUrl, versionOf } from '../data/board.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const pickTaskUrl = taskUrl;

function statusKind(task) {
  const s = (task.status || '').toLowerCase();
  if (s === 'done') return 'done';
  if (s === 'in progress' || s === 'design specs' || s === 'in product review') return 'progress';
  return 'upnext';
}

function scopeKind(task) {
  const s = (task.scope || '').toLowerCase();
  if (s === 'v1.0') return { code: 'V1', cls: 'v1' };
  if (s === 'v1.1') return { code: 'V2', cls: 'v2' };
  return { code: 'V3', cls: 'lt' };
}

const WEEKS_BACK = 14;
const WEEKS_FWD = 6;
const TOTAL_WEEKS = WEEKS_BACK + WEEKS_FWD;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(d) {
  const out = new Date(d);
  const day = out.getDay();
  out.setDate(out.getDate() + (day === 0 ? -6 : 1 - day));
  out.setHours(0, 0, 0, 0);
  return out;
}

function buildWindow() {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const start = new Date(weekStart.getTime() - WEEKS_BACK * MS_PER_WEEK);
  const end = new Date(weekStart.getTime() + WEEKS_FWD * MS_PER_WEEK);
  const weeks = [];
  for (let i = 0; i < TOTAL_WEEKS; i++) weeks.push(new Date(start.getTime() + i * MS_PER_WEEK));
  return { start, end, weeks, today, weekStart };
}

function pctFor(date, win) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return ((d - win.start) / (win.end - win.start)) * 100;
}

const SECTIONS = [
  { num: '01', title: 'Entry Points & Chat Interface',    match: /entry|chat ui|chat history|chat deletion|onboarding|nux|prompt chips|conversation history/i },
  { num: '02', title: 'Triage & Care Routing',            match: /triage|red[-\s]?flag|navigation|care routing|conversation end|escalation|urgent/i },
  { num: '03', title: 'Sources, Verifiability & Explain', match: /source|citation|explain|table component|thumbs|in-?line|verifiability/i },
  { num: '04', title: 'Personalization & Transparency',   match: /personali[sz]ation|transparen|consent|permission|profile|incognito|caregiver|chat for someone|memory|medication/i },
  { num: '05', title: 'GA Release & Visual Identity',     match: /ga release|visual styling|visual identity|wcag|accessibility|action card|store location|file reorg|slt presentation|figma file|thinking state|appointment booking|record retrieval|presentation/i },
  { num: '06', title: 'Discovery & Long-term Tracks',     match: /phr|prescription|chronic|planning|prevention|proactive|voice|file upload|web designs|android|sdm/i },
];

function bucket(tasks) {
  const sections = SECTIONS.map(s => ({ ...s, items: [] }));
  const fallback = { num: '07', title: 'Other workstreams', items: [] };
  for (const t of tasks) {
    if (!t.title) continue;
    const found = sections.find(s => s.match.test(t.title));
    (found ? found.items : fallback.items).push(t);
  }
  if (fallback.items.length) sections.push(fallback);
  const order = { progress: 0, upnext: 1, done: 2 };
  for (const s of sections) s.items.sort((a, b) => order[statusKind(a)] - order[statusKind(b)]);
  return sections.filter(s => s.items.length);
}

function inferBar(task, win) {
  const kind = statusKind(task);
  const wkPct = 100 / TOTAL_WEEKS;
  const todayPct = pctFor(win.weekStart, win);
  if (kind === 'done') {
    const right = todayPct - wkPct;
    return { left: Math.max(right - wkPct * 4, 0), right: Math.max(right, wkPct), kind };
  }
  if (kind === 'progress') {
    return { left: Math.max(todayPct - wkPct * 2, 0), right: Math.min(todayPct + wkPct * 2, 100), kind };
  }
  return { left: Math.min(todayPct, 100 - wkPct * 2), right: Math.min(todayPct + wkPct * 4, 100), kind };
}

function renderBar(task, win) {
  const kind = statusKind(task);
  let left, right;
  if (task.startDate && task.endDate) {
    left = pctFor(task.startDate, win); right = pctFor(task.endDate, win);
  } else if (task.dueDate) {
    const due = pctFor(task.dueDate, win);
    if (due == null || due < 0 || due > 100) return '';
    const wkPct = 100 / TOTAL_WEEKS;
    left = Math.max(due - wkPct * 4, 0);
    right = due;
  } else {
    const inf = inferBar(task, win);
    left = inf.left; right = inf.right;
  }
  if (left == null || right == null) return '';
  left = Math.max(left, 0); right = Math.min(right, 100);
  if (right - left < 1) return '';
  return `<span class="ledger-bar ${kind}" style="left:${left}%;width:${right - left}%;" title="${escapeHtml(task.title)}${task.dueDate ? ' · due ' + escapeHtml(task.dueDate) : ''}"></span>`;
}

function renderRow(task, win) {
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
      <div class="ledger-track">${renderBar(task, win)}</div>
    </div>
  `;
}

async function init() {
  renderChrome({ active: 'timeline' });
  const el = document.getElementById('timeline-ledger');
  el.innerHTML = `<div class="empty-state">Loading…</div>`;
  const board = await getBoard();
  if (board.error) {
    el.innerHTML = `<div class="empty-state">Could not load board (${escapeHtml(String(board.error.message || board.error))}).</div>`;
    return;
  }
  if (!board.tasks.length) {
    el.innerHTML = `<div class="empty-state">No tasks in the source.</div>`;
    return;
  }
  const win = buildWindow();
  const sections = bucket(board.tasks);
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
          <div class="ledger-weeks" style="grid-template-columns: repeat(${TOTAL_WEEKS}, 1fr);">${weekCols}</div>
        </div>
        ${sections.map(s => `
          <div class="ledger-section">
            <span class="ledger-section-num">${s.num}</span>
            <span class="ledger-section-title">${escapeHtml(s.title)}</span>
            <span class="ledger-section-rule"></span>
            <span class="ledger-section-meta">${s.items.length} task${s.items.length !== 1 ? 's' : ''}</span>
          </div>
          ${s.items.map(t => renderRow(t, win)).join('')}
        `).join('')}
      </div>
    </div>
  `;
}

init();
