import { button, esc } from './dom.js';

export async function renderStartup() {
  const root = document.getElementById('app');
  const recent = await window.api.getRecentProjects();
  window.__recentProjects = recent || [];
  root.innerHTML = `
    <div class="startup-screen">
      <section class="startup-panel window-drag">
        <div class="startup-copy">
          <div class="eyebrow">LaTeX Resume Builder</div>
          <h1>Resume Builder</h1>
          <p>Create, edit, compile, and export structured LaTeX resume projects.</p>
        </div>
        <div class="startup-actions">
          ${button({ label: 'New Project', iconName: 'plusCircle', className: 'primary', onClick: 'createProject()' })}
          ${button({ label: 'Open Project', iconName: 'folder', onClick: 'openProject()' })}
        </div>
        <div class="recent-panel">
          <div class="section-label">Recent</div>
          ${renderRecent(window.__recentProjects)}
        </div>
      </section>
    </div>
  `;
}

function renderRecent(recent) {
  if (!recent || !recent.length) {
    return `<div class="recent-empty">No recent builder projects.</div>`;
  }
  return `<div class="recent-list">
    ${recent.map((entry, idx) => `
      <div class="recent-row" onclick="openRecent(${idx})" role="button" tabindex="0">
        <span>
          <strong>${esc(entry.name)}</strong>
          <small>${esc(entry.path)}</small>
        </span>
        <span class="recent-row-actions">
          <span class="open-hint">Open</span>
          ${button({ iconName: 'delete', className: 'icon-button danger inline', title: 'Remove recent project', onClick: `event.stopPropagation(); removeRecent(${idx})` })}
        </span>
      </div>
    `).join('')}
  </div>`;
}
