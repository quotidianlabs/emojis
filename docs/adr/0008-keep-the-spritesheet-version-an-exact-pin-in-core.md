---
status: accepted
---

# Keep the spritesheet version an exact pin in core

Data carries sprite coordinates; core carries the URL of the Spritesheet those
coordinates index into. The `Emoji` component pins `emoji-datasource-<set>` at an
exact version, `16.0.0`, which must equal the `emoji-datasource` the Data package
builds against. The two move together in one release, and the release gate fails
if they ever disagree.

Deriving the version from Data instead was rejected for now: it would widen the
Data contract with a field consumers who supply their own Data would also have to
provide, and it needs a fallback for the Data that predates the field.

## Consequences

- A Data rebuild against a newer `emoji-datasource` is never a Data-only release.
  Sprite coordinates move on almost every rebuild, so core must ship with it.
- The failure mode is silent. A stale pin raises no error; it draws every
  non-`native` Emoji from the wrong cell. Nothing but a check catches it, so the
  gate renders a non-`native` Set in a browser and asserts each sprite's
  `background-position` against the geometry `emoji-datasource` itself describes.
- The `sheet` geometry in Data is computed by the build rather than written as a
  literal, for the same reason: a literal that falls behind misplaces every
  sprite without failing anything.
- Consumers who pass `getSpritesheetURL` own their own copy of this pin. A core
  minor that moves the dataset requires them to move their Spritesheet with it;
  the CHANGELOG has to say so every time.
- [ADR-0004](0004-pin-the-data-cdn-url-to-a-minor-range.md) covers the other
  version baked into core. That one is a range and fails loudly with a 404; this
  one is exact and fails quietly with a wrong picture.
