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
- The very first publish of each package was manual and token-authenticated. A
  trusted publisher is configured on a package's npm settings page, which requires
  the package to exist — OIDC cannot bootstrap itself.
- Trusted publishing requires Node >= 22.14.0 while the build toolchain is pinned
  much older, so the release workflow runs `setup-node` twice: one version to build,
  another to publish.
