---
description: Start an interactive research session or save findings
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *), WebSearch, WebFetch, AskUserQuestion
---

# Interactive Research Session

Conduct an interactive, conversational research session on a given topic.

## Step 1: Parse arguments

Parse `$ARGUMENTS` for flags and topic.

**If `--save` is present**, skip directly to the **Save Flow** section below. The text after `--save` is the research topic to compile.

Otherwise, treat the remaining text as the research topic and continue to Step 2.

## Step 2: Frame the research session (Opening Bookend)

1. Identify the research topic from `$ARGUMENTS`.
2. Load codebase context: read `.branchos/shared/codebase/ARCHITECTURE.md` if it exists for architecture awareness.
3. Read the existing research index to check for prior research on this topic:
   ```bash
   cat .branchos/shared/research/index.json 2>/dev/null || echo "[]"
   ```
4. If prior research exists on a related topic, mention it and offer to build on it.
5. Present the research question back to the user with your initial analysis and what you already know about the topic.

## Step 3: Interactive research loop

Use AskUserQuestion for each structured decision point. Present research direction options as numbered choices. For example:

"I've identified these research areas for [topic]:
1. [Area identified from codebase analysis]
2. [Area from domain knowledge]
3. [Area from architecture patterns]
4. Other (describe what you'd like to explore)"

**Always include an "Other" option** so the user can provide freeform follow-up or redirect the research in any direction they choose.

### Adaptive questioning guidelines

Adapt your follow-up questions based on the user's responses. If the user indicates interest in a specific area, drill deeper into that area with more targeted questions. If the user seems satisfied with an area, move to the next research direction.

Do not follow a rigid script. Use the conversation context to determine the most useful next question. If the user provides unexpected input, incorporate it into your research direction.

When gathering information:
- Use WebSearch and WebFetch for external research (libraries, best practices, comparisons)
- Use Read, Glob, and Grep to ground research in the actual codebase
- Synthesize findings from both external sources and codebase analysis

Continue the research conversation until the user indicates they have enough information, wants to save findings, or wants to end the session.

## Save Flow

When the user triggers `--save` or asks to save during a session:

1. Compile all findings from the conversation into a structured research artifact.
2. The artifact MUST include a `## Summary` section as the first H2 heading, containing 3-5 bullet points summarizing the key findings.
3. Follow the `## Summary` with a `## Findings` section containing detailed results organized by research area.
4. Ask the user to confirm or edit the summary before saving.
5. Ask the user which features this research relates to (if any) for the `features` array in the research metadata.

### Persistence using research storage API

To save the research artifact, use the Phase 11 research storage API (from `src/research/research-file.ts` and `src/research/research-index.ts`):

1. Read existing research index via readIndex from `.branchos/shared/research/` to get existing IDs.
2. Generate the next ID using nextResearchId with the existing IDs.
3. Generate the filename using researchFilename(id, topic).
4. Create the ResearchArtifact object with frontmatter fields (id, topic, status: 'complete', date, features).
5. Write the artifact using writeResearchFile to `.branchos/shared/research/`.
6. Git commit the new research file and updated index.json.

Report the saved file path and research ID to the user.

$ARGUMENTS
