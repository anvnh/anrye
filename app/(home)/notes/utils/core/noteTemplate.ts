export const createNoteTemplate = (noteName: string): string => {
  return `# ${noteName}

Start writing your note here...

## Features Supported

- **Bold text** and *italic text*
- [Links](https://example.com)
- [[Wiki-style links]] to other notes (type [[ to see autocomplete!)
- \`inline code\`
- Lists and checkboxes
- Tables
- Blockquotes
- **LaTeX Math Support**
- **Obsidian-style Callouts**
- **Backlinks Panel** - see connected notes
- And much more!

## Callouts Examples

Callouts are great for organizing and highlighting important information:

> [!note] Note Callout
> This is a note callout. Use it to highlight important information or add context.

> [!tip] Pro Tip
> This is a tip callout. Perfect for sharing helpful advice or best practices.

> [!warning] Warning
> This is a warning callout. Use it to alert readers about potential issues or important considerations.

> [!info] Information
> This is an info callout. Great for providing additional context or explanations.

> [!success] Success
> This is a success callout. Use it to highlight achievements or positive outcomes.

> [!question] Question
> This is a question callout. Perfect for highlighting questions or areas that need clarification.

> [!bug] Bug Report
> This is a bug callout. Use it to document issues or problems that need to be addressed.

> [!example] Example
> This is an example callout. Great for providing code examples or demonstrations.

> [!quote] Quote
> This is a quote callout. Perfect for highlighting important quotes or citations.

> [!danger] Danger
> This is a danger callout. Use it to highlight critical warnings or dangerous situations.

## Task Lists / Checkboxes

You can create interactive checkboxes that can be toggled:

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
- [x] Another checked task

### Project Tasks Example

- [ ] Research project requirements
- [x] Set up development environment
- [ ] Implement core features
  - [x] User authentication
  - [ ] Data persistence
  - [ ] API integration
- [ ] Write documentation
- [ ] Deploy to production

## Math Examples

### Inline Math
Here's an inline math example: $E = mc^2$ and another one $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

### Display Math
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

## Code Example

\`\`\`javascript

\`\`\`

## Table Example

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

> This is a regular blockquote example. Great for highlighting important information.

## More Math

Complex equations work too:

$$f(x) = \\int_{-\\infty}^x e^{-t^2} dt$$

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$$`;
};