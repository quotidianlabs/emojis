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

## `@quotidianlabs/emojis-data` 0.1.1

- **Fixed:** the package declares a default export. `index.d.ts` carried only
  interfaces, so the documented `import data from '@quotidianlabs/emojis-data'`
  resolved to the module namespace rather than to the Data. Nothing caught it
  while `@quotidianlabs/emojis-react` typed its props as `any`; once 0.2.0 gave
  `data` a real type, the usage every README shows stopped type-checking. Runtime
  behaviour is unchanged, and `EmojiMartData` is untouched. Inherited from
  Upstream: `@emoji-mart/data@1.2.1` declares no default export either.

## `@quotidianlabs/emojis-data` 0.1.0

First release. It is `@emoji-mart/data@1.2.1` renamed. The Data ships exactly as
inherited, down to the Emoji Version it covers. The exported type is still
named `EmojiMartData`.

Migrating: replace `@emoji-mart/data` with `@quotidianlabs/emojis-data`.

## `@quotidianlabs/emojis-react` 0.2.1

Documentation only. `react.tsx` is untouched, so the build is unchanged; the bump
exists to carry the README to the registry.

- **Added:** the README documents the type names 0.2.0 began exporting — the
  enumerated prop unions with their props and legal values, the object types, and
  a typed usage example. It also spells out why `SelectedEmoji.native`, `unified`
  and `keywords` are optional, and why `PickerData` is structural rather than
  imported from `@quotidianlabs/emojis-data`.
- These names are Fork-Owned Names, not part of the Compatibility Surface:
  Upstream's `@emoji-mart/react` exported none, so no migration can depend on
  them. They are still held stable under semver. See
  [ADR-0006](docs/adr/0006-keep-fork-owned-names-out-of-the-compatibility-surface.md).

## `@quotidianlabs/emojis-react` 0.2.0

The wrapper publishes real types. It shipped
`export default function EmojiPicker(props: any): any`, so a consumer got no
checking and no completion for picker configuration or for callback payloads.

- **Added:** a public `EmojiPickerProps` covering every prop core accepts, with
  the `choices` arrays of `PickerProps.ts` as unions, so `theme`, `set`,
  `searchPosition`, `previewPosition`, `locale`, `emojiVersion`, `icons`,
  `navPosition`, `skin` and `skinTonePosition` reject values the picker would
  ignore at runtime.
- **Added:** `SelectedEmoji`, the payload `onEmojiSelect` receives, alongside
  `PickerData`, `PickerI18n`, `CustomCategory`, `CategoryIcon` and the
  individual prop unions. Upstream's `@emoji-mart/react` exported no type names,
  so none of this collides with the Compatibility Surface.
- **Changed:** `// @ts-nocheck` is gone from the wrapper, and the generated
  `dist/index.d.ts` carries no `any`.
- No runtime change. `dist/main.js` and `dist/module.js` are byte-identical to
  the 0.1.3 build.

`SelectedEmoji` marks `native`, `unified` and `keywords` optional. The payload is
built by reading them off the selected Skin, and a Custom Emoji's Skin carries
only `src`, so under `strict` a consumer reaching for `emoji.native` has to
account for that. `shortcodes` stays required: `init` assigns it to every Skin it
walks, Custom Emoji included.

`data` and `i18n` take structural types rather than importing `EmojiMartData`,
which would turn `@quotidianlabs/emojis-data` into a dependency of the wrapper
for the sake of a type. A type test pins that `EmojiMartData` still satisfies
`PickerData`.

This is a minor rather than a patch, which is the reverse of the call made for
0.1.3. Types that did not exist cannot break a running application, but they can
break a build: a consumer passing a prop this interface does not model, or
reading `emoji.native` under `strict`, now fails to compile. Caret ranges
collapse below 1.0, so `^0.1.3` will not resolve 0.2.0 and nobody is upgraded
into a red build without asking for it. See
[ADR-0002](docs/adr/0002-publish-on-a-0x-version-line.md).

## `@quotidianlabs/emojis-react` 0.1.3

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
  Caret ranges collapse below 1.0, so a consumer on `^0.1.1` resolves 0.1.3 and
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
- 0.1.2 carried this same change and never reached the registry. It sat on
  `main` while the release trigger moved from a manual dispatch to a merge, and
  the dispatch route went with it. Nothing was ever published under that number,
  so there is nothing a consumer could have installed.

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
