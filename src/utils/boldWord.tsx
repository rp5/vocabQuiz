export function boldWord(sentence: string, word: string) {
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = sentence.split(regex);
  // With a capturing group, odd-indexed parts are matches
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ fontWeight: 800, color: 'var(--color-text)' }}>{part}</strong> : part
  );
}
