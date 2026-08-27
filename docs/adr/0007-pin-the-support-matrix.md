---
status: proposed
---

# Pin the Support Matrix instead of inheriting `browserslist` defaults

`packages/emojis` declared `"browserslist": "defaults"`, a query whose meaning
moves whenever `caniuse-lite` is updated. The frozen 2022 toolchain held it
still: `caniuse-lite@1.0.30001427` resolves `defaults` to 34 targets including
`ie 11`, while a current one resolves it to 32 without. The fork therefore
carried a Support Matrix it had never chosen and could not see, which any
dependency bump would rewrite as a side effect. The query is now written out as
`chrome >= 87, firefox >= 78, safari >= 14, ios_saf >= 14, edge >= 88` — the
oldest releases that run ES2020 natively, matching the `target` this repo
already compiles to.

This ADR stays `proposed` until the toolchain change it belongs to lands.

## Consequences

- **Choosing a conservative matrix is close to free.** Built against Parcel
  2.16.4, `dist/main.js` measures 159,547 bytes at a 2026 `defaults` and 160,353
  bytes at a Safari 12 floor. Under 1 KB separates the extremes, so the reason
  to pin is legibility, not bytes.
- **Dropping `ie 11` is the one change that moves real bytes**, and it is not a
  reach decision anyone made: IE left `defaults` upstream in 2022. Of the
  274 KB → 160 KB fall in `dist/main.js`, roughly 68 KB is IE leaving the matrix
  and roughly 46 KB is Parcel switching its transpiler from Babel to SWC, which
  inlines its own helpers rather than bundling `regeneratorRuntime`.
- Widening or lowering the matrix is now a reviewable edit to a manifest rather
  than a consequence of a lockfile update.
- The release gate asserts the resolved matrix, so it cannot drift unobserved
  again. Adding a browser to the query means updating that assertion.
- ADR-0001 commits this fork to being a Drop-in Replacement for consumers
  migrating off an abandoned package. Those consumers skew toward projects that
  have not touched their dependencies in years, which is the argument for
  choosing the floor deliberately rather than tracking whatever `defaults`
  happens to mean on the day someone runs `yarn install`.
