import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { detectKind, phashImage, chromaprintAudio } from "../src/perceptual";

const FIXTURES = join(import.meta.dir, "fixtures");

test("detectKind classifies PNG as image", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "red64.png")));
  const info = await detectKind(bytes);
  expect(info.kind).toBe("image");
  expect(info.mime).toBe("image/png");
  expect(info.ext).toBe("png");
});

test("detectKind classifies WAV as audio", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "sine440.wav")));
  const info = await detectKind(bytes);
  expect(info.kind).toBe("audio");
  expect(info.mime).toBe("audio/wav");
});

test("detectKind returns 'other' for unknown bytes", async () => {
  const info = await detectKind(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  expect(info.kind).toBe("other");
});

test("phashImage produces 16-char hex hash for PNG", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "red64.png")));
  const hash = await phashImage(bytes);
  expect(hash).toMatch(/^[0-9a-f]{16}$/);
});

test("phashImage is deterministic per runtime", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "red64.png")));
  const a = await phashImage(bytes);
  const b = await phashImage(bytes);
  expect(a).toBe(b);
});

test("chromaprintAudio produces base64 fingerprint for WAV", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "sine440.wav")));
  const r = await chromaprintAudio(bytes);
  expect(r.fingerprint).toMatch(/^[A-Za-z0-9+/=_-]+$/);
  expect(r.fingerprint.length).toBeGreaterThan(0);
  expect(r.sampleRate).toBe(44100);
  expect(r.channels).toBe(1);
  expect(r.durationSec).toBeCloseTo(2, 1);
});

test("chromaprintAudio is deterministic", async () => {
  const bytes = new Uint8Array(await readFile(join(FIXTURES, "sine440.wav")));
  const a = await chromaprintAudio(bytes);
  const b = await chromaprintAudio(bytes);
  expect(a.fingerprint).toBe(b.fingerprint);
});
