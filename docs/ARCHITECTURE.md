# Architecture

Town Builder is a browser game written in TypeScript with no UI framework. Every house a player builds is a page, every piece of furniture is a section, and the town is exported as a real static website.

## Layers

```
src/
├── core/      Pure data and rules. No DOM, no global state.
│   ├── catalog/   Houses, furniture, decorations, themes, built-in pictures
│   ├── design/    Style controls, fonts, and style → CSS conversion
│   ├── rules/     Levels, website rating, roads, daily streaks, city growth and eras
│   └── types.ts   The saved data model
├── site/      The "translator": town → HTML/CSS/zip. Pure functions.
├── game/      Live game state: store, saving, undo, progress, sound
├── render/    Canvas renderer for the town map (sprites, ground, effects)
├── ui/        Screens and widgets (map, house editor, HUD, dialogs, tour)
├── i18n/      Translation helper and the Persian dictionary
└── styles/    The game's own CSS
```

Dependencies only point downwards:

```
ui  →  render, game, site, core, i18n
game →  core, i18n
render → core
site →  core
core →  (nothing)
```

ESLint enforces this: `core/` and `site/` may not import from `game/`, `render/` or `ui/`, and `game/` may not import from `ui/`.

## Data flow

1. `game/store.ts` holds one `SaveData` object (`state`).
2. UI code changes `state`, then calls `commit()`.
3. `commit()` bumps `version`, schedules a save to `localStorage` (on an idle callback), and redraws the screen on the next animation frame.
4. Caches (the website rating, the town scene) compare against `version` and skip work when nothing changed.

Undo/redo (`game/history.ts`) stores JSON snapshots of `state.town` only. Coins and progress are never rolled back.

## Website generation

`site/page.ts` builds a page from three style layers. The most specific layer wins:

```
theme (town style)  →  town.style (Design Studio)  →  house.style (Page design)  →  furniture.style (part)
```

Each layer becomes CSS custom properties (`core/design/css.ts`). The shared stylesheet `site/base.css` only uses those variables, so any layer can restyle anything beneath it.

The same generator runs in three modes:

| Mode      | Used by        | Difference                                                  |
| --------- | -------------- | ----------------------------------------------------------- |
| `export`  | Download (zip) | Links `style.css`; adds a script only if a part animates    |
| `preview` | Magic Window   | Inline CSS; page links switch pages inside the game         |
| `edit`    | House editor   | Click-to-select; updates arrive by `postMessage`, no reload |

Everything the player types goes through `esc()`, and links go through `resolveHref()`, which blocks `javascript:` and `data:` URLs. The only exception is the level-10 "Spell Book" (custom HTML) part, which is intentionally raw.

## The city

Page buildings are the website. City buildings (`town.city`) only feed the game: each floor houses people and earns coins.

- `core/rules/city.ts` turns population into an era (Village → Town → City → Metropolis). The era caps how tall buildings can grow and how far pages can be upgraded, and unlocks website extras (`site/features.ts`).
- Every 35 seconds `game/progress/city.ts` asks `pickGrowth()` which buildings gain a floor. Smaller buildings grow first, and schools, hospitals and nature make it more likely. Time spent away is paid back as a few growth steps on the next visit.
- `pickGrowth()` takes the random function as a parameter, so tests can make it predictable.

## Languages

`t('English text', vars)` looks the sentence up in the current language's dictionary and falls back to English. The English text is the key, so the source stays readable. Switching language saves and reloads, so no screen has to re-translate itself live. `setLang()` also sets `dir` on the document; the game's CSS uses logical properties, so right-to-left needs very few overrides.

The website's language and direction are separate settings (`town.site.lang`, `town.site.dir`), and pages and sections can override the direction through their style.

## Rendering the map

The map is drawn on a single `<canvas>`:

- Every house, tower, tree, car and villager is drawn once as SVG, rasterised, and kept as an `ImageBitmap` (`render/sprites.ts`). The browser keeps these on the GPU, so each frame is mostly `drawImage` calls.
- Labels, treasure bubbles and glows are also pre-painted bitmaps.
- The ground is cached in one bitmap per zoom bucket (`render/ground.ts`) and only repainted when the land, roads or theme change.
- Objects are sorted back-to-front once per change; villagers are merged in by depth each frame without allocating.
- The sprite cache is capped and drops the least recently used bitmaps, because a growing city keeps producing new tower heights.
- Clicks are pixel-accurate using each sprite's alpha mask.
- The loop stops while the map is hidden or the tab is in the background, and drops to 30 fps when nothing is happening.

## Testing

Tests live in `tests/` and mirror `src/`. Pure layers (`core`, `site`) are tested directly; `game` tests reset the store with `replaceState(newGame())`. Run `npm test`, or `npm run check` for everything CI runs.
