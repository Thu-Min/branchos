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

export function parseAcceptanceCriteria(_body: string): ParsedAcceptanceCriteria {
  return { gwtBlocks: [], freeformItems: [] };
}

export function formatGwtChecklist(_parsed: ParsedAcceptanceCriteria): string {
  return '';
}
