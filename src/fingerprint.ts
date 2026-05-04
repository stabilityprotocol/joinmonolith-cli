import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { Readable } from "node:stream";

export function fingerprintBytes(bytes: Uint8Array): string {
  const hex = createHash("sha256").update(bytes).digest("hex");
  return `0x${hex}`;
}

export async function fingerprintFile(path: string): Promise<string> {
  try {
    await stat(path);
  } catch {
    throw new Error(`File not found: ${path}`);
  }
  const buf = await readFile(path);
  return fingerprintBytes(buf);
}

export async function fingerprintStream(stream: Readable | AsyncIterable<Uint8Array>): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    hash.update(chunk);
  }
  return `0x${hash.digest("hex")}`;
}
