---
status: accepted
---

# Keep Fork-Owned Names out of the Compatibility Surface

`@quotidianlabs/emojis-react@0.2.0` began exporting twenty type names. Upstream's
`@emoji-mart/react` typed its component as `props: any` and exported none, so
these names have no Upstream counterpart. They are Fork-Owned Names rather than
part of the Compatibility Surface: no consumer migrating off Upstream can have
been importing them, so there is nothing to hold them byte-identical to. They are
still held stable — they are on the registry, and a rename breaks real builds —
but by ordinary semver against our own consumers.

The distinction is worth a separate term because the two commitments fail
differently. Renaming a Compatibility Surface identifier breaks the Drop-in
Replacement contract for people who have not migrated yet, and no version bump
makes that acceptable;
[ADR-0001](0001-preserve-upstream-runtime-identifiers.md) rules those changes out
permanently. Renaming a Fork-Owned Name breaks a build for people who already
migrated, which is an ordinary breaking change: it needs a version bump, a
changelog entry and a migration note, and it is allowed to happen. Folding both
into one list would have redefined the Compatibility Surface as "names we do not
rename" instead of "names Upstream also has", and it would have stopped answering
the question it exists to answer — which identifier can I not touch, and why.

## Consequences

- `EmojiMartData` stays in the Compatibility Surface, because Upstream's Data
  package exports that name too. The wrapper's names sit under Fork-Owned Names.
  The two are governed by different rules and are listed separately in
  `CONTEXT.md`.
- A wrapper type name may be renamed, unlike anything in the Compatibility
  Surface. It costs a breaking release and a migration note. On the 0.x line
  ([ADR-0002](0002-publish-on-a-0x-version-line.md)) that is a minor, which caret
  ranges do not cross, so it reaches nobody who did not ask for it.
- Adding a type name is not a Compatibility Surface decision and needs no ADR.
  Removing or renaming one does.
- The wrapper's type names are not the only case. `@quotidianlabs/emojis-data`
  declares a default export that Upstream's `@emoji-mart/data` does not, so that
  the `import data from '@quotidianlabs/emojis-data'` every README shows
  type-checks against the wrapper's `data` prop. It is Fork-Owned by the same
  reasoning: additive, invisible to anyone migrating, and ours to keep stable.
- Two names sit awkwardly against the glossary and were left as they are.
  `SkinIndex` and `SkinTonePosition` use "skin" for the position in a Skin list
  and "skin tone" for the selector, while `CONTEXT.md` defines Skin as the tone
  variant itself and lists "skin tone" under _Avoid_. `Icons` holds an icon style
  (`auto`, `outline`, `solid`), not a collection of icons. Each mirrors the prop
  it types, which is both the reason to keep it and the reason it reads badly.
  Correcting them is a breaking change and belongs in its own issue with a version
  plan.
- `PickerData` and its parts structurally duplicate `EmojiMartData` instead of
  importing it, so the wrapper takes no dependency on the Data package for the
  sake of a type. `packages/emojis-react/react.test-d.ts` pins that `EmojiMartData`
  still satisfies `PickerData`. That test is what keeps the duplication honest and
  should outlive any revisit of it.
