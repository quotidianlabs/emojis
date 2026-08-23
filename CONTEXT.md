# Emojis

A maintained fork of [emoji-mart](https://github.com/missive/emoji-mart), an emoji
picker for the web, published as the `@quotidianlabs/emojis` package family.

## Language

### Emoji domain

**Emoji**:
A single entry in the dataset, identified by a stable shortcode `id` such as `+1`
or `heart_eyes`.
_Avoid_: emoticon (that word names the ASCII form, e.g. `:)`, which an Emoji may
also carry)

**Skin**:
A tone variant of an Emoji, carrying its own codepoints. Every Emoji has at least
one Skin; the base form is the first.
_Avoid_: variant, tone, skin tone

**Set**:
The visual style an Emoji is drawn in: `native`, `apple`, `facebook`, `google`, or
`twitter`. Everything but `native` is drawn from a spritesheet.
_Avoid_: theme (that word is taken: it means light/dark), style, pack

**Emoji Version**:
The Unicode release an Emoji first appeared in. Ranges from 1 to 15.
_Avoid_: unicode version, emoji version number

**Native Support**:
Whether the viewer's own platform can draw a given Emoji. Determined per Emoji
Version by probing the browser, not by configuration.
_Avoid_: browser support, platform support

**Category**:
A named group of Emoji ids that the picker renders as one section.

**Frequently Used**:
The per-viewer ranking of Emoji by selection count, held in browser storage and
shown as the picker's first Category.
_Avoid_: frecent, recents, favourites

**Data**:
The emoji dataset: categories, emojis, aliases and spritesheet geometry for one
Emoji Version and one Set. Ships as its own package and can also be supplied by
the consumer.
_Avoid_: dataset, emoji data, index

**Custom Emoji**:
An Emoji supplied by the consumer rather than drawn from Data.

### Fork domain

**Upstream**:
`missive/emoji-mart` and its `emoji-mart` / `@emoji-mart/*` packages, unmaintained
since 2024.
_Avoid_: original, parent, the old package

**Compatibility Surface**:
The identifiers this fork holds byte-identical to Upstream so that consumers can
swap packages and change nothing else: the custom element tag names, the browser
storage key prefix, the CSS custom properties, and the CSS class names.
_Avoid_: public API (that is broader), drop-in surface

**Drop-in Replacement**:
The contract this fork offers: changing only the import specifier is sufficient to
migrate off Upstream.
