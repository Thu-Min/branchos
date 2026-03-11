/**
 * Extract the content between `## Summary` and the next H2 heading.
 *
 * Returns `null` if no `## Summary` heading exists.
 * Returns empty string if heading exists but has no content before next H2.
 * Returns all content after heading if it is the last section.
 */
export function extractSummary(body: string): string | null {
  const lines = body.split('\n');
  const summaryStart = lines.findIndex(l => /^## Summary\s*$/.test(l));
  if (summaryStart === -1) return null;

  const nextH2 = lines.findIndex(
    (l, i) => i > summaryStart && /^## /.test(l),
  );

  const end = nextH2 === -1 ? lines.length : nextH2;
  return lines.slice(summaryStart + 1, end).join('\n').trim();
}
