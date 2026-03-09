export interface SectionDefinition {
  id: string;
  patterns: string[];
}

export const EXPECTED_SECTIONS: SectionDefinition[] = [
  { id: 'headline', patterns: ['headline', 'title', 'press release'] },
  { id: 'subheadline', patterns: ['subheadline', 'subtitle', 'sub-headline'] },
  { id: 'problem', patterns: ['problem', 'customer problem'] },
  { id: 'solution', patterns: ['solution'] },
  { id: 'quote', patterns: ['quote', 'leadership quote', 'customer quote'] },
  { id: 'cta', patterns: ['call to action', 'cta', 'getting started', 'how to get started'] },
  { id: 'customer-faq', patterns: ['customer faq', 'external faq', 'customer questions'] },
  { id: 'internal-faq', patterns: ['internal faq', 'stakeholder faq', 'internal questions'] },
];

export interface PrfaqMeta {
  contentHash: string;
  ingestedAt: string;
  version: number;
  sectionsFound: string[];
  sectionsMissing: string[];
  sourceSize: number;
}

export interface SectionDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface IngestPrfaqOptions {
  json: boolean;
  force: boolean;
  cwd?: string;
}

export interface IngestPrfaqResult {
  success: boolean;
  action: 'ingested' | 'updated' | 'unchanged';
  sectionsFound: string[];
  sectionsMissing: string[];
  warnings: string[];
  error?: string;
  diff?: SectionDiff;
}
