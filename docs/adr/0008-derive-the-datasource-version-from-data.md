---
status: accepted
---

# Derive the datasource version from Data

Data carries sprite coordinates; core builds the URLs of the images those
coordinates index into. Both the Spritesheet URL and the per-Emoji PNG URL name an
`emoji-datasource-<set>` version, and that version has to be the one Data was built
against or the picture is wrong.

Data publishes it. Every Set file carries `datasourceVersion`, the resolved
`emoji-datasource` version the build actually required, and core reads it to build
both URLs.

The field is optional, permanently. `EmojiMartData` is on the Compatibility Surface,
so a required field would break any consumer who constructs their own Data and types
it as `EmojiMartData`, which is the Drop-in Replacement contract. Core therefore
keeps an exact version literal as a fallback, uses it when the field is absent or
malformed, and warns once when it does.

This replaces an earlier decision to keep the version pinned in core alone, which
was recorded here and rejected deriving it on the grounds that the Data contract
would widen and would need a fallback. Both objections were correct and are the
shape of what is written above; what changed is the weight given to the failure they
were traded against.

## Consequences

- A consumer who installs `@quotidianlabs/emojis-data` and passes it as `data`, the
  primary documented install, now gets the right images whatever core version they
  pair it with. Core declares no dependency relationship on Data, so nothing else
  relates the two.
- The silent failure is gone from that path. It survives only where Data cannot say
  what it was built against: a hand-rolled Data object, or a consumer-supplied
  `getSpritesheetURL`, which owns the URL by definition.
- **This does not end the coordinated release.** Sprite coordinates move on a Data
  minor, and [ADR-0004](0004-pin-the-data-cdn-url-to-a-minor-range.md) keeps core's
  bundled Data URL on a minor range, so adopting a rebuilt dataset still requires a
  core release to widen it. Derivation removes the wrong-picture class, not the
  release coupling.
- Core interpolates the field into image URLs, and Data arrives over the network by
  default. The value is shape-validated before use, and a value that fails takes the
  same path as a missing one. Data names a version, never a URL, so it cannot
  redirect where images are fetched from.
- The fallback literal still ships and is still what hand-rolled Data gets, so it
  still has to be correct. The release gate checks it against Data's
  `emoji-datasource` devDependency, and separately checks that Data's published
  field matches the same devDependency.
- The `sheet` geometry in Data is computed by the build rather than written as a
  literal, for the same reason this version is now published rather than pinned: a
  literal that falls behind misplaces every sprite without failing anything.
- The gate still renders a non-`native` Set in a browser and asserts each sprite's
  `background-position` against the geometry `emoji-datasource` itself describes.
  That check exercises the derived path and is the one that catches a wrong outcome
  rather than a wrong string.
