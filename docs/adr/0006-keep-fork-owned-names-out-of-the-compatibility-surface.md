---
status: accepted
---

# Keep Fork-Owned Names out of the Compatibility Surface

`@quotidianlabs/emojis-react@0.2.0` began exporting type names, and the obvious
move was to add them to the Compatibility Surface. We rejected it. The two
commitments fail differently: renaming something held byte-identical to Upstream
breaks the Drop-in Replacement contract for people who have not migrated yet,
which [ADR-0001](0001-preserve-upstream-runtime-identifiers.md) rules out
permanently, while renaming a name Upstream never had breaks a build for people
who already migrated — an ordinary breaking change a version bump can carry.
One list holding both would mean "names we do not rename" rather than "names
Upstream also has", and would stop answering the question it exists to answer.

## Consequences

- `SkinIndex` and `SkinTonePosition` use "skin" for a position in a Skin list and
  "skin tone" for the selector, which `CONTEXT.md` lists under _Avoid_. `Icons`
  holds an icon style (`auto`, `outline`, `solid`), not a collection of icons.
  Each mirrors the prop it types rather than this project's vocabulary. All three
  were considered and deliberately kept. **Do not "fix" them.** Correcting one is
  a breaking change for published consumers and belongs in its own issue with a
  version plan.
- Adding a Fork-Owned Name is not a Compatibility Surface decision and needs no
  ADR. Removing or renaming one does.
