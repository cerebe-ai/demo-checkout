# demo-checkout

A small checkout service that exists to show [Cerebe](https://cerebe.ai) reviewing a pull request.

It is an Express API with three parts: `src/auth.ts` (login and session checks), `src/session.ts` (an in-memory session store) and `src/billing.ts` (order totals with tax in basis points). Settings live in `config/default.json`. The tests run with `npm test`.

The open pull request in this repository is the demo: the Cerebe GitHub App reviews it and posts its verdict as a check, with every finding tied to a file and a line. Install the App on your own repository from https://cerebe.ai/install, or run the CLI on your workstation:

```sh
curl -fsSL https://cerebe.ai/install.sh | sh
```

## Run it

```sh
npm ci
npm run build
npm start
```

## Licence

MIT.
