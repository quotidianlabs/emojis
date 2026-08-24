---
status: proposed
---

# Approve releases by hand, using staged publishing

CI stages a release over OIDC and it reaches the registry only when a maintainer
runs `npm stage approve` with 2FA. There is no `next` dist-tag to promote from and
no automated dist-tag move: approval *is* the publish, and the version lands on
whichever tag CI named at stage time.

This ADR stays `proposed` until a release actually runs through it. It supersedes
the `next`-staging half of [ADR-0003](0003-release-via-trusted-publishing.md); the
trusted publishing half stands.

## Why not automate the promotion

npm's OIDC exchange authenticates `npm publish` and `npm stage publish`, and
nothing else. `npm dist-tag` is not covered. Promoting `next` to `latest` from a
workflow would therefore need a long-lived npm token in a repository secret,
granting write on the whole scope, permanently. That is the credential trusted
publishing exists to remove, and it would be reintroduced to save one command.

## Why not keep the `next` window either

The `next` window existed so that a published version could be verified against
the real registry before `latest` moved. That verification was built, run, and
then examined honestly: installing from the registry rather than from the local
tarball tests the same bytes, with integrity hashes and provenance already
covering their origin. What it added over the release gate, which packs and
renders the very tarballs that get published, did not justify a second workflow
and a second dist-tag state.

## Consequences

- **One manual act per release**, and it carries proof of presence. A workflow
  cannot publish on its own, which is worth more here than it would be in a repo
  where CI is the only publisher anyway.
- **The evidence at approval time is the release gate**, which packs the real
  tarballs, installs them into a scratch React app and renders the picker in a
  browser. `npm stage download <stage-id>` will hand over the exact tarball if
  something needs inspecting before approving.
- **A staged version is not installable**, so nothing can be verified from the
  registry between staging and approval. There is no window in which to try.
- **The one post-publish check that survives applies only to Data.** The `@0.1`
  jsDelivr pin baked into every published core means a Data release becomes what
  every default install fetches, with no core release involved, and whether
  jsDelivr serves it cannot be known beforehand. After approving a Data release:

  ```sh
  curl -sI "https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.1/sets/15/native.json" | grep x-jsd-version
  ```

  It should report the version just approved. See
  [ADR-0004](0004-pin-the-data-cdn-url-to-a-minor-range.md).
- **The trusted publisher configuration must allow `npm stage publish`.** The
  three packages were originally configured for `npm publish`. If the allowed
  actions do not include staging, the workflow fails to authenticate.
- **The git tag is pushed at stage time, before approval**, because approval
  happens out of band and the workflow cannot wait for it. A rejected stage
  therefore leaves a tag pointing at a commit that was never released, and it
  should be deleted by hand.
