import { describe, it, expect } from 'vitest';
import { generateRoadmapMarkdown } from '../../src/roadmap/roadmap-file.js';
import type { Feature, RoadmapData } from '../../src/roadmap/types.js';

const makeFeature = (overrides?: Partial<Feature>): Feature => ({
  id: 'F-001',
  title: 'User Auth',
  status: 'unassigned',
  milestone: 'M1',
  branch: 'feature/user-auth',
  issue: null,
  body: '## Acceptance Criteria\n\n- [ ] User can log in',
  filename: 'F-001-user-auth.md',
  ...overrides,
});

describe('generateRoadmapMarkdown', () => {
  const data: RoadmapData = {
    projectName: 'TestProject',
    vision: 'Build something great',
    milestones: [
      {
        id: 'M1',
        name: 'Foundation',
        features: [
          makeFeature({ id: 'F-001', title: 'User Auth' }),
          makeFeature({
            id: 'F-002',
            title: 'Dashboard',
            dependsOn: ['F-001'],
          }),
        ],
      },
      {
        id: 'M2',
        name: 'Growth',
        features: [
          makeFeature({ id: 'F-003', title: 'Analytics', status: 'complete' }),
        ],
      },
    ],
  };

  it('includes project name header', () => {
    const md = generateRoadmapMarkdown(data);
    expect(md).toContain('# Roadmap: TestProject');
  });

  it('includes vision as blockquote', () => {
    const md = generateRoadmapMarkdown(data);
    expect(md).toContain('> Build something great');
  });

  it('includes milestone and feature counts', () => {
    const md = generateRoadmapMarkdown(data);
    expect(md).toContain('**Milestones:** 2');
    expect(md).toContain('**Features:** 3');
  });

  it('includes milestone sections with progress', () => {
    const md = generateRoadmapMarkdown(data);
    expect(md).toContain('## M1: Foundation (0/2 features complete)');
    expect(md).toContain('## M2: Growth (1/1 features complete)');
  });

  it('includes feature tables with columns', () => {
    const md = generateRoadmapMarkdown(data);
    expect(md).toContain('| # | Feature | Status | Depends On |');
  });

  it('shows dependency feature IDs or -- for none', () => {
    const md = generateRoadmapMarkdown(data);
    // F-001 has no dependencies
    expect(md).toMatch(/F-001\s*\|\s*User Auth\s*\|\s*unassigned\s*\|\s*--/);
    // F-002 depends on F-001
    expect(md).toMatch(/F-002\s*\|\s*Dashboard\s*\|\s*unassigned\s*\|\s*F-001/);
  });
});
