---
status: accepted
---

# Release via npm trusted publishing, staged through the `next` dist-tag

Releases are published from GitHub Actions using npm trusted publishing (OIDC), on
a `workflow_dispatch` trigger, with the workflow creating a per-package git tag
(`emojis-v0.1.0`, `emojis-data-v0.1.0`, `emojis-react-v0.1.0`). Every release goes
out under the `next` dist-tag first and is promoted to `latest` only after the
smoke test passes against the real registry. We are asking people to swap out a
package they already trust, so provenance attestation and an unpublishable-mistake
buffer are both worth more here than release convenience.

The 0.1.0 releases did not run through this: they were published by hand against
a token, because a trusted publisher cannot be configured on a package that does
not exist yet. What they taught is recorded under "What 0.1.0 actually did"
below. `@quotidianlabs/emojis-react@0.1.1` was then released through the workflow
to prove it before a release that mattered depended on it, which is what moved
this ADR to accepted.

The `next` dist-tag half of this decision is superseded by
[ADR-0005](0005-approve-releases-by-hand-with-staged-publishing.md): releases are
staged and approved with 2FA rather than published to `next` and promoted. The
trusted publishing half recorded here stands.

## Consequences

- **The inherited Jest suite does not gate releases, because it cannot.** Five of
  its six files are empty `test.skip` stubs; only two real tests exist, covering
  `deepEqual` and `sleep`. CI green means prettier passed and types compiled. The
  release gate is a committed smoke-test script that packs all three packages,
  installs the tarballs into a scratch React app, and asserts the picker renders.
- Some verification is only possible post-publish: jsDelivr cannot serve
  `@quotidianlabs/emojis-data` until it exists on npm, so the CDN path in the core
  bundle is unverifiable from local tarballs. This is why `next` staging exists, and
  why data must be published before core.
- The first publish of each package is manual and token-authenticated. A trusted
  publisher is configured on a package's npm settings page, which requires the
  package to exist, so OIDC cannot bootstrap itself.
- Trusted publishing requires Node >= 22.14.0. Rather than run two Node versions,
  the toolchain pin in `.node-version` moves from 16.13.0 to 22.23.2, which clears
  that floor. Build and publish therefore share one Node version and one
  `setup-node` step, and `nodenv/actions/node-version` keeps working unchanged.
- Trusted publishing also requires npm >= 11.5.1, and Node 22.23.2 bundles npm
  10.9.8. The release workflow therefore installs a newer npm before publishing.
  This is the one place the toolchain is not what `.node-version` implies.
- npm matches a trusted publisher against a specific workflow **filename**, so
  `.github/workflows/release.yml` cannot be renamed without reconfiguring all three
  packages on npm.
- The trusted publisher configuration is not readable from outside: it appears
  nowhere in the registry metadata, and npm validates nothing when it is saved. A
  misconfiguration is indistinguishable from a correct one until a release fails
  to authenticate. That is the argument for spending a version number on a proving
  release rather than discovering it during one that matters.

## What emojis-react 0.1.1 proved

The first release through the workflow, deliberately a version that changed no
code, on the one package where a throwaway version is inert: nothing resolves the
wrapper automatically, whereas a Data patch is picked up immediately by the `@0.1`
CDN pin baked into every published core.

- It published over OIDC with no npm token in the workflow at all.
- It carries a provenance attestation (`https://slsa.dev/provenance/v1`). Compare
  `0.1.0`, published by hand, which has `signatures` but no `attestations`.
- **`next` staging worked, on a release that was not a package's first.** Tags
  went to `{"next":"0.1.1","latest":"0.1.0"}`, exactly as this ADR asks and
  exactly as a first publish cannot manage.
- The full CI suite and the release gate ran before the publish step, so a release
  cannot skip its own gate.

## What 0.1.0 actually did

- **`next` staging did not happen, and could not have.** All three packages were
  published with `--tag next`, and all three came out as `{"next":"0.1.0",
  "latest":"0.1.0"}`. npm points `latest` at the first version of a new package
  whatever `--tag` says. The staging rule holds for every release after a package's
  first, which is where it was ever going to matter; on a first publish there is no
  earlier version for `latest` to have pointed at and no consumer to protect.
- **Publishing needs 2FA or a bypass token even with 2FA off.** The first attempt
  failed with `E403 ... Two-factor authentication or granular access token with
  bypass 2fa enabled is required to publish packages`, on an account whose
  `npm profile get` reported `two-factor auth: disabled`. The account setting does
  not exempt a publish. A granular access token with the bypass option was used.
- **The order held and paid off.** Data went out first, jsDelivr served it within a
  minute, and `yarn release:gate --published` then proved the repointed CDN URL
  before core existed to depend on it.
- **npm normalises `repository.url`** to its `git+https://….git` form on publish, so
  0.1.0's registry metadata differs cosmetically from the manifests in the tree.
  Worth folding an `npm pkg fix` into the next patch rather than releasing for it.
