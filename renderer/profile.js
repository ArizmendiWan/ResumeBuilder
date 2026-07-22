import { button, checkbox, esc, field } from './dom.js';

export function renderProfile(state) {
  const profile = state.project.profile;
  const links = profile.links || [];
  const indexedLinks = links.map((link, idx) => ({ link, idx }));
  const github = indexedLinks.find(entry => entry.link.kind === 'github');
  const linkedin = indexedLinks.find(entry => entry.link.kind === 'linkedin');
  const customLinks = indexedLinks.filter(entry => entry.link.kind === 'custom');
  return `
    <div class="editor-section">
      <div class="section-header">
        <div>
          <div class="section-label">Profile</div>
          <h2>Header information</h2>
        </div>
      </div>
      <div class="form-grid">
        ${field({ label: 'Name', value: profile.name, onInput: "updateProfile('name', this.value)" })}
        ${field({ label: 'Location', value: profile.location, onInput: "updateProfile('location', this.value)" })}
        ${field({ label: 'Email', type: 'email', value: profile.email, onInput: "updateProfile('email', this.value)" })}
        ${field({ label: 'Phone', value: profile.phone, onInput: "updateProfile('phone', this.value)" })}
      </div>
    </div>

    <div class="editor-section">
      <div class="section-header">
        <div>
          <div class="section-label">Social link</div>
          <h2>GitHub</h2>
        </div>
      </div>
      <div class="inspector-list">
        ${github ? renderSocialLink(github) : '<div class="list-empty">GitHub settings unavailable.</div>'}
      </div>
    </div>

    <div class="editor-section">
      <div class="section-header">
        <div>
          <div class="section-label">Social link</div>
          <h2>LinkedIn</h2>
        </div>
      </div>
      <div class="inspector-list">
        ${linkedin ? renderSocialLink(linkedin) : '<div class="list-empty">LinkedIn settings unavailable.</div>'}
      </div>
    </div>

    <div class="editor-section">
      <div class="section-header">
        <div>
          <div class="section-label">Links</div>
          <h2>Other links</h2>
        </div>
        ${button({ label: 'Add Link', iconName: 'add', className: 'button-sm', onClick: 'addLink()' })}
      </div>
      <div class="inspector-list">
        ${customLinks.length ? customLinks.map(renderLink).join('') : '<div class="list-empty">No other links yet.</div>'}
      </div>
    </div>
  `;
}

function renderSocialLink({ link, idx }) {
  return `<div class="compact-card">
    <div class="compact-card-header">
      ${checkbox({ checked: link.enabled, label: 'Show', onChange: `updateLink(${idx}, 'enabled', this.checked)` })}
      <div class="compact-title">${esc(link.label)}</div>
    </div>
    ${renderLinkFields(link, idx)}
  </div>`;
}

function renderLink({ link, idx }) {
  return `<div class="compact-card">
    <div class="compact-card-header">
      ${checkbox({ checked: link.enabled, label: 'Show', onChange: `updateLink(${idx}, 'enabled', this.checked)` })}
      <div class="compact-title">${esc(link.label || 'Link')}</div>
      ${button({ iconName: 'delete', className: 'icon-button danger', title: 'Delete link', onClick: `deleteLink(${idx})` })}
    </div>
    ${renderLinkFields(link, idx)}
  </div>`;
}

function renderLinkFields(link, idx) {
  return `<div class="form-grid">
    ${field({ label: 'Display text', value: link.label, onInput: `updateLink(${idx}, 'label', this.value)` })}
    ${field({ label: 'URL', type: 'url', value: link.url, onInput: `updateLink(${idx}, 'url', this.value)` })}
  </div>`;
}

window.updateProfile = (key, value) => {
  window.state.project.profile[key] = value;
  window.markDirty();
};

window.updateLink = (idx, key, value) => {
  window.state.project.profile.links[idx][key] = value;
  window.markDirty();
  if (key === 'enabled') window.rerender();
};

window.addLink = () => {
  window.state.project.profile.links.push({ id: `link-${Date.now()}`, kind: 'custom', label: 'Link', url: '', enabled: true });
  window.markDirty();
  window.rerender();
};

window.deleteLink = (idx) => {
  window.state.project.profile.links.splice(idx, 1);
  window.markDirty();
  window.rerender();
};
