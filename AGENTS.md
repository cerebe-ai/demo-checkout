# AGENTS.md — demo-checkout

A small Express checkout service (login, sessions, order totals) that exists to show Cerebe reviewing a pull request; its open pull requests are the demo. Coding agents follow this file when they write changes, and Cerebe's critics read it when they review them.

Commands are the `package.json` scripts; CI is `.github/workflows/test.yml`.

## API contracts

- Session endpoints return the session in the JSON body as `{ token, expiresAt }` — the same shape as `POST /login`.
- Clients authenticate with `Authorization: Bearer <token>`. The service does not use cookie sessions; don't add one.
- Errors are JSON — `{ "error": "<message>" }` — with a 4xx status.

Held by `test/app.test.ts` (checkout needs a Bearer token; login returns one) and `cerebe/critic` review.

## Configuration

- Every key in `config/default.json` is declared on the `Config` interface and checked by `loadConfig()` in `src/config.ts`. Don't add a setting the code doesn't read.

Held by `loadConfig()`, which throws when a declared key is missing. It does not reject an undeclared or unread key; review holds that.

## Money

- Amounts are integer minor units (cents), and tax is in basis points (`taxRateBasisPoints`). Never use floating point for money.

Held by `test/billing.test.ts` (whole-cent totals, tax in basis points) and review.

## Tests

- Every new endpoint or behaviour ships with tests in `test/` covering the success path and the 4xx paths. Run `npm test` before you push.

Held by review, which checks that new paths are covered.

## Scope

- One behaviour per pull request. Keep changes small enough to review in one sitting.

Held by review.
<!-- cerebe:pack-digest:v1 sha256=4cc3f38a5b2ce6608ec15a4caa7a5d584768fedfdbe72adb00953b244f548093 -->
# Working with Cerebe's review

Cerebe reviews your changes and reports findings. Each finding names a file, the evidence, the impact and the fix it requires.

- Locally, when review is on: `cerebe status` shows the verdict and findings for your latest commit, and `cerebe show` prints the full review. The pre-push hook runs `cerebe gate-push`, which blocks a push while a blocking finding is unresolved.
- On a pull request: findings are annotations on the `cerebe/critic` check. `cerebe review-status --pr <number>` prints the result as data.
- Fix each finding whose evidence holds. When the evidence does not hold, say why in the pull request, citing the code.
- Commit and push again; the new commit is reviewed.

---

# When review rounds stop converging

A round is one review and the fixes that answer it.

- Budget three rounds by default; use the repository's number if its guidance sets one.
- After each round, compare the new findings with the last. You are converging when there are fewer and no new kinds. A lower severity, or the same finding moved to another file, is not progress.
- When new kinds of finding keep appearing in the same part of the change, stop fixing them one by one. Restructure that part: simplify it, remove it, or split it into its own change.
- Ask the person you work for only when a mergeable change needs a decision that is theirs.

---

# When a gate fails because of the base branch

Before you fix a failing gate, find out whose failure it is.

- Run `cerebe verify --triage-base <base-ref> --route <id>`, or `cerebe verify --triage-base <base-ref> --gate "<command>"` for a gate that is not a route. It runs the gate in your tree and at the base, and prints one verdict.
- `in-diff` or `inconclusive`: treat it as yours and fix it.
- `pre-existing`: leave it out of this change unless the fix is a few adjacent lines. File an issue naming the gate and cite it in your pull request.
- If the push gate blocks only on that failure, push with the reason: `CEREBE_BYPASS="<gate> fails at <base-ref>; tracked at #<issue>" git push`. Never bypass a failure your change caused.

---

# Producing the evidence the gate reads

This applies when the repository defines verification routes: commands that must pass when a change touches certain paths.

- Before you push, run `cerebe verify`. It runs the routes your commit triggers and records the result for that exact commit. `cerebe verify --route <id>` runs one route.
- `cerebe gate-push` blocks a push when a triggered route has no passing evidence. Evidence is bound to the diff, so run `cerebe verify` again after you change the commit.
- A failing route is a real failure: fix the cause. Never write or edit evidence by hand.
- `cerebe gates` runs the quality gates and the triggered routes with no model call.
<!-- /cerebe:pack-digest:v1 -->
