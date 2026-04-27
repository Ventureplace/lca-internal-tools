/*
 * Board page — full kanban with filters by version, priority, and status.
 * Refresh button + last-fetched timestamp + Open Slack list / Open Sheet links.
 */

import { renderChrome } from '../chrome.js';
import {
  getBoard,
  bucketKanban,
  KANBAN_COLUMNS,
  priorityClass,
  scopeClass,
  taskUrl,
  versionOf,
  versionLabel,
  SLACK_LIST_URL,
  SHEET_EDIT_URL,
} from '../data/board.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const pickTaskUrl = taskUrl;

function priorityOf(task) {
  const p = (task.priority || '').toLowerCase().trim();
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  return 'unset';
}

const FILTERS = {
  version:  { label: 'Version',  options: [['all','All'],['v1','V1'],['v2','V2'],['v3','V3']],          accessor: versionOf },
  priority: { label: 'Priority', options: [['all','All'],['high','High'],['medium','Medium'],['low','Low'],['unset','Unset']], accessor: priorityOf },
  status:   { label: 'Status',   options: [['all','All'],['active','Active'],['done','Done']],         accessor: t => ((t.status || '').toLowerCase() === 'done' ? 'done' : 'active') },
};

const state = {
  version: 'all',
  priority: 'all',
  // Default to "all" so the Complete column populates on first load.
  // The home dashboard kanban hides Complete; the dedicated board page shows it.
  status: 'all',
  fetchedAt: null,
  tasks: [],
};

function applyFilters(tasks) {
  return tasks.filter(t => {
    for (const [key, f] of Object.entries(FILTERS)) {
      const v = state[key];
      if (v === 'all') continue;
      if (f.accessor(t) !== v) return false;
    }
    return true;
  });
}

function renderToolbar() {
  const el = document.getElementById('board-toolbar');
  el.innerHTML = `
    ${Object.entries(FILTERS).map(([key, f]) => `
      <div class="toolbar-group">
        <span class="toolbar-group-label">${escapeHtml(f.label)}</span>
        ${f.options.map(([val, label]) => {
          const count = val === 'all'
            ? state.tasks.length
            : state.tasks.filter(t => f.accessor(t) === val).length;
          return `<button class="filter-pill ${state[key] === val ? 'active' : ''}" data-key="${key}" data-val="${val}">
            ${escapeHtml(label)}<span class="filter-pill-count">${count}</span>
          </button>`;
        }).join('')}
      </div>
    `).join('')}
    <div class="toolbar-spacer"></div>
    <span class="toolbar-meta" id="board-fetched">${state.fetchedAt ? `Updated ${formatTime(state.fetchedAt)}` : ''}</span>
    <button class="btn ghost" id="board-refresh">Refresh</button>
    <a class="btn outline" href="${SLACK_LIST_URL}" target="_blank" rel="noopener">
      Slack list
      <svg viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2"/><polyline points="4,2 10,2 10,8"/></svg>
    </a>
    <a class="btn ghost" href="${SHEET_EDIT_URL}" target="_blank" rel="noopener">Sheet mirror</a>
  `;
  el.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state[btn.dataset.key] = btn.dataset.val;
      renderToolbar();
      renderGrid();
    });
  });
  document.getElementById('board-refresh').addEventListener('click', () => init({ refresh: true }));
}

function formatTime(d) {
  const ms = Date.now() - d.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function taskCard(t) {
  const url = pickTaskUrl(t);
  const p = (t.priority || '').toLowerCase();
  const priorityCls = (p === 'high' || p === 'medium' || p === 'low') ? `priority-${p}` : '';
  const isDone = (t.status || '').toLowerCase() === 'done';
  const v = versionOf(t);
  const vClass = v === 'v1' ? 'sky' : v === 'v2' ? 'mint' : 'navy';
  return `
    <a class="task ${priorityCls} ${isDone ? 'done' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Open in Slack list">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta">
        <span class="tag ${vClass}">${versionLabel(t)}</span>
        ${t.priority ? `<span class="tag ${priorityClass(t.priority)} dot">${escapeHtml(t.priority)}</span>` : ''}
        ${t.effort ? `<span>${escapeHtml(t.effort)}</span>` : ''}
        ${t.dueDate ? `<span>${escapeHtml(t.dueDate)}</span>` : ''}
        ${t.assignee && !isDone ? `<span>@${escapeHtml(t.assignee.slice(-4))}</span>` : ''}
      </div>
    </a>
  `;
}

function renderGrid() {
  const el = document.getElementById('board-grid');
  const filtered = applyFilters(state.tasks);
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">No tasks match the current filters. Try widening one.</div>`;
    return;
  }
  const buckets = bucketKanban(filtered);
  el.innerHTML = `
    <div class="kanban">
      ${KANBAN_COLUMNS.map(c => {
        const list = buckets[c.id] || [];
        return `
          <div class="kanban-col">
            <div class="kanban-col-head ${c.id}">
              <span>${c.label}</span>
              <span class="kanban-col-count">${list.length}</span>
            </div>
            ${list.length
              ? list.map(taskCard).join('')
              : `<div class="empty-state" style="padding:14px;font-size:var(--fs-eyebrow);">Nothing here.</div>`}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function init({ refresh = false } = {}) {
  renderChrome({ active: 'board' });
  const board = await getBoard({ refresh });
  state.tasks = board.tasks || [];
  state.fetchedAt = board.fetchedAt;
  renderToolbar();
  renderGrid();
  if (board.error) {
    document.getElementById('board-grid').innerHTML = `<div class="empty-state">Could not load board (${escapeHtml(String(board.error.message || board.error))}). Try Refresh.</div>`;
  }
}

init();
