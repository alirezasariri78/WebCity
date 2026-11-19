# 🏘️ Town Builder

A browser game where **the town you build becomes a real website**.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

| In the game              | On the website                                            |
| ------------------------ | --------------------------------------------------------- |
| Town name & logo         | Website name and logo                                     |
| House                    | A page (the Town Hall is the home page)                   |
| Furniture inside a house | Parts of the page: titles, text, pictures, forms, buttons |
| Town style & Design      | Colours, fonts, corners, spacing, animations              |
| 🔮 Magic Window          | Live preview, then **Download website** (.zip)            |

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173. Your town saves automatically in the browser; use ⚙️ → **Save project file** to keep a copy.

## Features

- **14 houses** (pages), **28 kinds of furniture** (page parts), **16 nature items**, **10 town styles**
- **Everything is customisable**: colours, gradients, background pictures, patterns, fonts, title size, corners, shadows, borders, spacing, width, alignment, input style, menu bar, appear animations, custom CSS, at three levels: whole site, one page, or one part
- **Form builder**: any inputs (text, email, phone, date, dropdown, pick-one, tick box…), each with a label, placeholder, help text, required and half-width options
- **Live editor**: click any part of the real page to edit it, with undo/redo and copy/paste of styles
- **Progression**: quests, levels 1–15, badges, daily streaks, house upgrades, treasure bubbles, and design tools that unlock as you level up
- **Exports a real website**: static HTML + CSS with SEO titles and descriptions, ready to drop on any host

## Development

```bash
npm run check   # typecheck + lint + format + tests + build (same as CI)
npm test        # tests only
```

- [Architecture](docs/ARCHITECTURE.md): how the code is organised and why
- [Contributing](CONTRIBUTING.md): setup, code style, and how to add content

Built with TypeScript and Vite. No UI framework, no runtime dependencies.
