import { renderStartup } from './startup.js';
import { renderProfile } from './profile.js';
import { renderContent, ensureSelection } from './content.js';
import { renderLayout } from './layout.js';
import { button, esc } from './dom.js';

export const state = {
  project: null,
  projectDir: null,
  pdfPath: null,
  dirty: false,
  busy: false,
  activeTab: 'content',
  status: '',
  statusKind: '',
  previewStatus: '',
  selectedSectionId: 'experience',
  selectedItem: {},
  expandedSections: {},
};

window.state = state;

function setStatus(text = '', kind = '') {
  state.status = text;
  state.statusKind = kind;
  renderStatus();
}

function setDirty(value = true) {
  state.dirty = value;
  setStatus(value ? 'Unsaved changes' : '', value ? 'dirty' : '');
}

function setBusy(value) {
  state.busy = value;
  renderShell();
}

function getApi() {
  if (!window.api) throw new Error('Electron preload API is not available.');
  return window.api;
}

function root() {
  return document.getElementById('app');
}

function activeProjectName() {
  if (!state.projectDir) return '';
  return state.projectDir.split('/').filter(Boolean).pop();
}

function renderStatus() {
  const status = document.getElementById('statusLine');
  if (status) status.className = `status ${state.statusKind || ''}`;
  if (status) status.textContent = state.status || (state.dirty ? 'Unsaved changes' : '');
}

function renderPreview() {
  const frame = document.getElementById('pdfFrame');
  const empty = document.getElementById('previewEmpty');
  const status = document.getElementById('previewStatus');
  if (status) status.textContent = state.previewStatus || '';
  if (!frame || !empty) return;
  if (state.pdfPath) {
    frame.src = `file://${encodeURI(state.pdfPath)}?t=${Date.now()}`;
    frame.hidden = false;
    empty.hidden = true;
  } else {
    frame.hidden = true;
    empty.hidden = false;
  }
}

function renderShell() {
  root().innerHTML = `
    <div class="app-shell">
      <aside class="editor-pane">
        <div class="window-drag toolbar">
          <div class="project-meta">
            <div class="eyebrow">Resume Builder</div>
            <div class="project-name" title="${esc(state.projectDir || '')}">${esc(activeProjectName())}</div>
          </div>
          <div class="toolbar-actions">
            <div class="zoom-controls" aria-label="App zoom controls">
              ${button({ label: 'A-', className: 'button-sm zoom-button', title: 'Zoom out', onClick: "zoomApp('out')" })}
              ${button({ label: '100%', className: 'button-sm zoom-button zoom-reset', title: 'Reset zoom', onClick: "zoomApp('reset')" })}
              ${button({ label: 'A+', className: 'button-sm zoom-button', title: 'Zoom in', onClick: "zoomApp('in')" })}
            </div>
            ${button({ label: 'Switch', className: 'button-sm', iconName: 'folder', onClick: 'showStartup()' })}
            ${button({ label: 'Folder', className: 'button-sm', iconName: 'open', onClick: 'openProjectFolder()' })}
          </div>
        </div>

        <div class="tab-strip" role="tablist">
          ${tabButton('Profile', 'profile')}
          ${tabButton('Content', 'content')}
          ${tabButton('Layout', 'layout')}
        </div>

        <div class="editor-scroll" id="editorRoot"></div>

        <div class="bottom-bar">
          <div id="statusLine" class="status ${state.statusKind || ''}">${esc(state.status || '')}</div>
          <div class="bottom-actions">
            ${button({ label: 'Save', iconName: 'save', disabled: state.busy || !state.dirty, onClick: 'saveProject()' })}
            ${button({ label: 'Compile', iconName: 'compile', className: 'primary', disabled: state.busy, onClick: 'compileProject()' })}
          </div>
        </div>
      </aside>

      <section class="preview-pane">
        <div class="window-drag preview-toolbar">
          <div>
            <div class="preview-title">PDF Preview</div>
            <div id="previewStatus" class="preview-subtitle">${esc(state.previewStatus || '')}</div>
          </div>
          <div class="preview-actions">
            ${button({ label: 'Export', iconName: 'download', disabled: state.busy || !state.pdfPath, onClick: 'exportPdf()' })}
          </div>
        </div>
        <div class="preview-body">
          <div id="previewEmpty" class="preview-empty">
            <div class="empty-title">No compiled PDF</div>
            <div class="empty-detail">Compile the resume to refresh the preview.</div>
          </div>
          <iframe id="pdfFrame" title="PDF preview"></iframe>
        </div>
      </section>
    </div>
  `;
  renderCurrentTab();
  renderPreview();
  renderStatus();
}

function tabButton(label, id) {
  const active = state.activeTab === id ? 'active' : '';
  return `<button class="tab ${active}" onclick="switchTab('${id}')" role="tab" aria-selected="${state.activeTab === id}">${esc(label)}</button>`;
}

function readEditorScrollState() {
  const target = document.getElementById('editorRoot');
  if (!target) return null;
  return {
    root: target.scrollTop,
    outline: target.querySelector('.outline-panel')?.scrollTop || 0,
    inspector: target.querySelector('.inspector-panel')?.scrollTop || 0,
  };
}

function restoreEditorScrollState(scrollState) {
  if (!scrollState) return;
  const target = document.getElementById('editorRoot');
  if (!target) return;
  target.scrollTop = scrollState.root;
  const outline = target.querySelector('.outline-panel');
  if (outline) outline.scrollTop = scrollState.outline;
  const inspector = target.querySelector('.inspector-panel');
  if (inspector) inspector.scrollTop = scrollState.inspector;
}

function renderCurrentTab({ preserveScroll = true } = {}) {
  const target = document.getElementById('editorRoot');
  if (!target || !state.project) return;
  const scrollState = preserveScroll ? readEditorScrollState() : null;
  target.className = `editor-scroll ${state.activeTab === 'content' ? 'content-scroll-root' : ''}`;
  if (state.activeTab === 'profile') target.innerHTML = renderProfile(state);
  if (state.activeTab === 'content') {
    ensureSelection(state);
    target.innerHTML = renderContent(state);
  }
  if (state.activeTab === 'layout') target.innerHTML = renderLayout(state);
  restoreEditorScrollState(scrollState);
}

function applyState(next) {
  state.project = next.project;
  state.projectDir = next.projectDir;
  state.pdfPath = next.pdfPath || null;
  state.dirty = false;
  state.status = '';
  state.statusKind = '';
  state.previewStatus = '';
  state.selectedSectionId = state.project?.sections?.find(section => section.enabled)?.id || 'profile';
  state.selectedItem = {};
  state.expandedSections = {};
  ensureSelection(state);
  renderShell();
}

function showError(result) {
  const message = result?.error || 'Unknown error';
  setStatus(message, 'error');
  state.previewStatus = 'Error';
  renderPreview();
  if (result?.details && result.details.length > 400) console.error(result.details);
}

function normalizeResult(result) {
  if (!result || result.canceled) return null;
  if (result.error) {
    showError(result);
    return null;
  }
  return result;
}

async function init() {
  try {
    const appState = await getApi().getState();
    if (appState?.projectDir) applyState(appState);
    else renderStartup();
  } catch (err) {
    root().innerHTML = `<div class="fatal">${esc(err.message)}</div>`;
  }
}

window.showStartup = renderStartup;
window.switchTab = (tab) => {
  state.activeTab = tab;
  renderShell();
};
window.markDirty = () => setDirty(true);
window.rerender = () => renderCurrentTab({ preserveScroll: true });
window.applySelection = (sectionId, itemId = '') => {
  state.selectedSectionId = sectionId;
  state.expandedSections[sectionId] = true;
  state.selectedItem[sectionId] = itemId;
  renderCurrentTab({ preserveScroll: true });
};

window.createProject = async () => {
  const result = normalizeResult(await getApi().createProject());
  if (result?.projectDir) applyState(result);
};
window.openProject = async () => {
  const result = normalizeResult(await getApi().openProject());
  if (result?.projectDir) applyState(result);
};
window.openRecent = async (idx) => {
  const entry = window.__recentProjects?.[idx];
  if (!entry) return;
  const result = normalizeResult(await getApi().openRecentProject(entry.path));
  if (result?.projectDir) applyState(result);
};
window.removeRecent = async (idx) => {
  const entry = window.__recentProjects?.[idx];
  if (!entry) return;
  await getApi().removeRecentProject(entry.path);
  renderStartup();
};
window.openProjectFolder = () => getApi().openProjectFolder();

window.zoomApp = async (action) => {
  const result = await getApi().appZoom(action);
  if (result?.zoomFactor) {
    setStatus(`Zoom ${Math.round(result.zoomFactor * 100)}%`, 'ok');
  }
};

window.saveProject = async () => {
  if (!state.project) return;
  setBusy(true);
  setStatus('Saving...');
  const result = normalizeResult(await getApi().saveProject(state.project));
  setBusy(false);
  if (!result) return;
  state.project = result.project;
  state.dirty = false;
  setStatus('Saved', 'ok');
  renderShell();
};

window.compileProject = async () => {
  if (!state.project) return;
  setBusy(true);
  state.previewStatus = 'Compiling...';
  setStatus('Rendering LaTeX...');
  renderPreview();
  const result = normalizeResult(await getApi().compile(state.project));
  setBusy(false);
  if (!result) return;
  state.project = result.project;
  state.pdfPath = result.pdfPath;
  state.dirty = false;
  state.previewStatus = '';
  setStatus('Compiled', 'ok');
  renderShell();
};

window.exportPdf = async () => {
  if (!state.project) return;
  setBusy(true);
  setStatus('Exporting...');
  const result = await getApi().exportPdf(state.project);
  setBusy(false);
  if (result?.canceled) {
    setStatus('');
    return;
  }
  if (result?.error) return showError(result);
  setStatus(`Exported to ${result.destinationPath}`, 'ok');
};

init();
