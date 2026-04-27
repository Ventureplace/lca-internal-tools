/*
 * Board data source.
 *
 * Upstream truth: the Slack List at
 *   https://loblaw.enterprise.slack.com/lists/ERW2CMBNX/F0AAG21270D
 * Slack Lists are auth-walled, so we read from a mirror the studio controls.
 *
 * Two supported mirrors (swap by changing SOURCE):
 *   1. 'local'   — committed file at data/board.csv (current default)
 *   2. 'sheet'   — Google Sheet exported as CSV
 *
 * The committed CSV uses the Slack-list export schema (column headers below).
 * Both sources are normalized to the same Task shape by `rowsToTasks`.
 *
 * Adding a third source = a new branch in `urlForSource()` and nothing else.
 */

const SOURCE = 'local';

const SHEET_ID = '17sfw7d3OGQ27cr-IvAHglYnpeWV-0iLcJz5RPHd3_2M';
const SHEET_GID = '52377503';
const LOCAL_PATH = './data/board.csv';

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
export const SLACK_LIST_URL = 'https://loblaw.enterprise.slack.com/lists/ERW2CMBNX/F0AAG21270D';
export const SOURCE_URL = SOURCE === 'local' ? LOCAL_PATH : SHEET_EDIT_URL;

/*
 * Slack List record IDs — keyed by normalized title.
 * Lets task cards deep-link to the exact record in the Slack list, e.g.
 *   https://loblaw.enterprise.slack.com/lists/ERW2CMBNX/F0AAG21270D?record_id=Rec0APQDY3LBY
 *
 * Slack does not expose record IDs in the CSV export, so this mapping has
 * to be filled by hand. To add more: open the Slack list, click a record,
 * grab the `record_id=Rec...` from the URL, drop a new entry below.
 */
const TASK_RECORD_IDS = {
  'appointment booking - v2 specs': 'Rec0APQDY3LBY',
};

export function slackRecordUrl(recordId) {
  return `${SLACK_LIST_URL}?record_id=${encodeURIComponent(recordId)}`;
}

export function recordIdFor(task) {
  return TASK_RECORD_IDS[normalizeTitle(task.title)] || null;
}

/*
 * Canonical "open this task" URL. Priority order:
 *   1. Known Slack-list record_id deep link (best — lands on the task itself)
 *   2. First useful URL extracted from Comments / Description (Slack thread
 *      → Figma frame → Coda doc → any other)
 *   3. Slack list root (fallback so the click is never dead)
 */
export function taskUrl(task) {
  const id = recordIdFor(task);
  if (id) return slackRecordUrl(id);
  const ex = extractTaskLink(task);
  if (ex) return ex.url;
  return SLACK_LIST_URL;
}

function urlForSource() {
  if (SOURCE === 'local') return LOCAL_PATH;
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
}

/*
 * Streaming CSV parser — preserved verbatim from the original index.html.
 * Handles quoted fields, embedded commas, "" escapes, and CRLF/LF line endings.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/*
 * Status order — sorts the most actionable first, "Done" last. Used for
 * dashboard activity strip and the full /board page (before user filters).
 */
export const STATUS_ORDER = [
  'In progress',
  'Prioritized',
  'Design Specs',
  'In Product Review',
  'Backlog',
  'Parking Lot (not required for MVP)',
  'Done',
];

const STATUS_RANK = Object.fromEntries(STATUS_ORDER.map((s, i) => [s.toLowerCase(), i]));

function rank(status) {
  const r = STATUS_RANK[(status || '').toLowerCase()];
  return r === undefined ? STATUS_ORDER.length : r;
}

/*
 * Header-keyed row → canonical Task object.
 * Tolerant of missing columns; any unknown column is preserved on `task.raw`.
 */
function rowsToTasks(rows) {
  if (!rows.length) return { tasks: [], headers: [] };
  const headers = rows[0].map(h => h.trim());
  const lower = headers.map(h => h.toLowerCase());
  const idx = (name) => lower.indexOf(name.toLowerCase());
  const i = {
    request: idx('Request'),
    priority: idx('Priority'),
    submittedBy: idx('Submitted by'),
    comments: idx('Comments'),
    assignee: idx('Assignee'),
    status: idx('Status'),
    completed: idx('Completed'),
    dueDate: idx('Due Date'),
    description: idx('Description'),
    attachments: idx('Attachments'),
    pmOwner: idx('Loblaw PM Owner'),
    scope: idx('Scope'),
    effort: idx('Design effort'),
    state: idx('State'),
    startDate: idx('start_date'),
    endDate: idx('end_date'),
  };
  const get = (r, k) => (i[k] >= 0 ? (r[i[k]] || '').trim() : '');

  const tasks = rows.slice(1)
    .filter(r => r.some(c => (c || '').trim()))
    .map((r, n) => ({
      id: n,
      title: get(r, 'request'),
      priority: get(r, 'priority'),
      submittedBy: get(r, 'submittedBy'),
      comments: get(r, 'comments'),
      assignee: get(r, 'assignee'),
      status: get(r, 'status'),
      completed: /^true$/i.test(get(r, 'completed')),
      dueDate: get(r, 'dueDate'),
      description: get(r, 'description'),
      attachments: get(r, 'attachments'),
      pmOwner: get(r, 'pmOwner'),
      scope: get(r, 'scope'),
      effort: get(r, 'effort'),
      state: get(r, 'state'),
      startDate: get(r, 'startDate'),
      endDate: get(r, 'endDate'),
    }))
    // Skip rows the Slack list flagged as duplicates, have no title, or are
    // explicitly hidden by the design team (HIDDEN_TITLES below).
    .filter(t => t.title && t.state.toLowerCase() !== 'duplicate' && !HIDDEN_TITLES.has(normalizeTitle(t.title)));

  // Active (non-Done) first, ordered by status rank, then by due date asc within rank.
  tasks.sort((a, b) => {
    const ra = rank(a.status), rb = rank(b.status);
    if (ra !== rb) return ra - rb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return { tasks, headers: lower };
}

let cache = null;

export async function getBoard({ refresh = false } = {}) {
  if (cache && !refresh) return cache;
  try {
    const res = await fetch(urlForSource(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const { tasks, headers } = rowsToTasks(parseCSV(text));
    cache = { tasks, headers, fetchedAt: new Date(), error: null };
    return cache;
  } catch (err) {
    cache = { tasks: [], headers: [], fetchedAt: new Date(), error: err };
    return cache;
  }
}

export function hasTimelineColumns(headers = []) {
  return headers.includes('start_date') && headers.includes('end_date');
}

/*
 * Bucket helpers — used by dashboard widgets and the /board page.
 */
export function activeTasks(tasks) {
  return tasks.filter(t => !t.completed && (t.status || '').toLowerCase() !== 'done');
}

/*
 * Priority colour mapping — single source of truth used by the task tag,
 * the chip dot, and the left edge of the task card. Drives visual
 * consistency: a "Medium" tag, dot, and edge stripe should all be the
 * same amber.
 *   High   → coral (red)
 *   Medium → amber (yellow)
 *   Low    → sky   (blue)
 *   Unset  → navy  (neutral)
 */
export function priorityClass(priority) {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return 'coral';
  if (p === 'medium') return 'amber';
  if (p === 'low') return 'sky';
  return 'navy';
}

export function scopeClass(scope) {
  const s = (scope || '').toLowerCase();
  if (s === 'v1.0') return 'sky';
  if (s === 'v1.1') return 'mint';
  if (s.includes('long-term')) return 'navy';
  if (s === 'backlog') return 'navy';
  return 'navy';
}

/*
 * Title overrides — explicit, hand-curated version assignments that take
 * precedence over both the Slack list's Scope column and the inferred title
 * regex. Use this when the "official" scope is wrong or missing and the
 * design lead has spoken. Keys are normalized titles (lowercased, fancy
 * quotes folded to ASCII).
 */
const TITLE_OVERRIDES = {
  // → V1
  'conversation history - v1.1': 'v1',
  'chat deletion': 'v1',
  'ga release action cards (v2)': 'v1',

  // → V2
  'triage "long" summary from doctronic': 'v2',
  'detailed thinking state': 'v2',
  'in-line navigation information display': 'v2',
  'incognito/profile switch mode/caregiver mode': 'v2',
  'memory - change, remove, delete': 'v2',
  'personalization + transparency ux': 'v2',
  'personalization & transparency ux': 'v2',
  'medication guidance ux': 'v2',
  'appointment booking': 'v2',
  'wcag 2.0 aa accessibility audit': 'v2',
  'store location page refinements': 'v2',
  'figma file reorganization': 'v2',
  'record retrieval': 'v2',
};

/*
 * Hidden titles — pulled out of the source entirely (never shown in kanban,
 * matrix, or Gantt). Internal review noise the team flagged for removal.
 */
const HIDDEN_TITLES = new Set([
  'slt presentation screens (designs)',
  'april 14th presentation slides',
]);

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

export function isHidden(task) {
  return HIDDEN_TITLES.has(normalizeTitle(task.title));
}

/*
 * Version inference — Slack list "Scope" is often empty even when the title
 * makes the version unmistakable (e.g. "v1 Starting Prompt Chips"). This
 * function authoritatively resolves a task to V1 / V2 / V3 by:
 *   1. Hand-curated TITLE_OVERRIDES (always wins)
 *   2. Trusting an explicit scope value (v1.0 → V1, v1.1 → V2)
 *   3. Falling back to title pattern matching (checks v2 / v1.1 BEFORE v1
 *      so "V1.1 GA" doesn't get misread as V1)
 *   4. Defaulting to V3 (future / undecided)
 *
 * Returns 'v1' | 'v2' | 'v3'.
 */
export function versionOf(task) {
  const norm = normalizeTitle(task.title);
  if (TITLE_OVERRIDES[norm]) return TITLE_OVERRIDES[norm];

  const scope = (task.scope || '').toLowerCase().trim();
  if (scope === 'v1.0') return 'v1';
  if (scope === 'v1.1') return 'v2';

  const title = task.title || '';
  // V2 markers first — V1.1, V2, V2.0, "GA release", etc.
  if (/\b(v\s*1\.1|v\s*2(?:\.\d+)?)\b/i.test(title)) return 'v2';
  if (/\bGA\s+release\b/i.test(title)) return 'v2';
  // V1 markers — V1 / V1.0 / "MVP" / "pilot"
  if (/\bv\s*1(?!\.\d)\b/i.test(title)) return 'v1';
  if (/\b(MVP|pilot)\b/i.test(title)) return 'v1';

  return 'v3';
}

/*
 * Display label for a task's resolved version. Uses the canonical V1/V2/V3
 * mapping so chips on the dashboard match the matrix and the timeline.
 */
export function versionLabel(task) {
  const v = versionOf(task);
  return v === 'v1' ? 'V1' : v === 'v2' ? 'V2' : 'V3';
}

/*
 * Kanban buckets — fold the Slack list's seven status values into the four
 * columns Creighton wants on the dashboard: Up Next / In Progress / In Review / Complete.
 * Anything we don't recognise (e.g. "Parking Lot (not required for MVP)") falls into Up Next
 * so it stays visible rather than disappearing.
 */
export const KANBAN_COLUMNS = [
  { id: 'upnext',   label: 'Up Next',     statuses: ['Backlog', 'Prioritized', 'Parking Lot (not required for MVP)'] },
  { id: 'progress', label: 'In Progress', statuses: ['In progress', 'Design Specs'] },
  { id: 'review',   label: 'In Review',   statuses: ['In Product Review'] },
  { id: 'done',     label: 'Complete',    statuses: ['Done'] },
];

// Priority sort weight — High first, then Medium, Low, anything else last.
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
function priorityRank(task) {
  return PRIORITY_RANK[(task.priority || '').toLowerCase().trim()] ?? 3;
}

export function bucketKanban(tasks) {
  const buckets = Object.fromEntries(KANBAN_COLUMNS.map(c => [c.id, []]));
  for (const t of tasks) {
    const col = KANBAN_COLUMNS.find(c => c.statuses.some(s => s.toLowerCase() === (t.status || '').toLowerCase()));
    buckets[col ? col.id : 'upnext'].push(t);
  }
  // Within each column: priority asc-rank (high → medium → low → unset),
  // preserving the parser's secondary order (due date) as a tiebreaker.
  for (const id of Object.keys(buckets)) {
    buckets[id].sort((a, b) => priorityRank(a) - priorityRank(b));
  }
  return buckets;
}

/*
 * Pull the first useful URL out of a task's Comments / Description.
 * Used to surface "Open in Figma" / "View in Slack" affordances on task cards.
 * Order matters: Slack messages first (most actionable), Figma second.
 */
export function extractTaskLink(task) {
  const haystack = `${task.comments || ''}\n${task.description || ''}`;
  const slackMatch = haystack.match(/https?:\/\/[a-z0-9.-]*slack\.com\/[^\s)<>"']+/i);
  if (slackMatch) return { url: slackMatch[0], kind: 'slack' };
  const figmaMatch = haystack.match(/https?:\/\/(?:www\.)?figma\.com\/[^\s)<>"']+/i);
  if (figmaMatch) return { url: figmaMatch[0], kind: 'figma' };
  const codaMatch = haystack.match(/https?:\/\/coda\.io\/[^\s)<>"']+/i);
  if (codaMatch) return { url: codaMatch[0], kind: 'coda' };
  const anyMatch = haystack.match(/https?:\/\/[^\s)<>"']+/i);
  if (anyMatch) return { url: anyMatch[0], kind: 'link' };
  return null;
}
