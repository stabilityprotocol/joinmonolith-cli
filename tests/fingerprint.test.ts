import { test, expect, beforeAll, afterAll } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { fingerprintBytes, fingerprintFile, fingerprintStream } from "../src/fingerprint";

let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "monolith-cli-"));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

test("fingerprintBytes matches API algorithm (0x + sha256 hex)", () => {
  const input = Buffer.from("hello world", "utf8");
  const expectedHex = createHash("sha256").update(input).digest("hex");
  expect(fingerprintBytes(input)).toBe(`0x${expectedHex}`);
});

test("fingerprintBytes known vector for 'hello world'", () => {
  expect(fingerprintBytes(Buffer.from("hello world", "utf8"))).toBe(
    "0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
  );
});

test("fingerprintBytes empty input", () => {
  expect(fingerprintBytes(new Uint8Array(0))).toBe(
    "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

test("fingerprintFile reads file and matches buffer hash", async () => {
  const path = join(tmp, "img.bin");
  const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
  writeFileSync(path, content);
  const expected = fingerprintBytes(content);
  expect(await fingerprintFile(path)).toBe(expected);
});

test("fingerprintFile throws for missing file", async () => {
  await expect(fingerprintFile(join(tmp, "nope.bin"))).rejects.toThrow(/File not found/);
});

test("fingerprint output is 0x + 64 lowercase hex chars", () => {
  const fp = fingerprintBytes(Buffer.from("anything"));
  expect(fp).toMatch(/^0x[0-9a-f]{64}$/);
});

test("fingerprintStream matches fingerprintBytes for same content", async () => {
  const content = Buffer.from("streamed monolith bytes");
  const expected = fingerprintBytes(content);
  const stream = Readable.from([content.subarray(0, 5), content.subarray(5)]);
  expect(await fingerprintStream(stream)).toBe(expected);
});

test("fingerprintStream empty stream returns empty-input hash", async () => {
  const stream = Readable.from([]);
  expect(await fingerprintStream(stream)).toBe(
    "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});
