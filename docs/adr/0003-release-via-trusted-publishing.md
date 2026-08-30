---
status: accepted
---

# Release via npm trusted publishing, approved by hand with staged publishing

Releases are built and staged from GitHub Actions using npm trusted publishing
(OIDC), and reach the registry only when a maintainer runs `npm stage approve`
with 2FA. Merging to `main` triggers the release workflow, which compares each
package manifest against its parent commit, releases only the packages whose
version changed, and does so in dependency order: Data, then core, then the React
wrapper. Approval *is* the publish: the version lands on whichever dist-tag CI
named at stage time, which is always `latest`.

We are asking people to swap out a package they already trust, so provenance
attestation and a human in the loop are both worth more here than release
convenience.

## Why approval is manual

npm's OIDC exchange authenticates `npm publish` and `npm stage publish`, and
nothing else. `npm dist-tag` is not covered. Moving a tag from a workflow would
need a long-lived npm token in a repository secret, granting write on the whole
scope, permanently — the exact credential trusted publishing exists to remove,
reintroduced to save one command.

One manual act per release also carries proof of presence: a workflow cannot
publish on its own. That is worth more here than in a repo where CI is the only
publisher anyway.

## Why there is no `next` window

This ADR originally staged every release under a `next` dist-tag, promoting to
`latest` only after a smoke test ran against the real registry. That window
existed so a published version could be verified before `latest` moved.

The verification was built, run, and then examined honestly. Installing from the
registry rather than from the local tarball tests the same bytes, with integrity
hashes and provenance already covering their origin. What it added over the
release gate — which packs and renders the very tarballs that get published — did
not justify a second workflow and a second dist-tag state.

A staged version is not installable, so there is no window between staging and
approval in which to verify anything from the registry. The evidence at approval
time is the release gate, and `npm stage download <stage-id>` will hand over the
exact tarball if something needs inspecting first.

## Consequences

- **The release gate is the evidence.** It packs all three packages, installs the
  tarballs into a scratch React app, type checks, bundles, and renders the picker
  in a real browser. It runs on every pull request and every push to `main`, and
  again inside the release workflow before staging, because `main` can move
  between a green pull request and its merge and the merge commit is what gets
  staged.
- **The Jest suite does not gate releases.** It never packs or installs a tarball,
  so it says nothing about what ships. It exists alongside the gate because the
  gate renders the picker in its default state and cannot reach behaviour that
  state does not exercise. Which behaviour that is at any moment is whatever the
  suite asserts; this ADR does not fix a boundary, and nothing here reserves the
  rendered picker for the gate. CI green means prettier passed, types compiled,
  the unit suite passed with its coverage floor met, and the gate rendered.
- **The one post-publish check that survives applies only to Data.** The `@0.1`
  jsDelivr pin baked into every published core means a Data release becomes what
  every default install fetches, with no core release involved, and whether
  jsDelivr serves it cannot be known beforehand. After approving a Data release:

  ```sh
  curl -sI "https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.1/sets/15/native.json" | grep x-jsd-version
  ```

  It should report the version just approved. See
  [ADR-0004](0004-pin-the-data-cdn-url-to-a-minor-range.md). This is also why Data
  must be released before core.
- **The git tag is pushed at stage time, before approval**, because approval
  happens out of band and the workflow cannot wait for it. A rejected stage leaves
  a tag pointing at a commit that was never released, and it should be deleted by
  hand. A tag is therefore not evidence that a version is on the registry;
  provenance on the registry entry is.
- **The trusted publisher configuration must allow `npm stage publish`.** The three
  packages were originally configured for `npm publish`. If the allowed actions do
  not include staging, the workflow fails to authenticate.
- **The configuration is not readable from outside**: it appears nowhere in the
  registry metadata, and npm validates nothing when it is saved. A misconfiguration
  is indistinguishable from a correct one until a release fails to authenticate.
  That is the argument for spending a version number on a proving release rather
  than discovering it during one that matters.
- **npm matches a trusted publisher against a specific workflow filename**, so
  `.github/workflows/release.yml` cannot be renamed without reconfiguring all three
  packages on npm.
- The first publish of each package is manual and token-authenticated. A trusted
  publisher is configured on a package's npm settings page, which requires the
  package to exist, so OIDC cannot bootstrap itself.
- Trusted publishing requires Node >= 22.14.0. Rather than run two Node versions,
  the toolchain pin in `.node-version` moved from 16.13.0 to 22.23.2, which clears
  that floor, so build and publish share one Node version and one `setup-node`
  step. Node is resolved by `actions/setup-node` from `.node-version` via its
  `node-version-file` input.
- Trusted publishing also requires npm >= 11.5.1, and Node 22.23.2 bundles npm
  10.9.8. The release workflow therefore installs a newer npm before publishing.
  This is the one place the toolchain is not what `.node-version` implies.

## What the releases proved

**0.1.0, published by hand.** A trusted publisher cannot be configured on a package
that does not exist, so the first release of each package was token-authenticated.
Those entries carry `signatures` but no `attestations`.

- **Publishing needs 2FA or a bypass token even with 2FA off.** The first attempt
  failed with `E403 ... Two-factor authentication or granular access token with
  bypass 2fa enabled is required to publish packages`, on an account whose
  `npm profile get` reported `two-factor auth: disabled`. The account setting does
  not exempt a publish. A granular access token with the bypass option was used.
- **`next` staging did not happen, and could not have.** All three were published
  with `--tag next` and all three came out as `{"next":"0.1.0","latest":"0.1.0"}`:
  npm points `latest` at the first version of a new package whatever `--tag` says.
- **The dependency order held and paid off.** Data went out first, jsDelivr served
  it within a minute, and `yarn release:gate --published` then proved the repointed
  CDN URL before core existed to depend on it.
- **npm normalises `repository.url`** to its `git+https://….git` form on publish, so
  0.1.0's registry metadata differed cosmetically from the manifests in the tree.
  Fixed in `@quotidianlabs/emojis-react` 0.1.3.

**`@quotidianlabs/emojis-react` 0.1.1 proved OIDC**, deliberately a version that
changed no code, on the one package where a throwaway version is inert: nothing
resolves the wrapper automatically, whereas a Data patch is picked up immediately
by the `@0.1` CDN pin baked into every published core. It published with no npm
token in the workflow at all, and carries a provenance attestation
(`https://slsa.dev/provenance/v1`). The full CI suite and the release gate ran
before the publish step, so a release cannot skip its own gate.

**`@quotidianlabs/emojis` 0.1.1, `@quotidianlabs/emojis-data` 0.1.1 and
`@quotidianlabs/emojis-react` 0.2.1 proved staged approval**, which is what moved
that half of this decision from proposed to accepted. All three carry provenance,
and all three landed directly on `latest` — the `next` tag never moved from 0.1.0,
because under this process nothing promotes it. Those leftover `next` tags, which
pointed at a superseded version and named a mechanism that no longer exists, have
been removed from the registry.

**0.1.2 was never published.** It sat on `main` while the release trigger moved
from a manual dispatch to a merge, and the dispatch route went with it. Nothing was
ever published under that number, so there is nothing a consumer could have
installed.
