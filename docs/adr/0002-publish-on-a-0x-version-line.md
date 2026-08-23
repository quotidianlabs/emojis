---
status: accepted
---

# Publish the fork on a 0.x version line

All three packages started at `0.1.0` rather than continuing Upstream's numbering
(core 5.6.0, data 1.2.1, react 1.1.1) or resetting to 1.0.0. The fork is a
Drop-in Replacement today, but we reserve the right to restructure the package
split before committing to a stable line, and `0.x` states that honestly instead of
inheriting a maturity signal we have not yet earned.

## Consequences

- Version numbers no longer map to Upstream's. `@quotidianlabs/emojis@0.1.0` is
  `emoji-mart@5.6.0` plus the rename; there is no arithmetic relationship after that.
- Caret ranges collapse below 1.0 (`^0.1.0` means `>=0.1.0 <0.2.0`), so the react
  package's peer dependency on core is written as an explicit `>=0.1.0 <1.0.0`
  instead. A tight peer range would buy no safety and would force a coordinated
  three-package release on every core minor.
- Packages are versioned independently. Only the package that changed gets a bump —
  no sympathy releases to keep the three numbers aligned.
