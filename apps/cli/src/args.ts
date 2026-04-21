export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { command: 'help', positional: [], flags: {} };
  if (argv.length === 0) return out;

  out.command = argv[0]!;
  for (let i = 1; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok.startsWith('--')) {
      const eq = tok.indexOf('=');
      if (eq !== -1) {
        out.flags[tok.slice(2, eq)] = tok.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          out.flags[tok.slice(2)] = next;
          i++;
        } else {
          out.flags[tok.slice(2)] = true;
        }
      }
    } else {
      out.positional.push(tok);
    }
  }
  return out;
}
