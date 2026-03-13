# Changelog

All notable changes to BranchOS are documented in this file.

## [2.2.2] - 2026-03-13

### Added
- **GWT Acceptance Criteria** — Features now support structured Given/When/Then acceptance criteria. The GWT parser extracts and formats these blocks, and they render in context packets and PR bodies.
- **Assignee Capture** — Workstreams automatically capture the GitHub username of the creating developer via `gh api /user`. Stored in workstream metadata (schema v3).
- **Issue-Linked Workstreams** — Create workstreams directly from GitHub Issues with `--issue #N`. BranchOS fetches the issue, matches it to a feature by issue number or title similarity, and pre-populates the workstream.
- **Create-PR Command** — New `branchos create-pr` CLI command and `/branchos:create-pr` slash command. Assembles PR title, body (with feature description and GWT-formatted acceptance criteria), assigns the developer, auto-pushes the branch, and creates the PR via `gh`.
- **Assignee Propagation** — `sync-issues` now propagates workstream assignees to their linked GitHub Issues automatically.
- **Schema Migration v2→v3** — Adds `assignee` and `issueNumber` fields to workstream metadata. Migrations run automatically when reading state files.

## [2.1.2] - 2026-03-12

### Added
- **Research Sessions** — Interactive research workflow with `/branchos:research` slash command for saving structured findings to workstreams.
- **Project Discussion** — `/branchos:discuss-project` for creating PR-FAQ documents through guided interactive discussion.
- **Roadmap Refresh** — `/branchos:refresh-roadmap` to update roadmap and features when the PR-FAQ changes.

## [2.0.0] - 2026-03-10

### Added
- **Project-Level Planning Layer** — PR-FAQ ingestion, roadmap generation, feature registry, and GitHub Issues sync.
- **Feature-Aware Workstreams** — `--feature <id>` and `--issue #N` flags for linking workstreams to features.
- **Slash Command Migration** — Commands bundled into CLI at build time and installed to both `~/.claude/commands/` and `~/.claude/skills/`.

## [1.2.0] - 2026-03-09

### Added
- Initial public release with workstream management, phase workflow (Discuss → Plan → Execute), codebase mapping, drift detection, and conflict detection.
