const assert = require('node:assert/strict');
const test = require('node:test');

function installDomStubs() {
  global.document = {
    createElement() {
      return {
        innerHTML: '',
        set textContent(value) {
          this.innerHTML = String(value ?? '');
        },
      };
    },
  };
  global.window = {};
}

test('renders dedicated GitHub and LinkedIn settings separately from other links', async () => {
  installDomStubs();
  const { renderProfile } = await import('../renderer/profile.js');
  const state = {
    project: {
      profile: {
        name: 'Ada Lovelace',
        location: 'London',
        email: 'ada@example.com',
        phone: '',
        links: [
          { id: 'github', kind: 'github', label: 'ada_l', url: 'https://github.com/ada_l', enabled: true },
          { id: 'linkedin', kind: 'linkedin', label: 'ada-lovelace', url: 'https://linkedin.com/in/ada-lovelace', enabled: true },
          { id: 'portfolio', kind: 'custom', label: 'Portfolio', url: 'https://ada.example.com', enabled: true },
        ],
      },
    },
  };

  const html = renderProfile(state);

  assert.match(html, /<h2>GitHub<\/h2>/);
  assert.match(html, /<h2>LinkedIn<\/h2>/);
  assert.match(html, /<h2>Other links<\/h2>/);
  assert.match(html, /ada_l/);
  assert.match(html, /ada-lovelace/);
  assert.match(html, /Portfolio/);
});
