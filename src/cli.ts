import { fingerprintFile } from "./fingerprint";

const HELP = `monolith - CLI for monolith API

Usage:
  monolith hash <path>    Compute SHA-256 fingerprint of a file (matches API)
  monolith --help         Show this help
`;

export async function run(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(HELP);
    return 0;
  }

  if (cmd === "hash") {
    const path = rest[0];
    if (!path) {
      process.stderr.write("Error: missing file path\nUsage: monolith hash <path>\n");
      return 2;
    }
    try {
      const fp = await fingerprintFile(path);
      process.stdout.write(`${fp}\n`);
      return 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: ${msg}\n`);
      return 1;
    }
  }

  process.stderr.write(`Unknown command: ${cmd}\n${HELP}`);
  return 2;
}
