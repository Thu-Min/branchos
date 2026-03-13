export interface GwtStep {
  keyword: 'Given' | 'When' | 'Then';
  text: string;
  wasAnd?: boolean;
}

export interface GwtBlock {
  id: string;
  steps: GwtStep[];
}

export interface FreeformCriterion {
  text: string;
}

export interface ParsedAcceptanceCriteria {
  gwtBlocks: GwtBlock[];
  freeformItems: FreeformCriterion[];
}

const GWT_KEYWORDS = ['Given', 'When', 'Then'] as const;
type GwtKeyword = (typeof GWT_KEYWORDS)[number];

interface RawStep {
  keyword: GwtKeyword;
  text: string;
  wasAnd: boolean;
  rawLine: string;
}

function isGwtKeyword(word: string): word is GwtKeyword {
  return GWT_KEYWORDS.includes(word as GwtKeyword);
}

function extractAcSection(body: string): string[] | null {
  const lines = body.split('\n');
  const acHeadingIndex = lines.findIndex(
    (line) => line.trimEnd() === '## Acceptance Criteria'
  );

  if (acHeadingIndex === -1) {
    return null;
  }

  const sectionLines: string[] = [];
  for (let i = acHeadingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the next ## heading (but not ### which is AC-N blocks)
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      break;
    }
    sectionLines.push(line);
  }

  return sectionLines;
}

interface RawBlock {
  id: string;
  lines: string[];
}

function splitIntoBlocks(
  sectionLines: string[]
): { blocks: RawBlock[]; looseLines: string[] } {
  const blocks: RawBlock[] = [];
  const looseLines: string[] = [];
  let currentBlock: RawBlock | null = null;

  for (const line of sectionLines) {
    const acMatch = line.match(/^### (AC-\d+)/);
    if (acMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = { id: acMatch[1], lines: [] };
      continue;
    }

    // Freeform checklist items always go to looseLines, even if inside a block scope
    if (line.match(/^- \[ \] /)) {
      looseLines.push(line);
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      looseLines.push(line);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return { blocks, looseLines };
}

function parseBlockSteps(lines: string[]): RawStep[] | null {
  const steps: RawStep[] = [];
  let lastKeyword: GwtKeyword | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    const firstWord = trimmed.split(/\s+/)[0];
    const rest = trimmed.slice(firstWord.length).trim();

    if (isGwtKeyword(firstWord)) {
      lastKeyword = firstWord;
      steps.push({ keyword: firstWord, text: rest, wasAnd: false, rawLine: trimmed });
    } else if (firstWord === 'And') {
      if (lastKeyword === null) {
        // And without preceding keyword - invalid block
        return null;
      }
      steps.push({ keyword: lastKeyword, text: rest, wasAnd: true, rawLine: trimmed });
    }
    // Non-keyword, non-And lines within a block are ignored
  }

  return steps;
}

function isCompleteGwtBlock(steps: RawStep[]): boolean {
  const keywords = new Set(steps.map((s) => s.keyword));
  return keywords.has('Given') && keywords.has('When') && keywords.has('Then');
}

function parseFreeformLines(lines: string[]): FreeformCriterion[] {
  const items: FreeformCriterion[] = [];
  for (const line of lines) {
    const match = line.match(/^- \[ \] (.+)$/);
    if (match) {
      items.push({ text: match[1] });
    }
  }
  return items;
}

export function parseAcceptanceCriteria(body: string): ParsedAcceptanceCriteria {
  const empty: ParsedAcceptanceCriteria = { gwtBlocks: [], freeformItems: [] };

  if (!body) return empty;

  const sectionLines = extractAcSection(body);
  if (!sectionLines) return empty;

  const { blocks, looseLines } = splitIntoBlocks(sectionLines);

  const gwtBlocks: GwtBlock[] = [];
  const freeformItems: FreeformCriterion[] = [];

  for (const block of blocks) {
    const steps = parseBlockSteps(block.lines);

    if (steps === null || !isCompleteGwtBlock(steps)) {
      // Demote to freeform: use raw lines from the block
      for (const line of block.lines) {
        const trimmed = line.trim();
        if (trimmed !== '') {
          freeformItems.push({ text: trimmed });
        }
      }
    } else {
      gwtBlocks.push({
        id: block.id,
        steps: steps.map((s) => ({
          keyword: s.keyword,
          text: s.text,
          wasAnd: s.wasAnd,
        })),
      });
    }
  }

  // Collect loose freeform checklist items
  freeformItems.push(...parseFreeformLines(looseLines));

  return { gwtBlocks, freeformItems };
}

export function formatGwtChecklist(parsed: ParsedAcceptanceCriteria): string {
  const lines: string[] = ['## Acceptance Criteria', ''];

  for (const block of parsed.gwtBlocks) {
    lines.push(`- [ ] **${block.id}**`);
    for (const step of block.steps) {
      if (step.wasAnd) {
        lines.push(`  - And ${step.text}`);
      } else {
        lines.push(`  - ${step.keyword} ${step.text}`);
      }
    }
  }

  for (const item of parsed.freeformItems) {
    lines.push(`- [ ] ${item.text}`);
  }

  return lines.join('\n');
}
