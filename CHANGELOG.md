# Changelog

Packages are versioned independently: only the package that changed gets a bump.
See [ADR-0002](docs/adr/0002-publish-on-a-0x-version-line.md).

## `@quotidianlabs/emojis` 0.2.0

Moves to Data 0.2.0, which is a coordinated release: core cannot adopt a Data
minor without a bump of its own.

- **Added:** `emojiVersion` accepts `15.1` and `16`, and defaults to `16`. On a
  platform without Native Support for them the existing per-viewer version
  filter hides the newer Emoji, so nothing renders as tofu.
- **Breaking:** the bundled spritesheet URL pins `emoji-datasource-<set>` at
  `16.0.0` rather than `15.0.1`, in lockstep with Data. A consumer who passes
  `getSpritesheetURL` supplies their own sheet and must move it to 16.0.0
  themselves; sprite coordinates moved for 3291 Skins and the grid is now 62x62,
  so a sheet left at 15.0.1 draws every non-`native` emoji from the wrong cell.
  See
  [ADR-0008](docs/adr/0008-keep-the-spritesheet-version-an-exact-pin-in-core.md).
- **Changed:** the default Data URL widens to
  `https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.2` on both the Set
  and i18n paths, per
  [ADR-0004](docs/adr/0004-pin-the-data-cdn-url-to-a-minor-range.md).
- **Changed:** the Native Support probe knows about Emoji Versions 15.1 and 16,
  so `latestVersion()` can report them. It probes `phoenix` for 15.1 — every
  Emoji added in 15.1 is a ZWJ sequence, so a ZWJ probe is unavoidable there —
  and `face_with_bags_under_eyes` for 16.

## `@quotidianlabs/emojis-data` 0.2.0

Generated against `emoji-datasource@16.0.0` rather than `15.0.1`, adding Emoji
Versions 15.1 and 16.

- **Added:** `sets/15.1/` and `sets/16/`, each with the six Set files every other
  version directory carries. `sets/16/native.json` holds 1906 Emoji against
  1870 in `sets/15/native.json`: 28 from Unicode 15.1 (`phoenix`, `lime`,
  `brown_mushroom`, `broken_chain`, the head-shaking faces, the four new
  `family_adult_*` forms and the "facing right" people) and 8 from Unicode 16.0
  (`harp`, `shovel`, `leafless_tree`, `fingerprint`, `root_vegetable`,
  `splatter`, `face_with_bags_under_eyes`, `flag-sark`).
- **Breaking:** sprite coordinates moved. 3291 Skin coordinates changed and the
  sheet grew from 61x61 to 62x62, so every Set file now reports
  `sheet: { cols: 62, rows: 62 }`. Data at 0.2 is only correct against the
  `emoji-datasource-<set>` spritesheets at 16.0.0. A consumer who passes
  `getSpritesheetURL` must move their own sheet to 16.0.0 in the same change, or
  every non-`native` emoji will be drawn from the wrong cell. See
  [ADR-0008](docs/adr/0008-keep-the-spritesheet-version-an-exact-pin-in-core.md).
- **Breaking:** the package `main` now resolves to `sets/16/native.json` rather
  than `sets/15/native.json`, so `import data from '@quotidianlabs/emojis-data'`
  returns Emoji Version 16.
- **Changed:** `crab`, `lobster`, `oyster`, `shrimp` and `squid` moved from Food
  & Drink to Animals & Nature, and the people Category reordered. Both follow
  upstream data; no override table is carried to preserve the old arrangement.
- **Changed:** `flag-tr` is named "Flag Turkey" rather than "Turkey Flag". The
  datasource renamed it to "Türkiye Flag", which is longer than the name
  `unicode-emoji-json` gives, and the build prefers the shorter of the two.
  `unicode-emoji-json` is deliberately held at 0.4.0 in this release.
- Keywords are unchanged: `emojilib` stays at 3.0.10. Bumping it rewrites 1707
  of 1870 keyword lists, which changes search results, and that reaches every
  published core as a Data patch without needing a core release.
- The sheet geometry is now computed by the build from the datasource rather
  than written as a literal.

## `@quotidianlabs/emojis-react` 0.3.0

- **Added:** `EmojiVersion` accepts `15.1` and `16`. Without this the versions
  core now defaults to are untypeable from React.

## `@quotidianlabs/emojis` 0.1.1

The published declarations type check. Nothing in `dist/index.d.ts` was ever
checked, because `skipLibCheck: true` is the common default and the release gate
set it too, so a declaration file that no compiler could accept shipped in 0.1.0.

- **Fixed:** `dist/index.d.ts` no longer carries
  `export { default as PickerStyles } from 'bundle-text:./PickerStyles.scss'`.
  `bundle-text:` is a Parcel build-time scheme, so a consumer with
  `skipLibCheck: false` got an unresolved module error on a package they had
  only imported `Picker` from. `PickerStyles` was never a runtime export of the
  package: `src/index.ts` does not list it, and the line reached the declarations
  only because `@parcel/transformer-typescript-types` hoisted a re-export out of
  an internal barrel. The barrel no longer re-exports it, and the one consumer of
  it inside the package imports it directly.
- **Fixed:** `init`, `SearchIndex.search` and the shadow element constructor
  declared their options bag as `{}`, so reading `caller`, `maxResults` or
  `styles` off it was an error under the same setting. Each now declares the
  shape its body reads.
- No behaviour change. In `dist/browser.js`, `dist/main.js` and
  `dist/module.js` the compiled stylesheet is now assigned ahead of the class
  that injects it rather than after it, under a different generated module id,
  and the two unminified entries drop one `// @ts-nocheck` comment line. Nothing
  else moves.

The release gate now builds its scratch consumer with `skipLibCheck: false`,
which is what would have caught this.

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
