# Changelog

Packages are versioned independently: only the package that changed gets a bump.
See [ADR-0002](docs/adr/0002-publish-on-a-0x-version-line.md).

## `@quotidianlabs/emojis` 0.1.0

First release of this fork. It is `emoji-mart@5.6.0` renamed, plus exactly one
behaviour change.

- **Changed:** when a consumer does not supply Data, the picker fetches it from
  `https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.1` rather than from
  Upstream's `@emoji-mart/data@latest`. The default data path now belongs to this
  fork, and it is bounded to a minor rather than tracking `@latest`, so a Data
  publish can no longer change the behaviour of an already-published core beyond
  a patch. See
  [ADR-0004](docs/adr/0004-pin-the-data-cdn-url-to-a-minor-range.md).
- Everything a consumer can observe at runtime is otherwise unchanged. The
  `em-emoji-picker` and `em-emoji` tags, the `emoji-mart.` storage key prefix,
  the `--em-*` CSS custom properties, the `emoji-mart-emoji` CSS class and the
  `window.EmojiMart` global are all inherited byte-identical, so existing markup,
  theming CSS and stored Frequently Used rankings and Skin choices keep working.
  See [ADR-0001](docs/adr/0001-preserve-upstream-runtime-identifiers.md).
- Migrating off Upstream is a find-and-replace of `emoji-mart` for
  `@quotidianlabs/emojis` in import specifiers.

## `@quotidianlabs/emojis-data` 0.1.0

First release. It is `@emoji-mart/data@1.2.1` renamed. The Data ships exactly as
inherited, down to the Emoji Version it covers. The exported type is still
named `EmojiMartData`.

Migrating: replace `@emoji-mart/data` with `@quotidianlabs/emojis-data`.

## `@quotidianlabs/emojis-react` 0.1.2

React 19 support. The change is metadata.

- **Changed:** the `react` peer range widens from `^16.8 || ^17 || ^18` to
  `^16.8 || ^17 || ^18 || ^19`. Installing the wrapper alongside React 19 no
  longer produces a peer dependency conflict, so it needs neither an `overrides`
  block nor `--legacy-peer-deps`. This answers
  [Upstream issue #967](https://github.com/missive/emoji-mart/issues/967).
- No code changed. From React the wrapper takes only `React`, `useEffect` and
  `useRef`, and calls `createElement`; React 19 removed none of them. Core
  renders through Preact and does not import React at all.
- It is a patch rather than a minor so that it reaches the people it is for.
  Caret ranges collapse below 1.0, so a consumer on `^0.1.1` resolves 0.1.2 and
  would never have resolved 0.2.0. Anyone who installed the wrapper behind an
  `overrides` block or `--legacy-peer-deps` gets this without editing a range,
  and can then drop the workaround. See
  [ADR-0002](docs/adr/0002-publish-on-a-0x-version-line.md).
- `repository.url` is normalised to the `git+https://….git` form npm rewrites
  it to on publish, so the manifest in the tree stops differing cosmetically
  from the registry metadata. Folded in here as
  [ADR-0003](docs/adr/0003-release-via-trusted-publishing.md) anticipated.
- The release gate's scratch application moves from React 18 to React 19, so the
  picker is proven to mount and record a selection under 19. The gate installs
  one React version at a time, so 16.8, 17 and 18 are now declared without being
  exercised.

## `@quotidianlabs/emojis-react` 0.1.1

No code changes. This version exists to prove the trusted publishing workflow end
to end, on the one package where a throwaway version is inert: nothing resolves
the wrapper automatically, whereas a Data patch is picked up immediately by the
`@0.1` CDN pin baked into every published core.

It is the first release published over OIDC rather than with a token, and the
first carrying a provenance attestation.

## `@quotidianlabs/emojis-react` 0.1.0

First release. It is `@emoji-mart/react@1.1.1` renamed.

- The peer dependency on core is `>=0.1.0 <1.0.0`, so any 0.x core resolves.
- The React peer range is unchanged at `^16.8 || ^17 || ^18`. React 19 support
  lands in the next release, deliberately kept separate from the rename.

Migrating: replace `@emoji-mart/react` with `@quotidianlabs/emojis-react`.
