---
title: "A High-End Markdown Blog (Demo Post)"
date: "2026-04-17"
tags: ["Math", "Markdown", "UX"]
hidden: false
description: "A demo post showing TOC, KaTeX math, footnotes, tables, details, and code copy."
---

This is a production-quality **static** technical blog system: Markdown-first, LaTeX-like typography, right-side TOC, dark mode, reading progress, anchors with copy-to-clipboard, footnotes, KaTeX math, tables, and syntax highlighting.

## Inline math

Inline math uses `$...$`: Euler’s identity $e^{i\pi}+1=0$.

## Block math

Block math uses `$$...$$`:

$$\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$$

## A figure (academic style)

![Sine wave plot](data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA3MjAgMjYwJz4KICA8cmVjdCB3aWR0aD0nNzIwJyBoZWlnaHQ9JzI2MCcgZmlsbD0nd2hpdGUnLz4KICA8ZyBzdHJva2U9JyNlNmU2ZTYnIHN0cm9rZS13aWR0aD0nMSc+CiAgICA8bGluZSB4MT0nNjAnIHkxPSczMCcgeDI9JzYwJyB5Mj0nMjMwJy8+CiAgICA8bGluZSB4MT0nNjAnIHkxPScxMzAnIHgyPSc2OTAnIHkyPScxMzAnLz4KICAgIDxsaW5lIHgxPScxODAnIHkxPSczMCcgeDI9JzE4MCcgeTI9JzIzMCcvPgogICAgPGxpbmUgeDE9JzMwMCcgeTE9JzMwJyB4Mj0nMzAwJyB5Mj0nMjMwJy8+CiAgICA8bGluZSB4MT0nNDIwJyB5MT0nMzAnIHgyPSc0MjAnIHkyPScyMzAnLz4KICAgIDxsaW5lIHgxPSc1NDAnIHkxPSczMCcgeDI9JzU0MCcgeTI9JzIzMCcvPgogICAgPGxpbmUgeDE9JzY2MCcgeTE9JzMwJyB4Mj0nNjYwJyB5Mj0nMjMwJy8+CiAgPC9nPgogIDxnIHN0cm9rZT0nI2JkYmRiZCcgc3Ryb2tlLXdpZHRoPScxLjUnPgogICAgPGxpbmUgeDE9JzYwJyB5MT0nMjMwJyB4Mj0nNjAnIHkyPSczMCcvPgogICAgPGxpbmUgeDE9JzYwJyB5MT0nMTMwJyB4Mj0nNjkwJyB5Mj0nMTMwJy8+CiAgPC9nPgogIDxwYXRoIGQ9J002MCAxMzAgQyAxMDUgNjAsIDE1MCA2MCwgMTk1IDEzMCBDIDI0MCAyMDAsIDI4NSAyMDAsIDMzMCAxMzAgQyAzNzUgNjAsIDQyMCA2MCwgNDY1IDEzMCBDIDUxMCAyMDAsIDU1NSAyMDAsIDYwMCAxMzAgQyA2NDUgNjAsIDY3NSA3NSwgNjkwIDExMCcgZmlsbD0nbm9uZScgc3Ryb2tlPScjMjIyJyBzdHJva2Utd2lkdGg9JzIuMjUnLz4KPC9zdmc+)

_Figure 1: Inline SVG via data URI (no extra files needed)._

## Tables

| Feature | Supported |
|---|---:|
| Right-side TOC | Yes |
| Dark mode | Yes |
| Footnotes | Yes |
| KaTeX | Yes |

## Collapsible sections

::: details Click to expand a technical aside

This is a collapsible section written in Markdown — no HTML required.

- It supports **lists**
- And math: $e^{i\pi}+1=0$

:::

## Code blocks (with copy button)

```js
function hello(name) {
  return `Hello, ${name}`;
}

console.log(hello("world"));
```

## Footnotes

Here is a sentence with a footnote.[^1]

[^1]: This footnote is rendered by the markdown-it-footnote plugin.
