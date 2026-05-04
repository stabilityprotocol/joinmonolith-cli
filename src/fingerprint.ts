import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

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
