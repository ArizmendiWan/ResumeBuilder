import { button, checkbox, emptyState, esc, field, moveButtons, textareaField } from './dom.js';

const SECTION_META = {
  education: { label: 'Education', add: 'Add Education', title: item => item.school || 'Education' },
  experience: { label: 'Experience', add: 'Add Experience', title: item => item.title || 'Experience' },
  projects: { label: 'Projects', add: 'Add Project', title: item => item.title || 'Project' },
  publications: { label: 'Publications', add: 'Add Publication', title: item => item.title || 'Publication' },
  skills: { label: 'Skills', add: 'Add Skill Group', title: item => item.label || 'Skill Group' },
};

export function ensureSelection(state) {
  const sections = state.project?.sections || [];
  if (!sections.some(section => section.id === state.selectedSectionId)) {
    state.selectedSectionId = sections[0]?.id || 'education';
  }
  for (const section of sections) {
    if (state.expandedSections[section.id] == null) {
      state.expandedSections[section.id] = section.id === state.selectedSectionId;
    }
  }
  const items = getItems(state.project, state.selectedSectionId);
  const selected = state.selectedItem[state.selectedSectionId];
  if (!items.length) {
    state.selectedItem[state.selectedSectionId] = '';
    return;
  }
  if (!items.some(item => item.id === selected)) {
    state.selectedItem[state.selectedSectionId] = items[0].id;
  }
}

export function renderContent(state) {
  ensureSelection(state);
  const section = state.project.sections.find(entry => entry.id === state.selectedSectionId);
  const items = getItems(state.project, state.selectedSectionId);
  const selectedId = state.selectedItem[state.selectedSectionId];
  const selectedIndex = items.findIndex(item => item.id === selectedId);
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  return `<div class="content-workspace">
    <section class="outline-panel">
      <div class="pane-header">
        <div>
          <div class="section-label">Outline</div>
          <h2>Resume contents</h2>
        </div>
      </div>
      <div class="outline-list" tabindex="0">
        ${state.project.sections.map((entry, idx) => renderOutlineSection(entry, idx, state)).join('')}
      </div>
    </section>

    <section class="inspector-panel">
      ${renderSectionTools(section)}
      <div class="inspector-body" tabindex="0">
        ${selectedItem ? renderInspector(section.id, selectedItem, selectedIndex) : emptyState('Nothing selected', 'Choose or add an item to edit details.')}
      </div>
    </section>
  </div>`;
}

function getItems(project, sectionId) {
  return Array.isArray(project?.[sectionId]) ? project[sectionId] : [];
}

function itemCount(project, sectionId) {
  return getItems(project, sectionId).length;
}

function enabledItemCount(project, sectionId) {
  return getItems(project, sectionId).filter(item => item.enabled).length;
}

function renderOutlineSection(section, idx, state) {
  const active = section.id === state.selectedSectionId ? 'active' : '';
  const expanded = !!state.expandedSections[section.id];
  const items = getItems(state.project, section.id);
  return `<div class="outline-section ${active}">
    <div class="outline-section-head">
      ${button({ iconName: 'chevronRight', className: `icon-button disclosure ${expanded ? 'expanded' : ''}`, title: expanded ? 'Collapse section' : 'Expand section', onClick: `toggleSectionOpen('${section.id}')` })}
      <button class="outline-section-pick" onclick="applySelection('${section.id}')">
        <span>${esc(section.label)}</span>
        <small>${enabledItemCount(state.project, section.id)}/${itemCount(state.project, section.id)}</small>
      </button>
      <div class="outline-actions">
        ${checkbox({ checked: section.enabled, onChange: `updateSection(${idx}, 'enabled', this.checked)`, className: 'mini-check' })}
        ${button({ iconName: 'arrowUp', className: 'icon-button subtle', title: 'Move section up', disabled: idx === 0, onClick: `moveSection(${idx}, -1)` })}
        ${button({ iconName: 'arrowDown', className: 'icon-button subtle', title: 'Move section down', disabled: idx === state.project.sections.length - 1, onClick: `moveSection(${idx}, 1)` })}
        ${button({ iconName: 'add', className: 'icon-button', title: SECTION_META[section.id]?.add || 'Add item', onClick: `addItem('${section.id}')` })}
      </div>
    </div>
    ${expanded ? `<div class="outline-items">
      ${items.length ? items.map((item, itemIdx) => renderOutlineItem(section.id, item, itemIdx, items.length, state.selectedItem[section.id])).join('') : '<div class="outline-empty">No items</div>'}
    </div>` : ''}
  </div>`;
}

function renderOutlineItem(kind, item, idx, length, selectedId) {
  const selected = item.id === selectedId ? 'selected' : '';
  const title = SECTION_META[kind]?.title(item) || 'Item';
  const subtitle = item.date || item.organization || item.items || item.venue || '';
  return `<div class="outline-item ${selected} ${item.enabled ? '' : 'disabled-item'}">
    <button class="outline-item-pick" onclick="applySelection('${kind}', '${item.id}')">
      <span>${esc(title)}</span>
      ${subtitle ? `<small>${esc(subtitle)}</small>` : ''}
    </button>
    <div class="outline-item-actions">
      ${checkbox({ checked: item.enabled, onChange: `updateItem('${kind}', ${idx}, 'enabled', this.checked)`, className: 'mini-check' })}
      ${moveButtons(kind, idx, length)}
      ${button({ iconName: 'copy', className: 'icon-button', title: 'Duplicate item', onClick: `duplicateItem('${kind}', ${idx})` })}
      ${button({ iconName: 'delete', className: 'icon-button danger', title: 'Delete item', onClick: `deleteItem('${kind}', ${idx})` })}
    </div>
  </div>`;
}

function renderSectionTools(section) {
  if (!section) return '';
  const idx = window.state.project.sections.findIndex(entry => entry.id === section.id);
  return `<div class="section-tools">
    <div>
      <div class="section-label">Section</div>
      <h2>${esc(SECTION_META[section.id]?.label || section.id)}</h2>
    </div>
    <div class="section-tool-actions">
      ${button({ label: SECTION_META[section.id]?.add || 'Add Item', iconName: 'add', className: 'button-sm', onClick: `addItem('${section.id}')` })}
    </div>
    <label class="field section-label-edit">
      <span>Resume section label</span>
      <input type="text" value="${esc(section.label)}" oninput="updateSelectedSectionLabel(this.value)">
    </label>
  </div>`;
}

function renderInspector(kind, item, idx) {
  if (kind === 'education') return renderEducationInspector(item, idx);
  if (kind === 'skills') return renderSkillInspector(item, idx);
  if (kind === 'publications') return renderPublicationInspector(item, idx);
  if (kind === 'projects') return renderProjectInspector(item, idx);
  return renderExperienceInspector(kind, item, idx);
}

function inspectorHeader(title, enabled, kind, idx) {
  return `<div class="inspector-header">
    <div>
      <div class="section-label">Inspector</div>
      <h2>${esc(title)}</h2>
    </div>
    ${checkbox({ checked: enabled, label: 'Enabled', onChange: `updateItem('${kind}', ${idx}, 'enabled', this.checked)` })}
  </div>`;
}

function renderEducationInspector(item, idx) {
  return `${inspectorHeader(item.school || 'Education', item.enabled, 'education', idx)}
    <div class="form-grid">
      ${field({ label: 'School', value: item.school, onInput: `updateItem('education', ${idx}, 'school', this.value)` })}
      ${field({ label: 'Location', value: item.location, onInput: `updateItem('education', ${idx}, 'location', this.value)` })}
      ${field({ label: 'Degree', value: item.degree, className: 'span-2', onInput: `updateItem('education', ${idx}, 'degree', this.value)` })}
      ${field({ label: 'Date range', value: item.date, className: 'span-2', onInput: `updateItem('education', ${idx}, 'date', this.value)` })}
      ${textareaField({ label: 'Details / coursework', value: (item.details || []).join('\n'), className: 'span-2', rows: 4, onInput: `updateEducationDetails(${idx}, this.value)` })}
    </div>`;
}

function renderSkillInspector(item, idx) {
  return `${inspectorHeader(item.label || 'Skill Group', item.enabled, 'skills', idx)}
    <div class="form-grid">
      ${field({ label: 'Label', value: item.label, onInput: `updateItem('skills', ${idx}, 'label', this.value)` })}
      ${field({ label: 'Items', value: item.items, onInput: `updateItem('skills', ${idx}, 'items', this.value)` })}
    </div>`;
}

function renderPublicationInspector(item, idx) {
  return `${inspectorHeader(item.title || 'Publication', item.enabled, 'publications', idx)}
    <div class="form-grid">
      ${field({ label: 'Title', value: item.title, className: 'span-2', onInput: `updateItem('publications', ${idx}, 'title', this.value)` })}
      ${field({ label: 'Date', value: item.date, onInput: `updateItem('publications', ${idx}, 'date', this.value)` })}
      ${field({ label: 'Venue', value: item.venue, onInput: `updateItem('publications', ${idx}, 'venue', this.value)` })}
      ${field({ label: 'Link label', value: item.linkLabel, onInput: `updateItem('publications', ${idx}, 'linkLabel', this.value)` })}
      ${field({ label: 'Link URL', type: 'url', value: item.linkUrl, onInput: `updateItem('publications', ${idx}, 'linkUrl', this.value)` })}
      ${textareaField({ label: 'Authors', value: item.authors, className: 'span-2', onInput: `updateItem('publications', ${idx}, 'authors', this.value)` })}
    </div>`;
}

function renderExperienceInspector(kind, item, idx) {
  return `${inspectorHeader(item.title || 'Experience', item.enabled, kind, idx)}
    <div class="form-grid">
      ${field({ label: 'Title', value: item.title, onInput: `updateItem('${kind}', ${idx}, 'title', this.value)` })}
      ${field({ label: 'Organization', value: item.organization, onInput: `updateItem('${kind}', ${idx}, 'organization', this.value)` })}
      ${field({ label: 'Location', value: item.location, onInput: `updateItem('${kind}', ${idx}, 'location', this.value)` })}
      ${field({ label: 'Date range', value: item.date, onInput: `updateItem('${kind}', ${idx}, 'date', this.value)` })}
    </div>
    ${renderBullets(kind, idx, item.bullets || [])}`;
}

function renderProjectInspector(item, idx) {
  return `${inspectorHeader(item.title || 'Project', item.enabled, 'projects', idx)}
    <div class="form-grid">
      ${field({ label: 'Title', value: item.title, onInput: `updateItem('projects', ${idx}, 'title', this.value)` })}
      ${field({ label: 'Date range', value: item.date, onInput: `updateItem('projects', ${idx}, 'date', this.value)` })}
      ${field({ label: 'Link label', value: item.linkLabel, onInput: `updateItem('projects', ${idx}, 'linkLabel', this.value)` })}
      ${field({ label: 'Link URL', type: 'url', value: item.linkUrl, onInput: `updateItem('projects', ${idx}, 'linkUrl', this.value)` })}
      ${textareaField({ label: 'Description', value: item.description, className: 'span-2', onInput: `updateItem('projects', ${idx}, 'description', this.value)` })}
    </div>
    ${renderBullets('projects', idx, item.bullets || [])}`;
}

function renderBullets(kind, entryIndex, bullets) {
  return `<div class="bullet-editor">
    <div class="subhead">
      <span>Bullets</span>
      ${button({ label: 'Add Bullet', iconName: 'add', className: 'button-sm', onClick: `addBullet('${kind}', ${entryIndex})` })}
    </div>
    ${bullets.length ? bullets.map((bullet, idx) => `
      <div class="bullet-row">
        ${checkbox({ checked: bullet.enabled, onChange: `updateBullet('${kind}', ${entryIndex}, ${idx}, 'enabled', this.checked)`, className: 'mini-check' })}
        <textarea rows="2" oninput="updateBullet('${kind}', ${entryIndex}, ${idx}, 'text', this.value)">${esc(bullet.text)}</textarea>
        ${button({ iconName: 'arrowUp', className: 'icon-button', title: 'Move bullet up', disabled: idx === 0, onClick: `moveBullet('${kind}', ${entryIndex}, ${idx}, -1)` })}
        ${button({ iconName: 'arrowDown', className: 'icon-button', title: 'Move bullet down', disabled: idx === bullets.length - 1, onClick: `moveBullet('${kind}', ${entryIndex}, ${idx}, 1)` })}
        ${button({ iconName: 'delete', className: 'icon-button danger', title: 'Delete bullet', onClick: `deleteBullet('${kind}', ${entryIndex}, ${idx})` })}
      </div>`).join('') : '<div class="list-empty">No bullets yet.</div>'}
  </div>`;
}

function touchContent() {
  window.markDirty();
  window.rerender();
}

function moveArrayItem(list, idx, delta) {
  const next = idx + delta;
  if (!Array.isArray(list) || next < 0 || next >= list.length) return false;
  const [item] = list.splice(idx, 1);
  list.splice(next, 0, item);
  return true;
}

window.updateSection = (idx, key, value) => {
  window.state.project.sections[idx][key] = value;
  touchContent();
};

window.updateSelectedSectionLabel = (value) => {
  const idx = window.state.project.sections.findIndex(section => section.id === window.state.selectedSectionId);
  if (idx < 0) return;
  window.state.project.sections[idx].label = value;
  window.markDirty();
};

window.moveSection = (idx, delta) => {
  if (!moveArrayItem(window.state.project.sections, idx, delta)) return;
  touchContent();
};

window.toggleSectionOpen = (sectionId) => {
  window.state.expandedSections[sectionId] = !window.state.expandedSections[sectionId];
  window.rerender();
};

window.updateItem = (kind, idx, key, value) => {
  const item = window.state.project[kind][idx];
  item[key] = value;
  if (kind === 'education' && key === 'degree') item.degreeLatex = '';
  if (kind === 'projects' && key === 'description') item.descriptionLatex = '';
  if (kind === 'publications' && key === 'authors') item.authorsLatex = '';
  window.markDirty();
  if (key === 'enabled') window.rerender();
};

window.updateEducationDetails = (idx, value) => {
  window.state.project.education[idx].details = value.split('\n').map(line => line.trim()).filter(Boolean);
  window.markDirty();
};

window.moveItem = (kind, idx, delta) => {
  const list = window.state.project[kind];
  const selected = list[idx]?.id;
  if (!moveArrayItem(list, idx, delta)) return;
  window.state.selectedItem[kind] = selected;
  touchContent();
};

window.duplicateItem = (kind, idx) => {
  const source = window.state.project[kind][idx];
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = `${kind}-${Date.now()}`;
  if (copy.title) copy.title = `${copy.title} Copy`;
  if (copy.school) copy.school = `${copy.school} Copy`;
  if (copy.label) copy.label = `${copy.label} Copy`;
  window.state.project[kind].splice(idx + 1, 0, copy);
  window.state.selectedItem[kind] = copy.id;
  touchContent();
};

window.deleteItem = (kind, idx) => {
  window.state.project[kind].splice(idx, 1);
  window.state.selectedItem[kind] = window.state.project[kind][Math.max(0, idx - 1)]?.id || '';
  touchContent();
};

window.addItem = (kind) => {
  const item = makeItem(kind);
  window.state.project[kind].push(item);
  window.state.selectedItem[kind] = item.id;
  touchContent();
};

window.updateBullet = (kind, entryIndex, bulletIndex, key, value) => {
  const bullet = window.state.project[kind][entryIndex].bullets[bulletIndex];
  bullet[key] = value;
  if (key === 'text') bullet.latex = '';
  window.markDirty();
};

window.addBullet = (kind, entryIndex) => {
  window.state.project[kind][entryIndex].bullets.push({ id: `bullet-${Date.now()}`, enabled: true, text: '' });
  touchContent();
};

window.deleteBullet = (kind, entryIndex, bulletIndex) => {
  window.state.project[kind][entryIndex].bullets.splice(bulletIndex, 1);
  touchContent();
};

window.moveBullet = (kind, entryIndex, bulletIndex, delta) => {
  const bullets = window.state.project[kind][entryIndex].bullets;
  if (!moveArrayItem(bullets, bulletIndex, delta)) return;
  touchContent();
};

function makeItem(kind) {
  const id = `${kind}-${Date.now()}`;
  if (kind === 'education') return { id, enabled: true, school: '', location: '', degree: '', date: '', details: [] };
  if (kind === 'skills') return { id, enabled: true, label: '', items: '' };
  if (kind === 'publications') return { id, enabled: true, title: '', date: '', venue: '', authors: '', linkLabel: '', linkUrl: '' };
  if (kind === 'projects') return { id, enabled: true, title: '', date: '', description: '', linkLabel: '', linkUrl: '', bullets: [] };
  return { id, enabled: true, title: '', organization: '', location: '', date: '', bullets: [] };
}
