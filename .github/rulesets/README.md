# Branch protection (versioned ruleset)

`main-protection.json` is the **source of truth** for the protection on the
`main` branch. GitHub does **not** read this file automatically — it must be
applied once by a repository **admin**. After that it lives server-side and
re-applying only updates it.

> **Status: versioned but intentionally NOT active yet.** This ruleset has not
> been applied to the repository — nothing here is being enforced. Direct
> pushes to `main` are still allowed and the Security Gate only *reports* on
> the CI run (it does not block merges). To turn it on, an admin must run the
> apply step below. Until then, treat this file as a ready-to-apply draft.

## What it enforces on `main`

- **No direct pushes** — changes must go through a Pull Request.
- **Security Gate must pass** — the required status checks
  `Trivy dependency scan (back-end)` and `(front-end)` must be green before merge.
- **Branch must be up to date** before merging (`strict` policy).
- **No force-push, no deletion** of `main`.
- **0 required approvals** — a PR is required, but a solo maintainer can merge
  their own once checks pass. Bump `required_approving_review_count` to `1`
  for team review.
- **Repository admins can bypass** (`bypass_actors`) to avoid lockout in an
  emergency. Remove that block for the strictest setup.

## Apply it (admin, once)

With the GitHub CLI (`gh auth login` as an admin first):

```sh
gh api -X POST repos/loomi/claudecode-local-project-template/rulesets \
  --input .github/rulesets/main-protection.json
```

Or with curl + a PAT that has `repo` admin scope:

```sh
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/loomi/claudecode-local-project-template/rulesets \
  -d @.github/rulesets/main-protection.json
```

### Update an existing ruleset

List rulesets to find the id, then `PUT`:

```sh
gh api repos/loomi/claudecode-local-project-template/rulesets
gh api -X PUT repos/loomi/claudecode-local-project-template/rulesets/<RULESET_ID> \
  --input .github/rulesets/main-protection.json
```

> The status check `context` values must match the job names produced by
> `.github/workflows/security-gate.yml` exactly. That workflow names the job
> `Trivy dependency scan` and runs a matrix over `back-end`/`front-end`, so the
> check names render as `Trivy dependency scan (back-end)` and `(front-end)`.
> If you rename the job or the matrix, update both files together.
