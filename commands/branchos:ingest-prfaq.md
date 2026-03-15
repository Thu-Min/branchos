---
description: "Ingest PR-FAQ document for project planning [--force] [--json]"
allowed-tools: Bash(npx branchos ingest-prfaq *)
---

# Ingest PR-FAQ

Ingest the PR-FAQ document from `./PR-FAQ.md` into BranchOS for project planning.

```bash
npx branchos ingest-prfaq $ARGUMENTS
```

This command reads PR-FAQ.md from your repository root, validates its structure,
and stores it in `.branchos/shared/` with change detection metadata.

Options:
- `--force`: Skip confirmation prompt if document doesn't look like a standard PR-FAQ
- `--json`: Output in machine-readable JSON format

$ARGUMENTS