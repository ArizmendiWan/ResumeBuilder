# Chen Yiran Resume Project Design

## Objective

Create a new Resume Builder project from the supplied Chinese Word resume while preserving the original Chinese content and factual claims.

## Project Location

The project will be created at `projects/chen-yiran-resume/`. Its source of truth will be `resume.json`; LaTeX files and the PDF will be generated under the project-local `build/` directory using the existing `rendercv-classic` template.

## Content Mapping

The source resume will be mapped into the existing version 1 project schema without modifying the application:

- The filename contact details become the profile name, phone, email, and location.
- `教育背景` becomes the education section. The program, year, coursework, GPA, class rank, and IELTS score remain attached to the education entry.
- `专业课程` and `核心能力` also supply structured skills entries so the information remains easy to edit in the builder.
- `实习经历` and `校园工作与项目经历` become entries in a section labeled `实习与校园经历`.
- `科研` and `竞赛` become entries in a section labeled `科研与竞赛项目`.
- Publications remain disabled because the source resume does not identify any publication.

Every substantive source item will be retained. Long source paragraphs may be split into multiple bullets only at explicit sentence or clause boundaries; their wording and metrics will not be rewritten.

## Truthfulness Rules

- Preserve the original Chinese language.
- Do not translate, embellish, optimize, or invent claims.
- Do not infer missing dates, locations, links, titles, or project details.
- Keep ambiguous source wording as written rather than silently correcting its meaning.
- Use stable, descriptive IDs that do not change across renders.

## Generated Output

The existing project library will normalize and render the completed `resume.json`. The project must generate the expected LaTeX source files and compile a readable PDF. Layout settings may be adjusted to fit the imported content, but content must not be removed solely to force a one-page result.

## Verification

Verification will include:

1. Validate that `resume.json` parses and normalizes through the existing library.
2. Run the existing automated test suite.
3. Render and compile the new project.
4. Inspect every PDF page for clipping, overlap, missing sections, and unreadable Chinese characters.
5. Compare the final structured content against the extracted Word source, including all names, dates, counts, percentages, and scores.

## Out of Scope

- Translating the resume into English.
- Tailoring it to a job description.
- Rewriting bullets for concision or impact.
- Adding new application features or custom schema section types.
