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

### `monolith hash <path|-> [--json]`

Compute the SHA-256 fingerprint of a file (or stdin) plus a perceptual hash when the file kind is recognized:

- **Image** → 64-bit pHash via [`@stabilityprotocol.com/phash`](https://github.com/stabilityprotocol/monolith-phash-algo) (same algorithm the API uses)
- **Audio** → AcoustID-compatible Chromaprint via [`rusty-chromaprint-wasm`](https://github.com/janis-me/rusty-chromaprint-wasm) (pure WASM, no native binaries)
- **Other** → fingerprint only

Auto-detects file kind via magic-byte sniffing ([`file-type`](https://www.npmjs.com/package/file-type)).

#### Human output (default)

```bash
$ monolith hash ./image.png
fingerprint=0x20a7b5ffe611944e5773e165d2d2a25d79cea4880a27dbac4624b3158a7aef7e
kind=image
mime=image/png
phash=918b8b916e4aee91

$ monolith hash ./song.mp3
fingerprint=0x6ea817bd7891b4f75dbe37498a36f02b232337f0e8ec04ee4fd5843bed1b2d39
kind=audio
mime=audio/mpeg
chromaprint=AQAAE0mUaEkSZSoAAAAAAAAA...
sampleRate=44100
channels=2
durationSec=183.524
```

#### JSON output (`--json`)

```bash
$ monolith hash ./image.png --json
{"fingerprint":"0x...","kind":"image","mime":"image/png","ext":"png","phash":"918b8b916e4aee91"}
```

#### Stdin

```bash
$ cat ./image.png | monolith hash -
fingerprint=0x...
kind=image
phash=...
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

Lower-level perceptual hashes are exported on the same module if you have already loaded the bytes:

```ts
import { detectKind, phashImage, chromaprintAudio } from "@joinmonolith/cli";

const bytes = new Uint8Array(await Bun.file("./image.png").bytes());
const info = await detectKind(bytes);
if (info.kind === "image") console.log(await phashImage(bytes));
if (info.kind === "audio") console.log((await chromaprintAudio(bytes)).fingerprint);
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
