---
name: resume-picker
description: Use when editing resume content in a Resume Picker resume.json project, compiling its LaTeX or PDF output, or checking page count and rendered layout.
---

# Resume Picker

## Overview

Edit the canonical project JSON, preserve unrequested state, and verify output through Resume Picker's normal compilation path. Treat factual accuracy and rendered evidence as completion requirements.

## Workflow

1. Work from the repository root. Identify the target folder under `projects/` or use the supplied path.
2. Read the target `resume.json` and inspect `git status` before editing. Existing changes belong to the user.
3. Confirm the requested change. Ask only when a missing fact would materially change the result.
4. Edit `resume.json` with `apply_patch`. Preserve unrelated content, IDs, ordering, `enabled` states, section settings, and layout values.
5. Parse the JSON and inspect the source diff.
6. Run `npm test` from the repository root.
7. Compile through `resumeLib.compileProject`; do not invoke LaTeX directly as the primary app workflow.
8. Check the PDF page count. When content or layout changed, render every page and inspect for overflow, clipping, blank space, broken links, and unintended wrapping.
9. Report the edited source file, compiled PDF, test result, page count, and any verification limitation.

## Commands

From the repository root, replace `<project-dir>` with the target folder:

```bash
node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('resume.json valid')" "<project-dir>/resume.json"
npm test
node -e "const r=require('./resume-lib'); const result=r.compileProject(process.argv[1]); console.log(JSON.stringify(result))" "<project-dir>"
pdfinfo "<project-dir>/build/main.pdf" | rg '^Pages:|^Page size:'
```

If `pdfinfo` is unavailable, use another installed PDF library or tool and state the fallback. Use `view_image` for rendered page images when available.

## Content and Layout Contract

- `resume.json` is the source of truth. Never edit files under `build/` as source; compilation regenerates them.
- Never invent or overstate facts, metrics, dates, infrastructure, proficiency, or outcomes. Use conditional wording or ask the user when evidence is missing.
- Do not enable, disable, delete, reorder, or rewrite unrelated entries.
- Do not add manual page breaks, shrink typography, alter margins, or change spacing unless the user explicitly requests that layout change.
- A request to edit content does not authorize layout changes. If the result gains a page, report it and ask before changing layout.
- Do not claim a successful compile, test run, page count, or visual result without checking it in the current run.

## Quick Reference

| Task | Required evidence |
|---|---|
| Content edit | Focused `resume.json` diff |
| Valid project | JSON parses successfully |
| App safety | `npm test` passes |
| Successful build | `compileProject` returns a PDF path |
| One-page claim | PDF tool reports exactly one page |
| Layout claim | Rendered page inspection |

## Common Mistakes

- Editing generated `.tex` files instead of `resume.json`.
- Reformatting the whole JSON and obscuring the requested diff.
- Treating disabled entries as permission to remove them.
- Guessing an AWS service, skill level, metric, or job detail.
- Forcing a one-page result with an unsolicited page break or layout override.
- Checking only the first page of a multi-page PDF.
