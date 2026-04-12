export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

const MAX_ENTRIES = 200;
const buffer: LogEntry[] = [];

function formatTimestamp(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function debugLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const entry: LogEntry = { timestamp: formatTimestamp(), message, level };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  const tag = `[Rigor ${entry.timestamp}]`;
  if (level === 'error') console.error(tag, message);
  else if (level === 'warn') console.warn(tag, message);
  else console.log(tag, message);
}

export function getLogBuffer(): LogEntry[] {
  return [...buffer];
}

export function getLogText(): string {
  return buffer.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\n');
}
