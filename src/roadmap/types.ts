export const FEATURE_STATUSES = [
  'unassigned',
  'assigned',
  'in-progress',
  'complete',
  'dropped',
] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export interface FeatureFrontmatter {
  id: string;
  title: string;
  status: FeatureStatus;
  milestone: string;
  branch: string;
  issue: number | null;
  workstream: string | null;
}

export interface Feature extends FeatureFrontmatter {
  body: string;
  filename: string;
  dependsOn?: string[];
}

export interface Milestone {
  id: string;
  name: string;
  features: Feature[];
}

export interface RoadmapData {
  projectName: string;
  vision: string;
  milestones: Milestone[];
}
