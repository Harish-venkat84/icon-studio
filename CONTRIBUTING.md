# Contributing to Icon Studio

Thanks for helping out! Bug reports, features, docs and new tests are all welcome.

## Getting set up

Requirements: Node.js 24 (`.nvmrc`) and pnpm 12 (`corepack enable`).

```bash
pnpm install
cp apps/studio/.env.example apps/studio/.env.local
pnpm dev   # http://localhost:3030
```

## Before you open a pull request

Run the same checks as CI:

```bash
pnpm format:check && pnpm lint:check && pnpm typecheck && pnpm test && pnpm build
```

`pnpm format` and `pnpm lint` fix most issues for you. A pre-commit hook runs oxlint and oxfmt on
staged files.

## Guidelines

- Keep pull requests focused: one fix or feature per PR, with a short description of what and why.
- Add or update tests in `packages/core` for changes to sanitizing, codegen, metadata or releases.
- If you change the studio UI, check it in both light and dark theme.
- Don't commit generated files (`packages/icons/src/generated`, `dist`) or `.env` files.
- Sample icons in `icons/` must be your own work or under a license compatible with MIT.

## Project layout

| Path             | What it is                                                         |
| ---------------- | ------------------------------------------------------------------ |
| `packages/core`  | SVG sanitizing and optimizing, metadata schemas, codegen, releases |
| `packages/icons` | The generated, published icon package and its generator script     |
| `apps/studio`    | The Next.js studio (UI, storage backends, basic auth)              |
| `icons/`         | Icon sources: `<slug>.svg` + `<slug>.json`                         |
| `images/`        | Image sources: `<slug>.png` + `<slug>.json`                        |

## Reporting bugs and ideas

Use the issue templates. For security problems, follow [SECURITY.md](SECURITY.md) instead of
opening a public issue.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
