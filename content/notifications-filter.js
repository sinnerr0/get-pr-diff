const STATUS_FILTER_ID = 'notification-status-filter';
const HIDDEN_ROW_CLASS = 'notification-status-filter-hidden';

// Path segment of the notification link that identifies its subject, e.g. /owner/repo/actions/runs/123.
const SUBJECT_PATTERNS = {
  pull: /^\/[^/]+\/[^/]+\/pull\//,
  issue: /^\/[^/]+\/[^/]+\/issues\//,
  workflow: /^\/[^/]+\/[^/]+\/actions\/runs\//
};

// Button order follows this list. A row matches when its subject is one of `subjects` and its state icon
// carries one of `icons`. Subjects are checked too because GitHub reuses icons across types
// (e.g. `octicon-skip` is both a "not planned" issue and a skipped workflow run). `null` matches every row.
const STATUS_FILTERS = [
  { key: 'all', label: 'All', subjects: null, icons: null },
  { key: 'open', label: 'Open', subjects: ['pull', 'issue'], icons: ['octicon-git-pull-request', 'octicon-issue-opened'] },
  { key: 'draft', label: 'Draft', subjects: ['pull'], icons: ['octicon-git-pull-request-draft'] },
  { key: 'merged', label: 'Merged', subjects: ['pull'], icons: ['octicon-git-merge'] },
  {
    key: 'closed',
    label: 'Closed',
    subjects: ['pull', 'issue'],
    icons: ['octicon-git-pull-request-closed', 'octicon-issue-closed', 'octicon-skip']
  },
  { key: 'ci-failed', label: 'CI failed', subjects: ['workflow'], icons: ['octicon-x'] }
];

let activeStatusKey = 'all';

const isNotificationsPage = () => window.location.pathname.startsWith('/notifications');

const getRows = () => [...document.querySelectorAll('li.notifications-list-item')];

const getRowCheckbox = row => row.querySelector('input.js-notification-bulk-action-check-item');

const isRowHidden = row => row.classList.contains(HIDDEN_ROW_CLASS);

const findStatusFilter = key => STATUS_FILTERS.find(filter => filter.key === key) ?? STATUS_FILTERS[0];

function getSubjectType(row) {
  const href = row.querySelector('.notification-list-item-link')?.getAttribute('href');
  if (!href) return null;

  const { pathname } = new URL(href, window.location.origin);
  return Object.keys(SUBJECT_PATTERNS).find(type => SUBJECT_PATTERNS[type].test(pathname)) ?? null;
}

function matchesStatusFilter(row, { subjects, icons }) {
  if (!icons) return true;
  if (!subjects.includes(getSubjectType(row))) return false;

  const stateIcon = row.querySelector('.notification-list-item-link svg.octicon');
  return Boolean(stateIcon) && icons.some(icon => stateIcon.classList.contains(icon));
}

// Use click() so GitHub's bulk-action toolbar picks up the change event.
function setRowChecked(row, checked) {
  const checkbox = getRowCheckbox(row);
  if (checkbox && checkbox.checked !== checked) checkbox.click();
}

// Hidden rows must never stay selected, otherwise "Done" would act on notifications the user can't see.
function uncheckHiddenRows() {
  getRows()
    .filter(isRowHidden)
    .forEach(row => {
      setRowChecked(row, false);
    });
}

function applyStatusFilter() {
  const activeFilter = findStatusFilter(activeStatusKey);
  getRows().forEach(row => {
    row.classList.toggle(HIDDEN_ROW_CLASS, !matchesStatusFilter(row, activeFilter));
  });
  uncheckHiddenRows();
  renderFilterState();
}

// Only touch text/attributes when they differ: the MutationObserver below watches childList,
// so unconditional writes would re-trigger it forever.
function renderFilterState() {
  const filterBar = document.getElementById(STATUS_FILTER_ID);
  if (!filterBar) return;

  const rows = getRows();
  STATUS_FILTERS.forEach(filter => {
    const button = filterBar.querySelector(`[data-status="${filter.key}"]`);
    const isActive = filter.key === activeStatusKey;
    const count = String(rows.filter(row => matchesStatusFilter(row, filter)).length);
    const counter = button.querySelector('.Counter');

    button.classList.toggle('selected', isActive);
    if (button.getAttribute('aria-pressed') !== String(isActive)) {
      button.setAttribute('aria-pressed', String(isActive));
    }
    if (counter.textContent !== count) counter.textContent = count;
  });
}

function createStatusButton({ key, label }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm BtnGroup-item';
  button.dataset.status = key;
  button.setAttribute('aria-pressed', 'false');

  const counter = document.createElement('span');
  counter.className = 'Counter ml-1';

  button.append(label, counter);
  button.addEventListener('click', () => {
    activeStatusKey = key;
    applyStatusFilter();
  });
  return button;
}

function createSelectShownButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm';
  button.textContent = 'Select shown';
  button.addEventListener('click', () => {
    getRows()
      .filter(row => !isRowHidden(row))
      .forEach(row => {
        setRowChecked(row, true);
      });
  });
  return button;
}

function createFilterBar() {
  const filterBar = document.createElement('div');
  filterBar.id = STATUS_FILTER_ID;
  filterBar.className = 'd-flex flex-wrap flex-items-center mb-3';

  const group = document.createElement('div');
  group.className = 'BtnGroup mr-2';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Filter notifications by status');
  group.append(...STATUS_FILTERS.map(createStatusButton));

  filterBar.append(group, createSelectShownButton());
  return filterBar;
}

function addStatusFilter() {
  if (!isNotificationsPage() || document.getElementById(STATUS_FILTER_ID)) return;

  const notificationsList = document.querySelector('.js-notifications-list');
  if (!notificationsList) return;

  notificationsList.parentElement.insertBefore(createFilterBar(), notificationsList);
  applyStatusFilter();
}

// GitHub's own "select all" checkbox also checks hidden rows; undo that once its handler has run.
document.addEventListener('change', event => {
  if (!event.target.matches?.('.js-notifications-mark-all-prompt')) return;
  setTimeout(uncheckHiddenRows);
});

let isFilterScheduled = false;

const statusFilterObserver = new MutationObserver(() => {
  if (!isNotificationsPage() || isFilterScheduled) return;

  isFilterScheduled = true;
  requestAnimationFrame(() => {
    isFilterScheduled = false;
    addStatusFilter();
    applyStatusFilter();
  });
});

statusFilterObserver.observe(document.body, {
  childList: true,
  subtree: true
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addStatusFilter);
} else {
  addStatusFilter();
}
