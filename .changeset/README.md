# Changesets

Add a Changeset for each user-facing release. Choose a `patch`, `minor`, or
`major` bump, then commit the generated Markdown file with the change.

On a release branch, run `pnpm version-packages` to update Encore's version and
changelog. Review and commit those changes, then run `pnpm release` to publish
the package to npm. The Changesets base branch is `master`.
