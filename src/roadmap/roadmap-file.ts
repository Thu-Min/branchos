import type { RoadmapData } from './types.js';

/**
 * Generate ROADMAP.md content from structured roadmap data.
 */
export function generateRoadmapMarkdown(data: RoadmapData): string {
  const totalFeatures = data.milestones.reduce(
    (sum, m) => sum + m.features.length,
    0,
  );

  const lines: string[] = [
    `# Roadmap: ${data.projectName}`,
    '',
    `> ${data.vision}`,
    '',
    `**Milestones:** ${data.milestones.length} | **Features:** ${totalFeatures}`,
    '',
    '---',
  ];

  for (const milestone of data.milestones) {
    const completeCount = milestone.features.filter(
      (f) => f.status === 'complete',
    ).length;
    const total = milestone.features.length;

    lines.push('');
    lines.push(
      `## ${milestone.id}: ${milestone.name} (${completeCount}/${total} features complete)`,
    );
    lines.push('');
    lines.push('| # | Feature | Status | Depends On |');
    lines.push('|---|---------|--------|------------|');

    for (const feature of milestone.features) {
      const deps =
        feature.dependsOn && feature.dependsOn.length > 0
          ? feature.dependsOn.join(', ')
          : '--';
      lines.push(
        `| ${feature.id} | ${feature.title} | ${feature.status} | ${deps} |`,
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}
