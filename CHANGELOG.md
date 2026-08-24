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

## `@quotidianlabs/emojis-react` 0.1.0

First release. It is `@emoji-mart/react@1.1.1` renamed.

- The peer dependency on core is `>=0.1.0 <1.0.0`, so any 0.x core resolves.
- The React peer range is unchanged at `^16.8 || ^17 || ^18`. React 19 support
  lands in the next release, deliberately kept separate from the rename.

Migrating: replace `@emoji-mart/react` with `@quotidianlabs/emojis-react`.
