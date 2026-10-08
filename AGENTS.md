# AGENTS.md — demo-checkout

How to work in this repository. Coding agents follow it when they write changes, and Cerebe's critics read it when they review them.

## API contracts

- Session endpoints return the session in the JSON body as `{ token, expiresAt }` — the same shape as `POST /login`.
- Clients authenticate with `Authorization: Bearer <token>`. The service does not use cookie sessions; don't add one.
- Errors are JSON — `{ "error": "<message>" }` — with a 4xx status.

## Configuration

- Every key in `config/default.json` is declared on the `Config` interface and checked by `loadConfig()` in `src/config.ts`. Don't add a setting the code doesn't read.

## Money

- Amounts are integer minor units (cents), and tax is in basis points (`taxRateBasisPoints`). Never use floating point for money.

## Tests

- Every new endpoint or behaviour ships with tests in `test/` covering the success path and the 4xx paths. Run `npm test` before you push.

## Scope

- One behaviour per pull request. Keep changes small enough to review in one sitting.
