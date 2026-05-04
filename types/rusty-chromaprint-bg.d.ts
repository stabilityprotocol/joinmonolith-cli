declare module "rusty-chromaprint-wasm/dist/rusty_chromaprint_wasm_bg.js" {
  export class FingerprintFromSamplesResult {
    free(): void;
    compressed: string;
    raw: Uint32Array;
  }
  export function fingerprintFromSamples(
    sampleRate: number,
    channels: number,
    samples: Int16Array
  ): FingerprintFromSamplesResult;
  export function __wbg_set_wasm(val: WebAssembly.Exports): void;
}
