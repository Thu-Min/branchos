import mapCodebase from '../../commands/branchos:map-codebase.md';
import context from '../../commands/branchos:context.md';
import discussPhase from '../../commands/branchos:discuss-phase.md';
import discussProject from '../../commands/branchos:discuss-project.md';
import planPhase from '../../commands/branchos:plan-phase.md';
import executePhase from '../../commands/branchos:execute-phase.md';
import ingestPrfaq from '../../commands/branchos:ingest-prfaq.md';
import planRoadmap from '../../commands/branchos:plan-roadmap.md';
import features from '../../commands/branchos:features.md';
import syncIssues from '../../commands/branchos:sync-issues.md';
import refreshRoadmap from '../../commands/branchos:refresh-roadmap.md';
import createWorkstream from '../../commands/branchos:create-workstream.md';
import listWorkstreams from '../../commands/branchos:list-workstreams.md';
import status from '../../commands/branchos:status.md';
import archive from '../../commands/branchos:archive.md';
import research from '../../commands/branchos:research.md';
import createPr from '../../commands/branchos:create-pr.md';

export const COMMANDS: Record<string, string> = {
  'branchos:map-codebase.md': mapCodebase,
  'branchos:context.md': context,
  'branchos:discuss-phase.md': discussPhase,
  'branchos:discuss-project.md': discussProject,
  'branchos:plan-phase.md': planPhase,
  'branchos:execute-phase.md': executePhase,
  'branchos:ingest-prfaq.md': ingestPrfaq,
  'branchos:plan-roadmap.md': planRoadmap,
  'branchos:features.md': features,
  'branchos:sync-issues.md': syncIssues,
  'branchos:refresh-roadmap.md': refreshRoadmap,
  'branchos:create-workstream.md': createWorkstream,
  'branchos:list-workstreams.md': listWorkstreams,
  'branchos:status.md': status,
  'branchos:archive.md': archive,
  'branchos:research.md': research,
  'branchos:create-pr.md': createPr,
};
