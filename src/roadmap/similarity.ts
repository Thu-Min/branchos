import type { Feature } from './types.js';

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows instead of full matrix for space efficiency
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

export function titleSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return 1 - distance / maxLen;
}

export interface MatchResult {
  matched: Array<{
    oldFeature: Feature;
    newTitle: string;
    similarity: number;
  }>;
  dropped: Feature[];
  added: string[];
}

export function matchFeaturesByTitle(
  oldFeatures: Feature[],
  newTitles: string[],
  threshold = 0.6,
): MatchResult {
  // Build similarity matrix
  const scores: Array<{
    oldIdx: number;
    newIdx: number;
    similarity: number;
  }> = [];

  for (let i = 0; i < oldFeatures.length; i++) {
    for (let j = 0; j < newTitles.length; j++) {
      const sim = titleSimilarity(oldFeatures[i].title, newTitles[j]);
      if (sim >= threshold) {
        scores.push({ oldIdx: i, newIdx: j, similarity: sim });
      }
    }
  }

  // Sort descending by similarity for greedy matching
  scores.sort((a, b) => b.similarity - a.similarity);

  const matchedOld = new Set<number>();
  const matchedNew = new Set<number>();
  const matched: MatchResult['matched'] = [];

  for (const score of scores) {
    if (matchedOld.has(score.oldIdx) || matchedNew.has(score.newIdx)) {
      continue;
    }
    matchedOld.add(score.oldIdx);
    matchedNew.add(score.newIdx);
    matched.push({
      oldFeature: oldFeatures[score.oldIdx],
      newTitle: newTitles[score.newIdx],
      similarity: score.similarity,
    });
  }

  const dropped = oldFeatures.filter((_, i) => !matchedOld.has(i));
  const added = newTitles.filter((_, i) => !matchedNew.has(i));

  return { matched, dropped, added };
}
