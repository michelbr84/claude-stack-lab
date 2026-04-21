export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  child: (prefix: string) => Logger;
}

export interface LoggerOptions {
  prefix?: string;
  level?: LogLevel;
  sink?: (level: LogLevel, line: string) => void;
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(opts: LoggerOptions = {}): Logger {
  const prefix = opts.prefix ?? '';
  const minLevel = opts.level ?? 'info';
  const sink =
    opts.sink ??
    ((level: LogLevel, line: string): void => {
      const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
      stream.write(line + '\n');
    });

  const make = (lvl: LogLevel) => (msg: string): void => {
    if (ORDER[lvl] < ORDER[minLevel]) return;
    const tag = `[${lvl}]`;
    const head = prefix ? `${tag} ${prefix}` : tag;
    sink(lvl, `${head} ${msg}`);
  };

  return {
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    child: (childPrefix: string): Logger =>
      createLogger({
        prefix: prefix ? `${prefix}:${childPrefix}` : childPrefix,
        level: minLevel,
        sink
      })
  };
}
