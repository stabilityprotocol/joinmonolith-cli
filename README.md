# @joinmonolith/cli

Official command-line interface for the [Monolith](https://joinmonolith.com) API.

## Install

Global:

```bash
npm install -g @joinmonolith/cli
# or
bun add -g @joinmonolith/cli
```

One-shot via `npx`:

```bash
npx @joinmonolith/cli hash ./image.png
```

## Commands

### `monolith hash <path>`

Compute the SHA-256 fingerprint of a file using the same algorithm the Monolith API applies to uploaded images. Output is a `0x`-prefixed lowercase 64-char hex string.

```bash
$ monolith hash ./image.png
0x20a7b5ffe611944e5773e165d2d2a25d79cea4880a27dbac4624b3158a7aef7e
```

Exit codes:
- `0` success
- `1` runtime error (missing file, IO failure)
- `2` invalid usage (missing arg, unknown command)

## Programmatic use

```ts
import { fingerprintFile, fingerprintBytes } from "@joinmonolith/cli";

const fp = await fingerprintFile("./image.png");
// 0x...

const fp2 = fingerprintBytes(new Uint8Array([1, 2, 3]));
```

## Development

```bash
bun install
bun test
bun run build
```

## Releases

Automated via [release-please](https://github.com/googleapis/release-please) and GitHub Actions.

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` → minor bump
- `fix:` → patch bump
- `feat!:` / `BREAKING CHANGE:` → major bump (or minor while pre-1.0)
- `chore:`, `docs:`, `refactor:`, `test:` → no release

Workflow:

1. Merge conventional commits into `main`.
2. `release-please` opens/updates a release PR with version bump + `CHANGELOG.md`.
3. Merge the release PR → tag is created → npm publishes automatically (with provenance).

### One-time setup

- Create npm access token (`Automation` type), add as repo secret `NPM_TOKEN`.
- Ensure the `@joinmonolith` org exists on npm and the token has publish rights.
- GitHub repo settings → Actions → General → Workflow permissions → enable "Read and write" + "Allow GitHub Actions to create and approve pull requests".

## License

MIT
