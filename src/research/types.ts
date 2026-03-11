export const RESEARCH_STATUSES = ['draft', 'complete'] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export interface ResearchFrontmatter {
  id: string;
  topic: string;
  status: ResearchStatus;
  date: string;
  features: string[];
}

export interface ResearchArtifact extends ResearchFrontmatter {
  body: string;
  filename: string;
}

export interface ResearchIndexEntry {
  id: string;
  topic: string;
  status: ResearchStatus;
  date: string;
  features: string[];
  filename: string;
}
