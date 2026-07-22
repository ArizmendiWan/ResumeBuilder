# Resume Builder

A macOS Electron app for building structured resumes and rendering them with a LaTeX engine. Resume content is stored in `resume.json`; LaTeX files and PDFs are generated artifacts.

## Features

- Create and open resume builder projects.
- Edit profile, links, education, experience, projects, skills, section labels, and section order.
- Toggle sections, entries, links, and bullets on or off.
- Adjust page margins, section spacing, bullet spacing, and header sizing.
- Generate LaTeX into a project-local `build/` folder.
- Compile with local `pdflatex` and preview the generated PDF.
- Export the compiled PDF.

## Requirements

- Node.js 18+
- macOS
- MacTeX or TeX Live with `pdflatex` available at `/Library/TeX/texbin/pdflatex` or on `PATH`

## Project Format

Each resume project is a folder with this canonical file:

```text
resume.json
```

Generated files are written to:

```text
build/
  main.tex
  preamble.tex
  header.tex
  sec/
    education.tex
    skills.tex
    experience.tex
    projects.tex
  main.pdf
```

Do not edit generated files as the source of truth. Edit the project in the app or update `resume.json`.

## Template

V1 ships one app-owned template, `rendercv-classic`, defined in `templates/rendercv-classic/`. It is based on the RenderCV-style LaTeX resume layout used by the original scratch project, but it does not hardcode personal resume content.

## Install And Run

```bash
npm install
npm start
```

## Tests

```bash
npm test
```

The tests cover project JSON round trips, LaTeX escaping, section rendering, disabled content omission, layout interpolation, and generated file output.

## Package macOS App

```bash
npm run package
```

The package script currently builds an Apple Silicon macOS app with the existing app icon.
