# Contributing

Thanks for helping! Here is how to get going.

## Setup

```bash
npm install
npm run dev        # play at http://localhost:5173
```

## Before you open a pull request

```bash
npm run check
```

This runs exactly what CI runs: typecheck, lint, formatting check, tests and the production build. A pull request can only be merged when CI is green.

Useful scripts:

| Command                 | What it does                        |
| ----------------------- | ----------------------------------- |
| `npm test`              | Run all tests once                  |
| `npm run test:watch`    | Re-run tests as you edit            |
| `npm run test:coverage` | Tests plus a coverage report        |
| `npm run lint:fix`      | Fix lint problems that can be fixed |
| `npm run format`        | Format every file with Prettier     |

## Code style

- Small files with one job. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to see where things go.
- Clear names over comments. Add a comment only to explain _why_, never _what_.
- Keep `core/` and `site/` pure (no DOM, no global state) so they stay easy to test.
- Anything a player types must pass through `esc()` before it becomes HTML.

## Adding content

Most new content is just data:

- **A new piece of furniture**: add it to `src/core/catalog/furniture.ts`, add its kind to `FurnitureKind` in `src/core/types.ts`, and add a renderer in `src/site/sections.ts`. The tests check that every kind renders, escapes text, and has defaults.
- **A new house**: add it to `src/core/catalog/houses.ts` and `HouseKind`. Its drawing comes from its `roof3d` shape and colours.
- **A new style control**: add it to `src/core/design/controls.ts`, convert it in `src/core/design/css.ts`, and use the CSS variable in `src/site/base.css`.

If you add a field to the saved data, give it a default in `migrate()` (`src/game/persistence.ts`) so old saves keep working.
