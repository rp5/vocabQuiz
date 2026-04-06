import { type ReactNode } from 'react';

/** Render inline markdown: **bold** and *italic* */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold** and *italic* (bold first so ** isn't consumed by *)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

/** Split text into paragraphs on double-newline and render inline markdown */
export function renderPassage(text: string): ReactNode[] {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => (
    <p key={i} style={{ marginBottom: i < paragraphs.length - 1 ? '1em' : 0 }}>
      {renderInline(para)}
    </p>
  ));
}
