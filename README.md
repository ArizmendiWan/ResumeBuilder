# Resume Picker

A macOS desktop app for editing LaTeX resumes. Pick a resume project folder, toggle sections and bullet points on or off, edit text inline, tweak layout (margins, spacing, font sizes), and compile to PDF—all without touching LaTeX by hand.

## Features

- **Choose resume folder** — Start by picking your LaTeX resume directory; recent folders are remembered.
- **Sections** — Enable or disable whole sections (e.g. Education, Experience).
- **Items & bullets** — Toggle individual entries and bullet points; edit bullet text in the app.
- **Layout** — Adjust page margins, section spacing, bullet spacing, and header font size via sliders.
- **Compile** — Save and compile to PDF with one click; preview in the app.

## Requirements

- **Node.js** (v18+)
- **macOS** (Apple Silicon; the packaged app is `darwin-arm64`)
- **MacTeX** (or TeX Live with `pdflatex` at `/Library/TeX/texbin/pdflatex`) for PDF compilation

## LaTeX project layout

Your resume folder must look like this:

- `main.tex` — main document (includes `sec/*.tex`)
- `preamble.tex` — preamble and layout settings
- `header.tex` — name/header
- `sec/` — directory of section files (e.g. `sec/education.tex`, `sec/experience.tex`)

Section files use `\input{...}` for each item; items use `\item` for bullets. The app comments/uncomments these in the `.tex` files and parses/writes the structure accordingly.

## Install & run

```bash
npm install
npm start
```

## Package macOS app

```bash
npm run package
```

Produces **Resume Picker.app** in `Resume Picker-darwin-arm64/` (and a zip in the project root). Uses `icon.icns` for the app icon.

## Project layout

| File / folder      | Purpose |
|--------------------|--------|
| `main.js`          | Electron main process, window, IPC, folder picker |
| `preload.js`       | Exposes `window.api` for renderer (IPC bridge) |
| `index.html`       | UI: startup screen, sections/layout tabs, PDF preview |
| `resume-lib.js`    | Parse/write LaTeX, read config, run `pdflatex` |
| `icon.png` / `icon.icns` | App icon |

Settings (last resume folder, recent folders) are stored in `~/Library/Application Support/picker/settings.json`.

## License

ISC
