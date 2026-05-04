import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import decode from "audio-decode";
import { fromRgba } from "@stabilityprotocol.com/phash";

export type FileKind = "image" | "audio" | "other";

export interface KindInfo {
  kind: FileKind;
  mime?: string;
  ext?: string;
}

export async function detectKind(bytes: Uint8Array): Promise<KindInfo> {
  const ft = await fileTypeFromBuffer(bytes);
  if (!ft) return { kind: "other" };
  if (ft.mime.startsWith("image/")) return { kind: "image", mime: ft.mime, ext: ft.ext };
  if (ft.mime.startsWith("audio/") || ft.mime === "video/webm") {
    return { kind: "audio", mime: ft.mime, ext: ft.ext };
  }
  return { kind: "other", mime: ft.mime, ext: ft.ext };
}

export async function phashImage(bytes: Uint8Array): Promise<string> {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return fromRgba(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height);
}

let chromaprintReady: Promise<typeof import("rusty-chromaprint-wasm/dist/rusty_chromaprint_wasm_bg.js")> | null = null;

async function loadChromaprint() {
  if (!chromaprintReady) {
    chromaprintReady = (async () => {
      const bg = await import("rusty-chromaprint-wasm/dist/rusty_chromaprint_wasm_bg.js");
      const require = createRequire(import.meta.url);
      const wasmPath = require.resolve("rusty-chromaprint-wasm/dist/rusty_chromaprint_wasm_bg.wasm");
      const wasmBytes = await readFile(wasmPath);
      // wasm-bindgen imports are untyped (callbacks into bg.js); cast through any.
      const imports = { "./rusty_chromaprint_wasm_bg.js": bg } as unknown as Parameters<typeof WebAssembly.instantiate>[1];
      const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
      bg.__wbg_set_wasm(instance.exports);
      const exports = instance.exports as { __wbindgen_start?: () => void };
      exports.__wbindgen_start?.();
      return bg;
    })();
  }
  return chromaprintReady;
}

export async function chromaprintAudio(bytes: Uint8Array): Promise<{ fingerprint: string; sampleRate: number; channels: number; durationSec: number }> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const audio = await decode(buf);
  const channels = audio.channelData.length;
  if (channels === 0) throw new Error("Audio has no channels");
  const firstChannel = audio.channelData[0]!;
  const frames = firstChannel.length;
  const sampleRate = audio.sampleRate;
  const interleaved = new Int16Array(frames * channels);
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, audio.channelData[c]![f]!));
      interleaved[f * channels + c] = sample < 0 ? sample * 32768 : sample * 32767;
    }
  }
  const bg = await loadChromaprint();
  const result = bg.fingerprintFromSamples(sampleRate, channels, interleaved);
  const fingerprint = result.compressed;
  result.free();
  return {
    fingerprint,
    sampleRate,
    channels,
    durationSec: frames / sampleRate,
  };
}
