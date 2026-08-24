---
status: accepted
---

# Preserve Upstream's runtime identifiers

This fork renames the packages and their directories, but deliberately leaves every
runtime-visible identifier inherited from Upstream unchanged: the `em-emoji-picker`
and `em-emoji` custom element tags, the `emoji-mart.` browser storage key prefix,
the `--em-*` CSS custom properties, the `emoji-mart-emoji` CSS class, the
`window.EmojiMart` global the browser bundle assigns, and the `EmojiMartData` type
the Data package exports. This is the Compatibility Surface, and holding it
byte-identical is what makes the fork a Drop-in Replacement: changing the import
specifier is the entire migration.

## Consequences

- A package named `@quotidianlabs/emojis` permanently emits `em-emoji` tags and
  writes `emoji-mart.`-prefixed storage keys. This reads as an inconsistency and is
  not one. **Do not "fix" it.**
- Renaming the storage prefix would silently discard every viewer's Frequently Used
  ranking and skin choice on upgrade, which is the precise opposite of what a
  Drop-in Replacement promises. That alone rules the change out.
- Both `customElements.define` calls are guarded by a `customElements.get` check, so
  a page loading this fork alongside Upstream does not throw; whichever loads first
  claims the tag. Co-existence is safe by construction and needs no namespacing.
- The browser bundle still assigns `window.EmojiMart`, so a consumer who loads the
  package from a `<script>` tag keeps writing `EmojiMart.Picker`. That name is as
  load-bearing as the tag names, and renaming it would break every script-tag
  integration to buy nothing.
- The Data package still exports its type as `EmojiMartData`, for the same reason:
  it appears in consumers' own type annotations.
