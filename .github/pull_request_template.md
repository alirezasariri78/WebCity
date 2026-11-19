## What does this change?

<!-- One or two sentences. Screenshots or a short clip help for anything visual. -->

## How was it tested?

- [ ] `npm run check` passes (typecheck, lint, format, tests, build)
- [ ] Added or updated tests for new logic
- [ ] Tried it in the browser (`npm run dev`)

## Checklist

- [ ] New content (houses, furniture, styles…) is added to the catalog in `src/core/catalog/`
- [ ] Anything a player types is escaped before it goes into HTML (`esc`)
- [ ] Old saves still load (add defaults in `src/game/persistence.ts` → `migrate` if you added fields)
