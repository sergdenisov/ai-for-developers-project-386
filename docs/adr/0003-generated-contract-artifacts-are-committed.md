# Generated contract artifacts are committed

The OpenAPI document compiled from the TypeSpec contract (`spec/openapi.yaml`), the frontend SDK and the backend handler
types generated from it (`frontend/src/api/generated/`, `backend/src/api/generated/`) are committed, not generated at
build time. A contract change then shows up in one pull request from TypeSpec to SDK, agents read the contract and its
types as plain files without running a generator, and type checks work right after a clone. The cost is generated
code in the repository: `check:contract` regenerates it and fails on any `git diff`, so do not edit these files by
hand, and do not move them to `.gitignore` without replacing that check.

## Consequences

knip and oxlint skip the two `generated/` directories, the only exceptions this decision needs; formatting is applied
to the generated code instead of being skipped.
