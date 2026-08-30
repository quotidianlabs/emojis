---
status: accepted
---

# Pin the bundled Data CDN URL to a minor-version range

When a consumer does not pass Data explicitly, core fetches it from jsDelivr using
a URL baked into the bundle at build time. That URL points at
`@quotidianlabs/emojis-data@0.1` — a range, not an exact version and not `@latest`.
Patch releases of Data (a corrected translation, a keyword fix) then reach every
already-published core without a core release, while a Data minor implies a real
dataset change and requires a deliberate core bump to adopt.

## Consequences

- This is the one behaviour change inside an otherwise rename-only first release.
  Upstream's bundles point at `@emoji-mart/data@latest`; ours do not.
- Repointing at all was the point. Leaving the URL aimed at Upstream's package would
  have left our default data path owned by the project we forked because it was
  abandoned.
- `@latest` was rejected for the same reason it is a problem upstream: it lets a
  Data publish silently change the behaviour of every already-published core.
- Widening the range costs a core release; the range must be revisited whenever Data
  crosses a minor.
- This is not the only version core resolves. The `emoji-datasource` release the
  `Emoji` component draws images from is published by Data and read from there; the
  exact literal core still carries is only a fallback. See
  [ADR-0008](0008-derive-the-datasource-version-from-data.md).
