const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function joinResume(dir, ...parts) {
  return path.join(dir, ...parts);
}

function isValidResumeDir(dir) {
  if (!dir) return false;
  return fs.existsSync(joinResume(dir, 'main.tex')) &&
         fs.existsSync(joinResume(dir, 'preamble.tex')) &&
         fs.existsSync(joinResume(dir, 'header.tex')) &&
         fs.existsSync(joinResume(dir, 'sec'));
}

function getPdfPath(dir) {
  const pdf = joinResume(dir, 'main.pdf');
  return fs.existsSync(pdf) ? pdf : null;
}

function parseBullets(content) {
  const lines = content.split('\n');
  const bullets = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)(%%?\s*)?\\item\s+(.*)/);
    if (m) {
      let text = m[3];
      let endLine = i;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next.match(/^\s*(%%?\s*)?\\item\s/) || next.match(/\\end\{highlights/) || next.trim() === '') break;
        text += ' ' + next.trim();
        endLine = j;
      }
      bullets.push({
        startLine: i,
        endLine,
        enabled: !m[2],
        text: text.trim(),
        indent: m[1]
      });
      i = endLine;
    }
  }
  return { lines, bullets };
}

function parseSectionFile(resumeDir, secFilePath) {
  const content = fs.readFileSync(secFilePath, 'utf-8');
  const lines = content.split('\n');
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(%%?\s*)?\\input\{([^}]+)\}/);
    if (match) {
      const commented = !!match[2];
      const inputPath = match[3];
      const fullPath = path.resolve(resumeDir, inputPath + (inputPath.endsWith('.tex') ? '' : '.tex'));
      let label = path.basename(inputPath, '.tex');
      let title = label;
      let bulletData = [];

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

        const { bullets } = parseBullets(subContent);
        bulletData = bullets.map(b => ({ enabled: b.enabled, text: b.text }));
      }

      items.push({
        line: i,
        inputPath,
        commented,
        label,
        title,
        fullPath,
        bullets: bulletData
      });
    }
  }
  return { lines, items };
}

function parseMain(resumeDir) {
  const mainContent = fs.readFileSync(joinResume(resumeDir, 'main.tex'), 'utf-8');
  const lines = mainContent.split('\n');
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(%%?\s*)?\\input\{sec\/([^}]+)\}/);
    if (match) {
      sections.push({ line: i, name: match[3], commented: !!match[2] });
    }
  }
  return { lines, sections };
}

function readResume(resumeDir) {
  const main = parseMain(resumeDir);
  const result = { sections: [] };
  for (const sec of main.sections) {
    const secFile = joinResume(resumeDir, 'sec', sec.name + (sec.name.endsWith('.tex') ? '' : '.tex'));
    let items = [];
    if (fs.existsSync(secFile)) {
      const parsed = parseSectionFile(resumeDir, secFile);
      items = parsed.items.map(it => ({
        inputPath: it.inputPath,
        label: it.label,
        title: it.title,
        enabled: !it.commented,
        bullets: it.bullets
      }));
    }
    result.sections.push({ name: sec.name, enabled: !sec.commented, items });
  }
  return result;
}

function readConfig(resumeDir) {
  const mainTex = fs.readFileSync(joinResume(resumeDir, 'main.tex'), 'utf-8');
  const preamble = fs.readFileSync(joinResume(resumeDir, 'preamble.tex'), 'utf-8');
  const header = fs.readFileSync(joinResume(resumeDir, 'header.tex'), 'utf-8');
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
    headerSepKern: num(header, /\\kern\s+([\d.]+)\s*pt/)
  };
}

function writeBullets(fullPath, bulletUpdates) {
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf-8');
  const { lines, bullets } = parseBullets(content);
  if (!bullets.length) return;
  const updates = bulletUpdates.map((b, idx) => ({ ...b, idx }));
  updates.sort((a, b) => b.idx - a.idx);
  for (const upd of updates) {
    const bullet = bullets[upd.idx];
    if (!bullet) continue;
    const indent = bullet.indent || '\t';
    const prefix = upd.enabled ? '' : '%';
    const newLine = `${indent}${prefix}\\item ${upd.text}`;
    lines.splice(bullet.startLine, bullet.endLine - bullet.startLine + 1, newLine);
  }
  fs.writeFileSync(fullPath, lines.join('\n'));
}

function writeResume(resumeDir, sectionsPayload) {
  const mainPath = joinResume(resumeDir, 'main.tex');
  const mainLines = fs.readFileSync(mainPath, 'utf-8').split('\n');
  for (const sec of sectionsPayload) {
    for (let i = 0; i < mainLines.length; i++) {
      const match = mainLines[i].match(/^(\s*)(%\s*)?\\input\{sec\/([^}]+)\}/);
      if (match && match[3] === sec.name) {
        const indent = match[1];
        mainLines[i] = sec.enabled ? `${indent}\\input{sec/${sec.name}}` : `${indent}%\\input{sec/${sec.name}}`;
      }
    }
  }
  fs.writeFileSync(mainPath, mainLines.join('\n'));

  for (const sec of sectionsPayload) {
    if (!sec.items || !sec.items.length) continue;
    const secFile = joinResume(resumeDir, 'sec', sec.name + (sec.name.endsWith('.tex') ? '' : '.tex'));
    if (!fs.existsSync(secFile)) continue;
    const lines = fs.readFileSync(secFile, 'utf-8').split('\n');
    for (const item of sec.items) {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^(\s*)(%\s*)?\\input\{([^}]+)\}/);
        if (m && m[3] === item.inputPath) {
          const indent = m[1];
          lines[i] = item.enabled ? `${indent}\\input{${item.inputPath}}` : `${indent}%\\input{${item.inputPath}}`;
        }
      }
      if (item.bullets && item.bullets.length) {
        const fullPath = path.resolve(resumeDir, item.inputPath + (item.inputPath.endsWith('.tex') ? '' : '.tex'));
        const updates = item.bullets.map((b, idx) => ({ idx, enabled: b.enabled, text: b.text }));
        writeBullets(fullPath, updates);
      }
    }
    fs.writeFileSync(secFile, lines.join('\n'));
  }
}

function writeConfig(resumeDir, cfg) {
  const mainPath = joinResume(resumeDir, 'main.tex');
  let mainTex = fs.readFileSync(mainPath, 'utf-8');
  if (cfg.pageTop != null) mainTex = mainTex.replace(/(top\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageTop}$3`);
  if (cfg.pageBottom != null) mainTex = mainTex.replace(/(bottom\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageBottom}$3`);
  if (cfg.pageLeft != null) mainTex = mainTex.replace(/(left\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageLeft}$3`);
  if (cfg.pageRight != null) mainTex = mainTex.replace(/(right\s*=\s*)([\d.]+)(\s*cm)/, `$1${cfg.pageRight}$3`);
  fs.writeFileSync(mainPath, mainTex);

  const preamblePath = joinResume(resumeDir, 'preamble.tex');
  let preamble = fs.readFileSync(preamblePath, 'utf-8');
  if (cfg.sectionTop != null) preamble = preamble.replace(/(% top space:\s*\n\s*)([\d.]+)(\s*cm)/, `$1${cfg.sectionTop}$3`);
  if (cfg.sectionBottom != null) preamble = preamble.replace(/(% bottom space:\s*\n\s*)([\d.]+)(\s*cm)/, `$1${cfg.sectionBottom}$3`);
  if (cfg.highlightsTopsep != null) preamble = preamble.replace(/(topsep\s*=\s*)([\d.]+)(\s*cm,\s*\n\s*parsep)/, `$1${cfg.highlightsTopsep}$3`);
  if (cfg.highlightsParsep != null) preamble = preamble.replace(/(parsep\s*=\s*)([\d.]+)(\s*cm,\s*\n\s*partopsep)/, `$1${cfg.highlightsParsep}$3`);
  fs.writeFileSync(preamblePath, preamble);

  const headerPath = joinResume(resumeDir, 'header.tex');
  let header = fs.readFileSync(headerPath, 'utf-8');
  if (cfg.headerFontSize != null) header = header.replace(/(\\fontsize\{)([\d.]+)(\s*pt\}\{)([\d.]+)(\s*pt\})/, `$1${cfg.headerFontSize}$3${cfg.headerFontSize}$5`);
  if (cfg.headerSepKern != null) header = header.replace(/(\\kern\s+)([\d.]+)(\s*pt)/g, `$1${cfg.headerSepKern}$3`);
  fs.writeFileSync(headerPath, header);
}

function compileResume(resumeDir) {
  execSync('/Library/TeX/texbin/pdflatex -interaction=nonstopmode main.tex', {
    cwd: resumeDir,
    timeout: 30000
  });
}

module.exports = {
  isValidResumeDir,
  readResume,
  writeResume,
  readConfig,
  writeConfig,
  compileResume,
  getPdfPath,
};
