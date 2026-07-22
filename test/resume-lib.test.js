const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const resumeLib = require('../resume-lib');

function tempProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'resume-builder-'));
}

function sampleProject() {
  const project = resumeLib.defaultProject();
  project.profile = {
    name: 'Ada Lovelace',
    location: 'London & Remote',
    email: 'ada@example.com',
    phone: '555-0100',
    links: [{ id: 'github', label: 'Ada', url: 'https://github.com/ada_l', icon: '\\faGithub \\  ', enabled: true }],
  };
  project.layout = {
    pageTop: 1.4,
    pageBottom: 1.1,
    pageLeft: 0.8,
    pageRight: 0.8,
    sectionTop: 0.2,
    sectionBottom: 0.12,
    bulletTopsep: 0.04,
    bulletParsep: 0.03,
    bodyFontSize: 9.5,
    sectionFontSize: 11,
    headerFontSize: 22,
    headerContactFontSize: 8.5,
    entryTitleFontSize: 10.5,
    entryMetaFontSize: 8,
    bulletFontSize: 9,
    skillFontSize: 9.5,
    headerSepKern: 6,
  };
  project.education = [{
    id: 'edu-a',
    enabled: true,
    school: 'Analytical Engine University',
    location: 'London',
    degree: 'MS in Computing',
    degreeLatex: '\\textit{MS in Computing}, GPA: 4.0/4.0',
    date: '1842 - 1843',
    details: ['Published notes with symbols & tables'],
  }];
  project.skills = [
    { id: 'skill-a', enabled: true, label: 'Languages', items: 'JavaScript, C++, LaTeX' },
    { id: 'skill-off', enabled: false, label: 'Hidden', items: 'Do not render' },
  ];
  project.sections.find(section => section.id === 'publications').enabled = true;
  project.publications = [{
    id: 'pub-a',
    enabled: true,
    title: 'Notes on the Analytical Engine',
    date: '1843',
    venue: 'Scientific Memoirs',
    authors: 'Ada Lovelace, Luigi Menabrea',
    authorsLatex: '\\mbox{\\textbf{\\textit{Ada Lovelace}}}, \\mbox{Luigi Menabrea}',
    linkLabel: 'doi.org/example',
    linkUrl: 'https://doi.org/example',
  }];
  project.experience = [{
    id: 'exp-a',
    enabled: true,
    title: 'Programmer',
    organization: 'Analytical Engine',
    location: 'London',
    date: '1843',
    bullets: [
      { id: 'b1', enabled: true, text: 'Wrote an algorithm with 95% reliability & clarity.', latex: 'Wrote an algorithm with \\textbf{95\\% reliability} \\& clarity.' },
      { id: 'b2', enabled: false, text: 'Hidden bullet' },
    ],
  }];
  project.projects = [{
    id: 'proj-a',
    enabled: true,
    title: 'Bernoulli Number Generator',
    date: '1843',
    description: 'Calculated values with tables.',
    descriptionLatex: '\\textit{Calculated values with tables.}',
    linkLabel: 'engine_notes',
    linkUrl: 'https://example.com/engine_notes',
    bullets: [{ id: 'pb1', enabled: true, text: 'Handled input_1 and output_2 safely.' }],
  }];
  return project;
}

test('creates and reads a JSON project round trip', () => {
  const dir = tempProjectDir();
  const project = sampleProject();
  resumeLib.createProject(dir, project);

  assert.equal(resumeLib.isValidProjectDir(dir), true);
  const read = resumeLib.readProject(dir);
  assert.equal(read.profile.name, 'Ada Lovelace');
  assert.equal(read.education[0].school, 'Analytical Engine University');
  assert.equal(fs.existsSync(path.join(dir, 'resume.json')), true);
});

test('escapes LaTeX special characters', () => {
  assert.equal(
    resumeLib.latexEscape('A&B_50%#{x}$'),
    'A\\&B\\_50\\%\\#\\{x\\}\\$'
  );
});

test('renders supported resume sections and omits disabled content', () => {
  const files = resumeLib.renderProjectFiles(sampleProject());

  assert.match(files['header.tex'], /Ada Lovelace/);
  assert.match(files['header.tex'], /London \\& Remote/);
  assert.match(files['header.tex'], /\\faGithub/);
  assert.match(files['sec/education.tex'], /Analytical Engine University/);
  assert.match(files['sec/education.tex'], /GPA: 4\.0\/4\.0/);
  assert.match(files['sec/skills.tex'], /Languages/);
  assert.match(files['sec/publications.tex'], /Notes on the Analytical Engine/);
  assert.match(files['sec/publications.tex'], /\\mbox\{\\textbf\{\\textit\{Ada Lovelace\}\}\}/);
  assert.match(files['sec/experience.tex'], /Programmer/);
  assert.match(files['sec/experience.tex'], /\\textbf\{95\\% reliability\}/);
  assert.match(files['sec/projects.tex'], /Bernoulli Number Generator/);
  assert.match(files['sec/projects.tex'], /\\textit\{Calculated values with tables\.\}/);

  assert.doesNotMatch(files['sec/skills.tex'], /Do not render/);
  assert.doesNotMatch(files['sec/experience.tex'], /Hidden bullet/);
});

test('applies layout values to generated LaTeX files', () => {
  const project = sampleProject();
  project.layout.pageBreakBeforeProjects = true;
  const files = resumeLib.renderProjectFiles(project);

  assert.match(files['main.tex'], /top=1.4 cm/);
  assert.match(files['main.tex'], /left=0.8 cm/);
  assert.match(files['preamble.tex'], /topsep=0.04 cm/);
  assert.match(files['preamble.tex'], /parsep=0.03 cm/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeBodyFont\}\{\\fontsize\{9.5 pt\}\{11.4 pt\}\\selectfont\}/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeSectionFont\}\{\\fontsize\{11 pt\}\{13.2 pt\}\\selectfont\}/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeEntryTitleFont\}\{\\fontsize\{10.5 pt\}\{12.6 pt\}\\selectfont\}/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeEntryMetaFont\}\{\\fontsize\{8 pt\}\{9.6 pt\}\\selectfont\}/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeBulletFont\}\{\\fontsize\{9 pt\}\{10.8 pt\}\\selectfont\}/);
  assert.match(files['preamble.tex'], /\\newcommand\{\\ResumeSkillFont\}\{\\fontsize\{9.5 pt\}\{11.4 pt\}\\selectfont\}/);
  assert.match(files['header.tex'], /\\fontsize\{22 pt\}\{22 pt\}/);
  assert.match(files['header.tex'], /\\ResumeHeaderContactFont/);
  assert.match(files['header.tex'], /\\kern 6 pt/);
  assert.match(files['sec/education.tex'], /\\ResumeEntryTitleFont\\textbf\{Analytical Engine University\}/);
  assert.match(files['sec/skills.tex'], /\\ResumeSkillFont\\textbf\{Languages:\}/);
  assert.match(files['sec/experience.tex'], /\\ResumeEntryTitleFont\\textbf\{Programmer\}/);
  assert.match(files['sec/experience.tex'], /\\ResumeEntryMetaFont Analytical Engine -- London/);
  assert.match(files['sec/experience.tex'], /\\item \{\\ResumeBulletFont Wrote an algorithm/);
  assert.match(files['main.tex'], /\\clearpage\n\s*\\input\{sec\/projects\}/);
});

test('writes generated LaTeX into the project build directory', () => {
  const dir = tempProjectDir();
  resumeLib.createProject(dir, sampleProject());

  assert.equal(fs.existsSync(path.join(dir, 'build', 'main.tex')), true);
  assert.equal(fs.existsSync(path.join(dir, 'build', 'preamble.tex')), true);
  assert.equal(fs.existsSync(path.join(dir, 'build', 'header.tex')), true);
  assert.equal(fs.existsSync(path.join(dir, 'build', 'sec', 'projects.tex')), true);
  assert.equal(fs.existsSync(path.join(dir, 'build', 'sec', 'publications.tex')), true);
});

test('configures Chinese projects for XeLaTeX with a CJK font', () => {
  const project = sampleProject();
  project.profile.name = '陈怡然';

  const files = resumeLib.renderProjectFiles(project);
  const candidates = resumeLib.latexEngineCandidates(project);

  assert.match(files['preamble.tex'], /\\usepackage\{xeCJK\}/);
  assert.match(
    files['preamble.tex'],
    /\\setCJKmainfont\[BoldFont=FandolSong-Bold\.otf\]\{FandolSong-Regular\.otf\}/,
  );
  assert.match(files['main.tex'], /\\usepackage\{fontawesome5\}/);
  assert.doesNotMatch(files['main.tex'], /\\usepackage\{fontawesome\}\n/);
  assert.equal(path.basename(candidates[0]), 'xelatex');
});

test('keeps PDFLaTeX configuration for projects without Chinese text', () => {
  const project = sampleProject();
  const files = resumeLib.renderProjectFiles(project);
  const candidates = resumeLib.latexEngineCandidates(project);

  assert.doesNotMatch(files['preamble.tex'], /\\usepackage\{xeCJK\}/);
  assert.match(files['main.tex'], /\\usepackage\{fontawesome\}\n/);
  assert.equal(path.basename(candidates[0]), 'pdflatex');
});
