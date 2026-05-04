import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintBytes } from "../src/fingerprint";

const ENTRY = join(import.meta.dir, "..", "bin", "monolith.ts");

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({
    cmd: ["bun", ENTRY, ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

test("hash command prints fingerprint of file", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "monolith-cli-cli-"));
  try {
    const path = join(tmp, "data.bin");
    const content = Buffer.from("monolith image bytes");
    writeFileSync(path, content);
    const expected = fingerprintBytes(content);
    const { code, stdout } = await runCli(["hash", path]);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(expected);
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
