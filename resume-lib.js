const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_FILE = 'resume.json';
const BUILD_DIR = 'build';
const LATEX_ENGINE_CANDIDATES = [
  '/Library/TeX/texbin/pdflatex',
  'pdflatex',
];
const XELATEX_ENGINE_CANDIDATES = [
  '/Library/TeX/texbin/xelatex',
  'xelatex',
];

function joinProject(dir, ...parts) {
  return path.join(dir, ...parts);
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultProject() {
  return {
    version: 1,
    template: 'rendercv-classic',
    profile: {
      name: 'Your Name',
      location: 'City, ST',
      email: 'you@example.com',
      phone: '',
      links: [
        { id: 'link-github', label: 'GitHub', url: 'https://github.com/yourname', enabled: true },
        { id: 'link-linkedin', label: 'LinkedIn', url: '', enabled: false },
        { id: 'link-portfolio', label: 'Portfolio', url: '', enabled: false },
      ],
    },
    sections: [
      { id: 'education', label: 'EDUCATION', enabled: true },
      { id: 'skills', label: 'SKILLS', enabled: true },
      { id: 'publications', label: 'PUBLICATIONS', enabled: false },
      { id: 'experience', label: 'PROFESSIONAL EXPERIENCE', enabled: true },
      { id: 'projects', label: 'PROJECTS', enabled: true },
    ],
    education: [
      {
        id: 'edu-1',
        enabled: true,
        school: 'University Name',
        location: 'City, ST',
        degree: 'Degree, Major',
        date: 'Sept 2022 - June 2026',
        details: [],
      },
    ],
    experience: [
      {
        id: 'exp-1',
        enabled: true,
        title: 'Software Engineering Intern',
        organization: 'Company Name',
        location: 'City, ST',
        date: 'June 2025 - Aug 2025',
        bullets: [
          { id: 'exp-1-b1', enabled: true, text: 'Built and shipped a feature using modern web technologies.' },
          { id: 'exp-1-b2', enabled: true, text: 'Improved reliability and developer workflow through testing and automation.' },
        ],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        enabled: true,
        title: 'Project Name',
        date: '2025',
        description: 'Short project description.',
        linkLabel: 'github.com/yourname/project',
        linkUrl: '',
        bullets: [
          { id: 'proj-1-b1', enabled: true, text: 'Designed and implemented the core system.' },
          { id: 'proj-1-b2', enabled: true, text: 'Used data-driven iteration to improve results.' },
        ],
      },
    ],
    skills: [
      { id: 'skill-1', enabled: true, label: 'Programming Languages', items: 'Python, JavaScript, TypeScript, C++' },
      { id: 'skill-2', enabled: true, label: 'Frameworks', items: 'React, Node.js, Flask, Tailwind CSS' },
      { id: 'skill-3', enabled: true, label: 'Tools', items: 'Git, Docker, Linux, LaTeX' },
    ],
    publications: [],
    layout: defaultLayout(),
  };
}

function defaultLayout() {
  return {
    pageTop: 1.2,
    pageBottom: 1.2,
    pageLeft: 0.9,
    pageRight: 0.9,
    sectionTop: 0.16,
    sectionBottom: 0.16,
    bulletTopsep: 0.1,
    bulletParsep: 0.1,
    bodyFontSize: 10,
    sectionFontSize: 10,
    headerFontSize: 20,
    headerContactFontSize: 10,
    entryTitleFontSize: 10,
    entryMetaFontSize: 10,
    bulletFontSize: 10,
    skillFontSize: 10,
    headerSepKern: 5,
    pageBreakBeforeProjects: false,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeProject(project) {
  const base = defaultProject();
  const merged = {
    ...base,
    ...project,
    profile: { ...base.profile, ...(project.profile || {}) },
    layout: { ...base.layout, ...(project.layout || {}) },
  };
  merged.profile.links = ensureArray(merged.profile.links).map((link, idx) => ({
    id: link.id || newId(`link-${idx}`),
    label: link.label || 'Link',
    url: link.url || '',
    icon: link.icon || '',
    enabled: link.enabled !== false,
  }));
  merged.sections = ensureArray(merged.sections).length ? merged.sections : base.sections;
  merged.education = ensureArray(merged.education).map((item, idx) => ({
    id: item.id || newId(`edu-${idx}`),
    enabled: item.enabled !== false,
    school: item.school || '',
    location: item.location || '',
    degree: item.degree || '',
    degreeLatex: item.degreeLatex || '',
    date: item.date || '',
    details: ensureArray(item.details),
  }));
  merged.experience = normalizeEntryList(merged.experience, 'exp');
  merged.projects = normalizeProjectList(merged.projects);
  merged.skills = ensureArray(merged.skills).map((item, idx) => ({
    id: item.id || newId(`skill-${idx}`),
    enabled: item.enabled !== false,
    label: item.label || '',
    items: item.items || '',
  }));
  merged.publications = ensureArray(merged.publications).map((item, idx) => ({
    id: item.id || newId(`pub-${idx}`),
    enabled: item.enabled !== false,
    title: item.title || '',
    date: item.date || '',
    venue: item.venue || '',
    authors: item.authors || '',
    authorsLatex: item.authorsLatex || '',
    linkLabel: item.linkLabel || '',
    linkUrl: item.linkUrl || '',
  }));
  return merged;
}

function normalizeEntryList(entries, prefix) {
  return ensureArray(entries).map((entry, idx) => ({
    id: entry.id || newId(`${prefix}-${idx}`),
    enabled: entry.enabled !== false,
    title: entry.title || '',
    organization: entry.organization || '',
    location: entry.location || '',
    date: entry.date || '',
    bullets: ensureArray(entry.bullets).map((bullet, bidx) => ({
      id: bullet.id || newId(`${prefix}-${idx}-b${bidx}`),
      enabled: bullet.enabled !== false,
      text: bullet.text || '',
      latex: bullet.latex || '',
    })),
  }));
}

function normalizeProjectList(entries) {
  return ensureArray(entries).map((entry, idx) => ({
    id: entry.id || newId(`proj-${idx}`),
    enabled: entry.enabled !== false,
    title: entry.title || '',
    date: entry.date || '',
    description: entry.description || '',
    descriptionLatex: entry.descriptionLatex || '',
    linkLabel: entry.linkLabel || '',
    linkUrl: entry.linkUrl || '',
    bullets: ensureArray(entry.bullets).map((bullet, bidx) => ({
      id: bullet.id || newId(`proj-${idx}-b${bidx}`),
      enabled: bullet.enabled !== false,
      text: bullet.text || '',
      latex: bullet.latex || '',
    })),
  }));
}

function isValidProjectDir(dir) {
  if (!dir) return false;
  const file = joinProject(dir, PROJECT_FILE);
  if (!fs.existsSync(file)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed && parsed.version === 1;
  } catch (_err) {
    return false;
  }
}

function createProject(dir, initialProject = defaultProject()) {
  fs.mkdirSync(dir, { recursive: true });
  const projectPath = joinProject(dir, PROJECT_FILE);
  if (fs.existsSync(projectPath)) {
    throw new Error('This folder already contains a resume.json project.');
  }
  const project = normalizeProject(initialProject);
  writeProject(dir, project);
  renderLatex(dir, project);
  return project;
}

function readProject(dir) {
  const projectPath = joinProject(dir, PROJECT_FILE);
  if (!fs.existsSync(projectPath)) {
    throw new Error('Selected folder does not contain resume.json.');
  }
  return normalizeProject(JSON.parse(fs.readFileSync(projectPath, 'utf-8')));
}

function writeProject(dir, project) {
  const normalized = normalizeProject(project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(joinProject(dir, PROJECT_FILE), `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

function getBuildDir(dir) {
  return joinProject(dir, BUILD_DIR);
}

function getPdfPath(dir) {
  const pdf = joinProject(dir, BUILD_DIR, 'main.pdf');
  return fs.existsSync(pdf) ? pdf : null;
}

function latexEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function latexUrl(value) {
  return String(value ?? '').trim().replace(/\\/g, '').replace(/[{}]/g, '');
}

function latexText(value, latexValue = '') {
  return hasText(latexValue) ? String(latexValue) : latexEscape(value);
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

function formatNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(3)).toString() : fallback.toString();
}

function renderLatex(projectDir, project = readProject(projectDir)) {
  const normalized = normalizeProject(project);
  const buildDir = getBuildDir(projectDir);
  const secDir = joinProject(buildDir, 'sec');
  fs.mkdirSync(secDir, { recursive: true });

  const files = renderProjectFiles(normalized);
  for (const [file, content] of Object.entries(files)) {
    const target = joinProject(buildDir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return { buildDir, files: Object.keys(files) };
}

function renderProjectFiles(project) {
  const useCjk = hasCjkText(project);
  const files = {
    'main.tex': renderMain(project, useCjk),
    'preamble.tex': renderPreamble(project.layout, useCjk),
    'header.tex': renderHeader(project.profile, project.layout),
  };
  for (const section of project.sections) {
    if (!section.enabled) continue;
    if (section.id === 'education') files['sec/education.tex'] = renderEducation(project, section);
    if (section.id === 'skills') files['sec/skills.tex'] = renderSkills(project, section);
    if (section.id === 'publications') files['sec/publications.tex'] = renderPublications(project, section);
    if (section.id === 'experience') files['sec/experience.tex'] = renderExperience(project, section);
    if (section.id === 'projects') files['sec/projects.tex'] = renderProjects(project, section);
  }
  return files;
}

function renderMain(project, useCjk = false) {
  const layout = project.layout;
  const title = project.profile.name ? `${project.profile.name}'s Resume` : 'Resume';
  const sectionInputs = project.sections
    .filter(section => section.enabled)
    .map(section => {
      const pageBreak = layout.pageBreakBeforeProjects && section.id === 'projects'
        ? '    \\clearpage\n'
        : '';
      return `${pageBreak}    \\input{sec/${sectionFileName(section.id)}}`;
    })
    .join('\n    \\vspace{0.10 cm}\n');

  return `\\documentclass[10pt, letterpaper]{article}

% Packages:
\\usepackage[
    ignoreheadfoot,
    top=${formatNumber(layout.pageTop, 1.2)} cm,
    bottom=${formatNumber(layout.pageBottom, 1.2)} cm,
    left=${formatNumber(layout.pageLeft, 0.9)} cm,
    right=${formatNumber(layout.pageRight, 0.9)} cm,
    footskip=0.0 cm,
]{geometry}
\\usepackage{titlesec}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage[dvipsnames]{xcolor}
\\definecolor{primaryColor}{RGB}{0, 0, 0}
\\usepackage{enumitem}
\\usepackage{fontawesome5}
${useCjk ? '' : '\\usepackage{fontawesome}'}
\\usepackage{amsmath}
\\usepackage[
    pdftitle={${latexEscape(title)}},
    pdfauthor={${latexEscape(project.profile.name)}},
    pdfcreator={LaTeX Resume Builder},
    colorlinks=true,
    linkcolor=blue,
    urlcolor=blue,
    citecolor=blue
]{hyperref}
\\usepackage[pscoord]{eso-pic}
\\usepackage{calc}
\\usepackage{bookmark}
\\usepackage{lastpage}
\\usepackage{changepage}
\\usepackage{paracol}
\\usepackage{ifthen}
\\usepackage{needspace}
\\usepackage{iftex}

\\input{preamble}

\\begin{document}

    \\input{header}

    \\vspace{5 pt - 0.3 cm}
    \\vspace{0.10 cm}
${sectionInputs}

\\end{document}
`;
}

function renderPreamble(layout, useCjk = false) {
  const fontSetup = useCjk
    ? `% Configure Unicode and Simplified Chinese fonts for XeLaTeX:
\\usepackage{fontspec}
\\usepackage{xeCJK}
\\setmainfont{Charter}
\\setCJKmainfont[BoldFont=FandolSong-Bold.otf]{FandolSong-Regular.otf}`
    : `% Ensure that generated PDF is machine readable/ATS parsable:
\\ifPDFTeX
    \\input{glyphtounicode}
    \\pdfgentounicode=1
    \\usepackage[T1]{fontenc}
    \\usepackage[utf8]{inputenc}
    \\usepackage{lmodern}
\\fi

\\usepackage{charter}`;

  return `${fontSetup}

% Some settings:
\\raggedright
\\AtBeginEnvironment{adjustwidth}{\\partopsep0pt}
\\pagestyle{empty}
\\setcounter{secnumdepth}{0}
\\setlength{\\parindent}{0pt}
\\setlength{\\topskip}{0pt}
\\setlength{\\columnsep}{0.10cm}
\\pagenumbering{gobble}
${renderFontMacros(layout)}

\\AtBeginDocument{\\ResumeBodyFont}

\\titleformat{\\section}{\\needspace{4\\baselineskip}\\ResumeSectionFont\\bfseries}{}{0pt}{}[\\vspace{0pt}\\titlerule]

\\titlespacing{\\section}{
    -1pt
}{
    ${formatNumber(layout.sectionTop, 0.16)} cm
}{
    ${formatNumber(layout.sectionBottom, 0.16)} cm
}

\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\small$\\bullet$}}$}
\\newenvironment{highlights}{
    \\begin{itemize}[
        topsep=${formatNumber(layout.bulletTopsep, 0.1)} cm,
        parsep=${formatNumber(layout.bulletParsep, 0.1)} cm,
        partopsep=0pt,
        itemsep=0pt,
        leftmargin=0 cm + 10pt
    ]
}{
    \\end{itemize}
}

\\newenvironment{onecolentry}{
    \\begin{adjustwidth}{
        0 cm + 0.00001 cm
    }{
        0 cm + 0.00001 cm
    }
}{
    \\end{adjustwidth}
}

\\newenvironment{twocolentry}[2][]{
    \\onecolentry
    \\def\\secondColumn{#2}
    \\setcolumnwidth{\\fill, 3.6 cm}
    \\begin{paracol}{2}
}{
    \\switchcolumn \\raggedleft {\\ResumeEntryMetaFont \\secondColumn}
    \\end{paracol}
    \\endonecolentry
}

\\newenvironment{header}{
    \\setlength{\\topsep}{0pt}\\par\\kern\\topsep\\centering\\linespread{1.5}
}{
    \\par\\kern\\topsep
}

\\let\\hrefWithoutArrow\\href

\\newcommand{\\AND}{\\unskip
    \\cleaders\\copy\\ANDbox\\hskip\\wd\\ANDbox
    \\ignorespaces
}
\\newsavebox\\ANDbox
\\sbox\\ANDbox{$|$}
`;
}

function fontCommand(name, size) {
  const value = formatNumber(size, 10);
  const leading = formatNumber(Number(value) * 1.2, 12);
  return `\\newcommand{\\${name}}{\\fontsize{${value} pt}{${leading} pt}\\selectfont}`;
}

function renderFontMacros(layout) {
  return `% Font size controls:
${fontCommand('ResumeBodyFont', layout.bodyFontSize)}
${fontCommand('ResumeSectionFont', layout.sectionFontSize)}
${fontCommand('ResumeHeaderContactFont', layout.headerContactFontSize)}
${fontCommand('ResumeEntryTitleFont', layout.entryTitleFontSize)}
${fontCommand('ResumeEntryMetaFont', layout.entryMetaFontSize)}
${fontCommand('ResumeBulletFont', layout.bulletFontSize)}
${fontCommand('ResumeSkillFont', layout.skillFontSize)}`;
}

function renderHeader(profile, layout) {
  const parts = [];
  if (hasText(profile.location)) parts.push(`\\mbox{${latexEscape(profile.location)}}`);
  if (hasText(profile.email)) {
    const email = profile.email.trim();
    parts.push(`\\mbox{\\hrefWithoutArrow{mailto:${latexUrl(email)}}{${latexEscape(email)}}}`);
  }
  if (hasText(profile.phone)) parts.push(`\\mbox{Tel: ${latexEscape(profile.phone)}}`);
  for (const link of ensureArray(profile.links).filter(link => link.enabled && hasText(link.url))) {
    const label = hasText(link.label) ? link.label : link.url;
    const icon = link.icon || (/github/i.test(`${label} ${link.url}`) ? '\\faGithub \\  ' : '');
    parts.push(`\\mbox{${icon}\\hrefWithoutArrow{${latexUrl(link.url)}}{${latexEscape(label)}}}`);
  }

  return `    \\begin{header}
        \\fontsize{${formatNumber(layout.headerFontSize, 20)} pt}{${formatNumber(layout.headerFontSize, 20)} pt}\\selectfont ${latexEscape(profile.name)}

        \\ResumeHeaderContactFont
${renderHeaderParts(parts, layout.headerSepKern)}

    \\end{header}
`;
}

function renderHeaderParts(parts, sepKern) {
  const kern = formatNumber(sepKern, 5);
  return parts.map((part, idx) => {
    const suffix = idx < parts.length - 1 ? `%\n        \\kern ${kern} pt%\n        \\AND%\n        \\kern ${kern} pt%` : '%';
    return `        ${part}${suffix}`;
  }).join('\n');
}

function renderEducation(project, section) {
  const items = project.education.filter(item => item.enabled);
  return `    \\section{${latexEscape(section.label)}}
${items.map(renderEducationItem).join('\n        \\vspace{0.10 cm}\n')}`;
}

function renderEducationItem(item) {
  const detailBlock = ensureArray(item.details).filter(hasText).length
    ? `\n        \\vspace{0.08 cm}
        \\begin{onecolentry}
            \\begin{highlights}
${ensureArray(item.details).filter(hasText).map(detail => `                \\item ${latexEscape(detail)}`).join('\n')}
            \\end{highlights}
        \\end{onecolentry}`
    : '';
  return ` 
        \\begin{twocolentry}{
            ${latexEscape(item.location)}
        }
            {\\ResumeEntryTitleFont\\textbf{${latexEscape(item.school)}}}
        \\end{twocolentry}
        \\begin{twocolentry}{
            ${latexEscape(item.date)}
        }
            ${latexText(item.degree, item.degreeLatex)}
        \\end{twocolentry}${detailBlock}
`;
}

function renderSkills(project, section) {
  const items = project.skills.filter(item => item.enabled && (hasText(item.label) || hasText(item.items)));
  return `    \\section{${latexEscape(section.label)}}
${items.map(item => `    \\begin{onecolentry}
        {\\ResumeSkillFont\\textbf{${latexEscape(item.label)}:} ${latexEscape(item.items)}}
    \\end{onecolentry}`).join('\n\n')}
`;
}

function renderExperience(project, section) {
  const items = project.experience.filter(item => item.enabled);
  return `\\section{${latexEscape(section.label)}}

${items.map(renderExperienceItem).join('\n')}`;
}

function renderExperienceItem(item) {
  const org = [item.organization, item.location].filter(hasText).map(latexEscape).join(' -- ');
  const title = `{\\ResumeEntryTitleFont\\textbf{${latexEscape(item.title)}}}`;
  const titleLine = org ? `${title}, {\\ResumeEntryMetaFont ${org}}` : title;
  return `\\vspace{0.20 cm}
\\begin{twocolentry}{
        ${latexEscape(item.date)}
    }
    ${titleLine}
\\end{twocolentry}

${renderBulletBlock(item.bullets)}`;
}

function renderPublications(project, section) {
  const items = project.publications.filter(item => item.enabled);
  return `\\section{${latexEscape(section.label)}}

${items.map((item, idx) => renderPublicationItem(item, idx)).join('\n')}`;
}

function renderPublicationItem(item, idx = 0) {
  const topSpace = idx === 0 ? '0.10' : '0.20';
  const linkLine = hasText(item.linkUrl) || hasText(item.venue)
    ? `\\vspace{0.10 cm}
\\begin{twocolentry}
{${renderPublicationLink(item)}}
{\\ResumeEntryMetaFont ${latexEscape(item.venue)}}
\\end{twocolentry}
`
    : '';
  const authors = hasText(item.authors)
    ? `\\vspace{0.10 cm}
\\begin{onecolentry}
    ${latexText(item.authors, item.authorsLatex)}
\\end{onecolentry}
`
    : '';
  return `\\vspace{${topSpace} cm}
\\begin{twocolentry}{
    ${latexEscape(item.date)}
}
    {\\ResumeEntryTitleFont\\textbf{${latexEscape(item.title)}}}
\\end{twocolentry}
${linkLine}${authors}`;
}

function renderPublicationLink(item) {
  if (!hasText(item.linkUrl)) return '';
  const label = hasText(item.linkLabel) ? item.linkLabel : item.linkUrl;
  return `\\href{${latexUrl(item.linkUrl)}}{${latexEscape(label)}}`;
}

function renderProjects(project, section) {
  const items = project.projects.filter(item => item.enabled);
  return `\\section{${latexEscape(section.label)}}

${items.map(renderProjectItem).join('\n')}`;
}

function renderProjectItem(item) {
  const description = hasText(item.description) || hasText(item.linkLabel) || hasText(item.linkUrl)
    ? `\n\\vspace{0.10 cm}
\\begin{onecolentry}
    ${renderProjectDescription(item)}
\\end{onecolentry}
`
    : '';
  return `\\vspace{0.20 cm}
\\begin{twocolentry}{
        ${latexEscape(item.date)}
    }
    {\\ResumeEntryTitleFont\\textbf{${latexEscape(item.title)}}}
\\end{twocolentry}
${description}
${renderBulletBlock(item.bullets)}`;
}

function renderProjectDescription(item) {
  const description = latexText(item.description, item.descriptionLatex);
  if (hasText(item.linkUrl)) {
    const label = hasText(item.linkLabel) ? item.linkLabel : item.linkUrl;
    const link = `\\href{${latexUrl(item.linkUrl)}}{${latexEscape(label)}}`;
    return hasText(item.description) ? `${description} Code available at: ${link}` : link;
  }
  if (hasText(item.linkLabel)) {
    return hasText(item.description)
      ? `${description} ${latexEscape(item.linkLabel)}`
      : latexEscape(item.linkLabel);
  }
  return description;
}

function renderBulletBlock(bullets) {
  const enabled = ensureArray(bullets).filter(bullet => bullet.enabled && hasText(bullet.text));
  if (!enabled.length) return '';
  return `\\vspace{0.10 cm}
\\begin{onecolentry}
    \\begin{highlights}
${enabled.map(bullet => `        \\item {\\ResumeBulletFont ${latexText(bullet.text, bullet.latex)}}`).join('\n')}
    \\end{highlights}
\\end{onecolentry}
`;
}

function sectionFileName(sectionId) {
  if (sectionId === 'experience') return 'experience';
  return sectionId;
}

function hasCjkText(project) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(JSON.stringify(project));
}

function latexEngineCandidates(project) {
  return hasCjkText(project) ? XELATEX_ENGINE_CANDIDATES : LATEX_ENGINE_CANDIDATES;
}

function compileProject(projectDir, project = readProject(projectDir)) {
  renderLatex(projectDir, project);
  const buildDir = getBuildDir(projectDir);
  const engine = findLatexEngine(project);
  try {
    execFileSync(engine, ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'], {
      cwd: buildDir,
      timeout: 30000,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { ok: true, pdfPath: getPdfPath(projectDir), buildDir };
  } catch (err) {
    const log = readCompileLog(buildDir);
    const output = [err.stdout, err.stderr, log].filter(Boolean).join('\n');
    const message = output.trim() || err.message;
    const error = new Error(message.split('\n').slice(-30).join('\n'));
    error.details = message;
    throw error;
  }
}

function findLatexEngine(project) {
  const candidates = latexEngineCandidates(project);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { timeout: 5000, stdio: 'ignore' });
      return candidate;
    } catch (_err) {
      // Try the next candidate.
    }
  }
  const engineName = hasCjkText(project) ? 'xelatex' : 'pdflatex';
  throw new Error(`Could not find ${engineName}. Install MacTeX or TeX Live and make ${engineName} available on PATH.`);
}

function readCompileLog(buildDir) {
  const logPath = joinProject(buildDir, 'main.log');
  if (!fs.existsSync(logPath)) return '';
  return fs.readFileSync(logPath, 'utf-8').split('\n').slice(-80).join('\n');
}

function exportPdf(projectDir, destinationPath) {
  const pdfPath = getPdfPath(projectDir);
  if (!pdfPath) throw new Error('No compiled PDF found. Compile the resume first.');
  fs.copyFileSync(pdfPath, destinationPath);
  return destinationPath;
}

module.exports = {
  PROJECT_FILE,
  BUILD_DIR,
  defaultProject,
  defaultLayout,
  normalizeProject,
  isValidProjectDir,
  createProject,
  readProject,
  writeProject,
  renderLatex,
  renderProjectFiles,
  compileProject,
  exportPdf,
  getBuildDir,
  getPdfPath,
  latexEscape,
  latexEngineCandidates,
};
