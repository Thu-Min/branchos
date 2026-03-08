import { readFile, writeFile } from 'fs/promises';

export interface DecisionEntry {
  title: string;
  phase: number;
  context: string;
  choice: string;
  alternatives: string[];
}

export function formatDecisionEntry(entry: DecisionEntry): string {
  const lines = [
    `### ${entry.title}`,
    '',
    `**Phase:** ${entry.phase}`,
    `**Context:** ${entry.context}`,
    `**Decision:** ${entry.choice}`,
    '',
    '**Alternatives considered:**',
    ...entry.alternatives.map((alt) => `- ${alt}`),
    '',
    '---',
    '',
  ];
  return lines.join('\n');
}

export async function readDecisions(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export async function appendDecision(
  filePath: string,
  entry: DecisionEntry,
): Promise<void> {
  let existing = await readDecisions(filePath);
  if (existing === '') {
    existing = '# Decisions\n\n';
  }
  const formatted = formatDecisionEntry(entry);
  await writeFile(filePath, existing + formatted);
}
