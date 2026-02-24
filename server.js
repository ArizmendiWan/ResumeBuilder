const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));

const RESUME_DIR = process.env.RESUME_DIR || path.join(require('os').homedir(), 'Desktop', 'Resume');
const SEC_DIR = path.join(RESUME_DIR, 'sec');
const MAIN_TEX = path.join(RESUME_DIR, 'main.tex');

// ---- Bullet parsing ----

function parseBullets(filePath) {
  if (!fs.existsSync(filePath)) return { content: '', bullets: [] };
  const content = fs.readFileSync(filePath, 'utf-8');
  const bullets = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match \item or %\item (commented out)
    const m = line.match(/^(\s*)(%%?\s*)?\\item\s+(.*)/);
    if (m) {
      // An \item can span multiple lines until the next \item, \end, or blank structural line
      let text = m[3];
      let endLine = i;
      // Check for continuation lines
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next.match(/^\s*(%%?\s*)?\\item\s/) || next.match(/\\end\{/) || next.match(/^\s*$/) && lines[j+1]?.match(/\\end\{/)) break;
        if (next.trim() === '') break;
        text += ' ' + next.trim();
        endLine = j;
      }
      bullets.push({
        startLine: i,
        endLine,
        enabled: !m[2],
        text: text.trim(),
        indent: m[1],
      });
    }
  }
  return { content, lines, bullets };
}

function writeBullets(filePath, bulletUpdates) {
  // bulletUpdates: [{ index, enabled, text }]
  if (!fs.existsSync(filePath)) return;
  const { lines, bullets } = parseBullets(filePath);
  if (!bullets.length) return;

  // Process in reverse to preserve line numbers
  const sorted = [...bulletUpdates].sort((a, b) => b.index - a.index);
  for (const upd of sorted) {
    const bullet = bullets[upd.index];
    if (!bullet) continue;
    const indent = bullet.indent || '\t\t';
    const prefix = upd.enabled ? '' : '%';
    const newLine = `${indent}${prefix}\\item ${upd.text}`;
    // Replace the line range
    lines.splice(bullet.startLine, bullet.endLine - bullet.startLine + 1, newLine);
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

// ---- Section/item parsing ----

function parseSectionFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(%%?\s*)?\\input\{([^}]+)\}/);
    if (match) {
      const commented = !!match[2];
      const inputPath = match[3];
      const fullPath = path.resolve(RESUME_DIR, inputPath + (inputPath.endsWith('.tex') ? '' : '.tex'));
      let label = path.basename(inputPath, '.tex');
      let title = label;

      let bullets = [];
      if (fs.existsSync(fullPath)) {
        const subContent = fs.readFileSync(fullPath, 'utf-8');
        const cleaned = subContent.replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1');
        const fullLineMatch = cleaned.match(/\\textbf\{([^}]+)\}[,\s]*([^\n\\}]*)/);
        const titleMatch = cleaned.match(/\\textbf\{([^}]+)\}/);
        if (fullLineMatch && fullLineMatch[2].trim()) {
          title = (fullLineMatch[1] + ', ' + fullLineMatch[2].trim()).replace(/\\\&/g, '&').trim();
        } else if (titleMatch) {
          title = titleMatch[1].replace(/\\\&/g, '&').trim();
        }
        const dateMatch = cleaned.match(/(\w+ \d{4}\s*[-–—]\s*(?:\w+ \d{4}|Present))/);
        if (dateMatch) title += ` (${dateMatch[1]})`;

        // Parse bullets
        const parsed = parseBullets(fullPath);
        bullets = parsed.bullets.map(b => ({
          enabled: b.enabled,
          text: b.text,
        }));
      }

      items.push({ line: i, inputPath, commented, label, title, fullPath, bullets });
    }
  }
  return { filePath, lines, items };
}

function parseMainTex() {
  const content = fs.readFileSync(MAIN_TEX, 'utf-8');
  const lines = content.split('\n');
  const sections = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(%%?\s*)?\\input\{sec\/([^}]+)\}/);
    if (match) {
      const commented = !!match[2];
      const name = match[3];
      sections.push({ line: i, name, commented, label: name });
    }
  }
  return { lines, sections };
}

// ---- API: Resume structure ----

app.get('/api/resume', (req, res) => {
  const main = parseMainTex();
  const result = { sections: [] };

  for (const sec of main.sections) {
    const secFile = path.join(SEC_DIR, sec.name + (sec.name.endsWith('.tex') ? '' : '.tex'));
    let items = [];
    if (fs.existsSync(secFile)) {
      const parsed = parseSectionFile(secFile);
      items = parsed.items.map(it => ({
        inputPath: it.inputPath,
        label: it.label,
        title: it.title,
        enabled: !it.commented,
        bullets: it.bullets,
      }));
    }
    result.sections.push({ name: sec.name, enabled: !sec.commented, items });
  }

  res.json(result);
});

app.post('/api/resume', (req, res) => {
  const { sections } = req.body;

  // Update main.tex
  const mainContent = fs.readFileSync(MAIN_TEX, 'utf-8');
  const mainLines = mainContent.split('\n');

  for (const sec of sections) {
    for (let i = 0; i < mainLines.length; i++) {
      const match = mainLines[i].match(/^(\s*)(%\s*)?\\input\{sec\/([^}]+)\}/);
      if (match && match[3] === sec.name) {
        const indent = match[1];
        mainLines[i] = sec.enabled ? `${indent}\\input{sec/${sec.name}}` : `${indent}%\\input{sec/${sec.name}}`;
      }
    }
  }
  fs.writeFileSync(MAIN_TEX, mainLines.join('\n'));

  // Update each section file + bullet points
  for (const sec of sections) {
    if (!sec.items || sec.items.length === 0) continue;
    const secFile = path.join(SEC_DIR, sec.name + (sec.name.endsWith('.tex') ? '' : '.tex'));
    if (!fs.existsSync(secFile)) continue;

    const content = fs.readFileSync(secFile, 'utf-8');
    const lines = content.split('\n');

    for (const item of sec.items) {
      // Toggle \input line
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^(\s*)(%\s*)?\\input\{([^}]+)\}/);
        if (m && m[3] === item.inputPath) {
          const indent = m[1];
          lines[i] = item.enabled ? `${indent}\\input{${item.inputPath}}` : `${indent}%\\input{${item.inputPath}}`;
        }
      }

      // Write bullet changes to the individual item file
      if (item.bullets && item.bullets.length > 0) {
        const fullPath = path.resolve(RESUME_DIR, item.inputPath + (item.inputPath.endsWith('.tex') ? '' : '.tex'));
        if (fs.existsSync(fullPath)) {
          const updates = item.bullets.map((b, idx) => ({ index: idx, enabled: b.enabled, text: b.text }));
          writeBullets(fullPath, updates);
        }
      }
    }
    fs.writeFileSync(secFile, lines.join('\n'));
  }

  res.json({ ok: true });
});

// ---- API: Compile & PDF ----

app.post('/api/compile', (req, res) => {
  const { execSync } = require('child_process');
  try {
    execSync('/Library/TeX/texbin/pdflatex -interaction=nonstopmode main.tex', { cwd: RESUME_DIR, timeout: 30000 });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.stderr?.toString() || e.message });
  }
});

app.get('/api/pdf', (req, res) => {
  const pdfPath = path.join(RESUME_DIR, 'main.pdf');
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(pdfPath);
  } else {
    res.status(404).json({ error: 'No PDF found. Compile first.' });
  }
});

// ---- API: Config ----

function readConfig() {
  const mainTex = fs.readFileSync(MAIN_TEX, 'utf-8');
  const preamble = fs.readFileSync(path.join(RESUME_DIR, 'preamble.tex'), 'utf-8');
  const header = fs.readFileSync(path.join(RESUME_DIR, 'header.tex'), 'utf-8');
  const num = (src, re) => { const m = src.match(re); return m ? parseFloat(m[1]) : null; };
  return {
    pageTop: num(mainTex, /top\s*=\s*([\d.]+)\s*cm/),
    pageBottom: num(mainTex, /bottom\s*=\s*([\d.]+)\s*cm/),
    pageLeft: num(mainTex, /left\s*=\s*([\d.]+)\s*cm/),
    pageRight: num(mainTex, /right\s*=\s*([\d.]+)\s*cm/),
    sectionTop: num(preamble, /% top space:\s*\n\s*([\d.]+)\s*cm/),
    sectionBottom: num(preamble, /% bottom space:\s*\n\s*([\d.]+)\s*cm/),
    highlightsTopsep: num(preamble, /topsep\s*=\s*([\d.]+)\s*cm,\s*\n\s*parsep/),
    highlightsParsep: num(preamble, /parsep\s*=\s*([\d.]+)\s*cm,\s*\n\s*partopsep/),
    headerFontSize: num(header, /\\fontsize\{([\d.]+)\s*pt\}/),
    headerSepKern: num(header, /\\kern\s+([\d.]+)\s*pt/),
  };
}

function writeConfig(cfg) {
  let mainTex = fs.readFileSync(MAIN_TEX, 'utf-8');
  if (cfg.pageTop != null) mainTex = mainTex.replace(/(top\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageTop}$3`);
  if (cfg.pageBottom != null) mainTex = mainTex.replace(/(bottom\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageBottom}$3`);
  if (cfg.pageLeft != null) mainTex = mainTex.replace(/(left\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageLeft}$3`);
  if (cfg.pageRight != null) mainTex = mainTex.replace(/(right\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageRight}$3`);
  fs.writeFileSync(MAIN_TEX, mainTex);

  let preamble = fs.readFileSync(path.join(RESUME_DIR, 'preamble.tex'), 'utf-8');
  if (cfg.sectionTop != null) preamble = preamble.replace(/(% top space:\s*\n\s*)([\d.]+)(\s*cm)/, `$1${cfg.sectionTop}$3`);
  if (cfg.sectionBottom != null) preamble = preamble.replace(/(% bottom space:\s*\n\s*)([\d.]+)(\s*cm)/, `$1${cfg.sectionBottom}$3`);
  if (cfg.highlightsTopsep != null) preamble = preamble.replace(/(topsep\s*=\s*)([\d.]+)(\s*cm,\s*\n\s*parsep)/, `$1${cfg.highlightsTopsep}$3`);
  if (cfg.highlightsParsep != null) preamble = preamble.replace(/(parsep\s*=\s*)([\d.]+)(\s*cm,\s*\n\s*partopsep)/, `$1${cfg.highlightsParsep}$3`);
  fs.writeFileSync(path.join(RESUME_DIR, 'preamble.tex'), preamble);

  let header = fs.readFileSync(path.join(RESUME_DIR, 'header.tex'), 'utf-8');
  if (cfg.headerFontSize != null) header = header.replace(/(\\fontsize\{)([\d.]+)(\s*pt\}\{)([\d.]+)(\s*pt\})/, `$1${cfg.headerFontSize}$3${cfg.headerFontSize}$5`);
  if (cfg.headerSepKern != null) header = header.replace(/(\\kern\s+)([\d.]+)(\s*pt)/g, `$1${cfg.headerSepKern}$3`);
  fs.writeFileSync(path.join(RESUME_DIR, 'header.tex'), header);
}

app.get('/api/config', (req, res) => res.json(readConfig()));
app.post('/api/config', (req, res) => {
  try { writeConfig(req.body); res.json({ ok: true }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = 3847;
app.listen(PORT, () => console.log(`Resume Picker running at http://localhost:${PORT}`));
