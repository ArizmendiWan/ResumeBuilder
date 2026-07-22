import { esc } from './dom.js';

const GROUPS = [
  { title: 'Page Margins', items: [
    { key: 'pageTop', label: 'Top', min: 0.3, max: 3, step: 0.05, unit: 'cm' },
    { key: 'pageBottom', label: 'Bottom', min: 0.3, max: 3, step: 0.05, unit: 'cm' },
    { key: 'pageLeft', label: 'Left', min: 0.3, max: 3, step: 0.05, unit: 'cm' },
    { key: 'pageRight', label: 'Right', min: 0.3, max: 3, step: 0.05, unit: 'cm' },
  ]},
  { title: 'Spacing', items: [
    { key: 'sectionTop', label: 'Section top', min: 0, max: 1, step: 0.02, unit: 'cm' },
    { key: 'sectionBottom', label: 'Section bottom', min: 0, max: 1, step: 0.02, unit: 'cm' },
    { key: 'bulletTopsep', label: 'Bullet top', min: 0, max: 0.5, step: 0.01, unit: 'cm' },
    { key: 'bulletParsep', label: 'Bullet gap', min: 0, max: 0.5, step: 0.01, unit: 'cm' },
  ]},
  { title: 'Header', items: [
    { key: 'headerFontSize', label: 'Name size', min: 10, max: 36, step: 1, unit: 'pt' },
    { key: 'headerContactFontSize', label: 'Contact size', min: 7, max: 16, step: 0.5, unit: 'pt' },
    { key: 'headerSepKern', label: 'Separator gap', min: 1, max: 20, step: 0.5, unit: 'pt' },
  ]},
  { title: 'Font Sizes', items: [
    { key: 'bodyFontSize', label: 'Body', min: 7, max: 14, step: 0.5, unit: 'pt' },
    { key: 'sectionFontSize', label: 'Section heading', min: 7, max: 16, step: 0.5, unit: 'pt' },
    { key: 'entryTitleFontSize', label: 'Entry title', min: 7, max: 16, step: 0.5, unit: 'pt' },
    { key: 'entryMetaFontSize', label: 'Entry meta/date', min: 7, max: 14, step: 0.5, unit: 'pt' },
    { key: 'bulletFontSize', label: 'Bullets', min: 7, max: 14, step: 0.5, unit: 'pt' },
    { key: 'skillFontSize', label: 'Skills', min: 7, max: 14, step: 0.5, unit: 'pt' },
  ]},
];

export function renderLayout(state) {
  return `<div class="layout-editor">
    <div class="editor-section">
      <div class="section-header">
        <div>
          <div class="section-label">Layout</div>
          <h2>Template controls</h2>
        </div>
      </div>
      ${GROUPS.map(group => `<div class="layout-group">
        <h3>${esc(group.title)}</h3>
        ${group.items.map(item => renderControl(state.project.layout, item)).join('')}
      </div>`).join('')}
    </div>
  </div>`;
}

function renderControl(layout, item) {
  const value = layout[item.key];
  return `<div class="layout-control">
    <label>${esc(item.label)}</label>
    <input type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${esc(value)}" oninput="updateLayout('${item.key}', this.value)">
    <input type="number" min="${item.min}" max="${item.max}" step="${item.step}" value="${esc(value)}" onchange="updateLayout('${item.key}', this.value)">
    <span>${esc(item.unit)}</span>
  </div>`;
}

window.updateLayout = (key, value) => {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return;
  window.state.project.layout[key] = parsed;
  window.markDirty();
  window.rerender();
};
