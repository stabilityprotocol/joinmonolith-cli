import { readFile, stat } from "node:fs/promises";
import { fingerprintBytes } from "./fingerprint";
import { detectKind, phashImage, chromaprintAudio } from "./perceptual";

const HELP = `monolith - CLI for monolith API

Usage:
  monolith hash <path>          Compute fingerprint + perceptual hash
  monolith hash -               Read bytes from stdin
  monolith hash <path> --json   JSON output
  monolith --help               Show this help

For images, also returns pHash (matches @stabilityprotocol.com/phash).
For audio, also returns Chromaprint fingerprint (AcoustID-compatible).
`;

async function readSource(path: string): Promise<Uint8Array> {
  if (path === "-") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
  try {
    await stat(path);
  } catch {
    throw new Error(`File not found: ${path}`);
  }
  const buf = await readFile(path);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

async function hashCommand(args: string[]): Promise<number> {
  const json = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));
  const path = positional[0];
  if (!path) {
    process.stderr.write("Error: missing file path\nUsage: monolith hash <path|-> [--json]\n");
    return 2;
  }
  try {
    const bytes = await readSource(path);
    const fingerprint = fingerprintBytes(bytes);
    const info = await detectKind(bytes);

    let phash: string | undefined;
    let chromaprint: string | undefined;
    let audioMeta: { sampleRate: number; channels: number; durationSec: number } | undefined;

    if (info.kind === "image") {
      phash = await phashImage(bytes);
    } else if (info.kind === "audio") {
      const r = await chromaprintAudio(bytes);
      chromaprint = r.fingerprint;
      audioMeta = { sampleRate: r.sampleRate, channels: r.channels, durationSec: r.durationSec };
    }

    if (json) {
      const out: Record<string, unknown> = {
        fingerprint,
        kind: info.kind,
      };
      if (info.mime) out.mime = info.mime;
      if (info.ext) out.ext = info.ext;
      if (phash) out.phash = phash;
      if (chromaprint) {
        out.chromaprint = chromaprint;
        out.sampleRate = audioMeta!.sampleRate;
        out.channels = audioMeta!.channels;
        out.durationSec = audioMeta!.durationSec;
      }
      process.stdout.write(`${JSON.stringify(out)}\n`);
    } else {
      const lines = [`fingerprint=${fingerprint}`, `kind=${info.kind}`];
      if (info.mime) lines.push(`mime=${info.mime}`);
      if (phash) lines.push(`phash=${phash}`);
      if (chromaprint) {
        lines.push(`chromaprint=${chromaprint}`);
        lines.push(`sampleRate=${audioMeta!.sampleRate}`);
        lines.push(`channels=${audioMeta!.channels}`);
        lines.push(`durationSec=${audioMeta!.durationSec.toFixed(3)}`);
      }
      process.stdout.write(`${lines.join("\n")}\n`);
    }
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${msg}\n`);
    return 1;
  }
}

export async function run(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(HELP);
    return 0;
  }

  if (cmd === "hash") return hashCommand(rest);

  process.stderr.write(`Unknown command: ${cmd}\n${HELP}`);
  return 2;
}
