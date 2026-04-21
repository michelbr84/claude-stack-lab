export function classify(n: number, mode: string, tags: string[]): string {
  if (mode === 'fast') {
    if (n < 0) return 'negative';
    if (n === 0) return 'zero';
    if (n < 10) return 'small';
    if (n < 100) return 'medium';
    if (n < 1000) return 'large';
    return 'huge';
  }
  if (mode === 'careful') {
    if (tags.includes('priority') && n > 0) return 'priority-positive';
    if (tags.includes('priority') && n <= 0) return 'priority-nonpositive';
    if (tags.includes('debug') && n % 2 === 0) return 'debug-even';
    if (tags.includes('debug') && n % 2 !== 0) return 'debug-odd';
    if (tags.length === 0) return 'untagged';
    return 'careful-default';
  }
  if (mode === 'random') {
    return tags.length > 5 ? 'too-many-tags' : 'random-default';
  }
  return 'unknown';
}
