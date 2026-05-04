import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintBytes } from "../src/fingerprint";

const ENTRY = join(import.meta.dir, "..", "bin", "monolith.ts");
const FIXTURES = join(import.meta.dir, "fixtures");

async function runCli(
  args: string[],
  stdin?: Uint8Array
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({
    cmd: ["bun", ENTRY, ...args],
    stdin: stdin ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  if (stdin) {
    proc.stdin.write(stdin);
    await proc.stdin.end();
  }
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

function parseHumanOutput(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of stdout.trim().split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

test("hash command prints fingerprint + kind for arbitrary bytes", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "monolith-cli-cli-"));
  try {
    const path = join(tmp, "data.bin");
    const content = Buffer.from("monolith arbitrary bytes");
    writeFileSync(path, content);
    const expected = fingerprintBytes(content);
    const { code, stdout } = await runCli(["hash", path]);
    expect(code).toBe(0);
    const fields = parseHumanOutput(stdout);
    expect(fields.fingerprint).toBe(expected);
    expect(fields.kind).toBe("other");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hash command without path exits 2", async () => {
  const { code, stderr } = await runCli(["hash"]);
  expect(code).toBe(2);
  expect(stderr).toContain("missing file path");
});

test("hash command on missing file exits 1", async () => {
  const { code, stderr } = await runCli(["hash", "/definitely/not/here.xyz"]);
  expect(code).toBe(1);
  expect(stderr).toContain("File not found");
});

test("no args prints help and exits 0", async () => {
  const { code, stdout } = await runCli([]);
  expect(code).toBe(0);
  expect(stdout).toContain("Usage:");
});

test("--help prints help", async () => {
  const { code, stdout } = await runCli(["--help"]);
  expect(code).toBe(0);
  expect(stdout).toContain("monolith hash");
});

test("unknown command exits 2", async () => {
  const { code, stderr } = await runCli(["bogus"]);
  expect(code).toBe(2);
  expect(stderr).toContain("Unknown command");
});

test("hash - reads from stdin (other kind)", async () => {
  const content = new TextEncoder().encode("monolith stdin bytes");
  const expected = fingerprintBytes(content);
  const { code, stdout } = await runCli(["hash", "-"], content);
  expect(code).toBe(0);
  const fields = parseHumanOutput(stdout);
  expect(fields.fingerprint).toBe(expected);
  expect(fields.kind).toBe("other");
});

test("hash PNG file emits image kind + phash", async () => {
  const path = join(FIXTURES, "red64.png");
  const content = readFileSync(path);
  const expectedFp = fingerprintBytes(content);
  const { code, stdout } = await runCli(["hash", path]);
  expect(code).toBe(0);
  const fields = parseHumanOutput(stdout);
  expect(fields.fingerprint).toBe(expectedFp);
  expect(fields.kind).toBe("image");
  expect(fields.mime).toBe("image/png");
  expect(fields.phash).toMatch(/^[0-9a-f]{16}$/);
});

test("hash WAV file emits audio kind + chromaprint + meta", async () => {
  const path = join(FIXTURES, "sine440.wav");
  const content = readFileSync(path);
  const expectedFp = fingerprintBytes(content);
  const { code, stdout } = await runCli(["hash", path]);
  expect(code).toBe(0);
  const fields = parseHumanOutput(stdout);
  expect(fields.fingerprint).toBe(expectedFp);
  expect(fields.kind).toBe("audio");
  expect(fields.mime).toBe("audio/wav");
  expect(fields.chromaprint.length).toBeGreaterThan(0);
  expect(fields.sampleRate).toBe("44100");
  expect(fields.channels).toBe("1");
});

test("hash --json emits structured JSON for image", async () => {
  const path = join(FIXTURES, "red64.png");
  const { code, stdout } = await runCli(["hash", path, "--json"]);
  expect(code).toBe(0);
  const data = JSON.parse(stdout);
  expect(data.fingerprint).toMatch(/^0x[0-9a-f]{64}$/);
  expect(data.kind).toBe("image");
  expect(data.mime).toBe("image/png");
  expect(data.ext).toBe("png");
  expect(data.phash).toMatch(/^[0-9a-f]{16}$/);
});

test("hash --json emits structured JSON for audio", async () => {
  const path = join(FIXTURES, "sine440.wav");
  const { code, stdout } = await runCli(["hash", path, "--json"]);
  expect(code).toBe(0);
  const data = JSON.parse(stdout);
  expect(data.kind).toBe("audio");
  expect(data.chromaprint).toBeTruthy();
  expect(data.sampleRate).toBe(44100);
  expect(data.channels).toBe(1);
  expect(data.durationSec).toBeCloseTo(2, 1);
});
