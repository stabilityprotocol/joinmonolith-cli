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

## License

MIT
