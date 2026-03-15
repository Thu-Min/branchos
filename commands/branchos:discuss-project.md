---
description: "Create a PR-FAQ document through guided interactive discussion"
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *), WebSearch, WebFetch, AskUserQuestion
---

# Interactive PR-FAQ Creation

Guide the developer through creating a structured PR-FAQ (Press Release / Frequently Asked Questions) document via natural conversation.

## Step 1: Parse arguments

Parse `$ARGUMENTS`. No flags are needed for this command. Treat all text as optional project context that can inform the discussion.

## Step 2: Frame the discussion (Opening Bookend)

1. Load codebase context: read `.branchos/shared/codebase/ARCHITECTURE.md` if it exists for architecture awareness.
2. Check if `./PR-FAQ.md` already exists. If so, inform the user and offer to either create a fresh PR-FAQ or refine the existing one.
3. Briefly explain the PR-FAQ format: an Amazon-style document combining a press release with FAQs. It captures the product vision from the customer's perspective before building begins.
4. Outline the 8 sections that will be covered:
   - **Headline** -- the product announcement in one sentence
   - **Subheadline** -- who the customer is and what benefit they get
   - **Problem** -- the customer pain point being addressed
   - **Solution** -- how the product solves the problem
   - **Quote** -- a leadership endorsement of the vision
   - **Call to Action** -- how someone gets started
   - **Customer FAQ** -- questions potential users would ask
   - **Internal FAQ** -- questions stakeholders or team members would ask

## Step 3: Interactive PR-FAQ creation

Walk through the sections using AskUserQuestion. Use natural conversation flow, NOT rigid form-filling. Group related sections and let one answer inform the next.

### Conversation flow

**Start with the vision:**
Ask "What are you building? Who is it for?" Use the response to draft the Headline and Subheadline sections.

**Explore the problem:**
Ask "What problem does this solve? Why does it matter now?" Use the response to draft the Problem section.

**Define the solution:**
Ask "How does your project solve this? What makes your approach unique?" Use the response to draft the Solution section.

**Capture the voice:**
Ask "If a leader were endorsing this project, what would they emphasize?" Use the response to draft the Quote section.

**Call to action:**
Ask "How would someone get started with this today?" Use the response to draft the Call to Action section.

**Customer FAQ:**
Ask "What would potential users ask about this? Think about concerns, limitations, and comparisons." Use the response to draft the Customer FAQ section with Q&A pairs.

**Internal FAQ:**
Ask "What would stakeholders or team members ask? Think about cost, timeline, risks, and technical feasibility." Use the response to draft the Internal FAQ section with Q&A pairs.

### Adaptive questioning guidelines

Adapt your follow-up questions based on the user's responses. If the user provides rich detail in one area, do not ask redundant questions -- move forward. If an area needs more depth, probe further with targeted follow-ups.

Do not follow a rigid script. Use the conversation context to determine the most useful next question. If the user provides unexpected input, incorporate it naturally.

Always offer an "Other" option or invitation for the user to redirect the conversation in any direction they choose.

## Step 4: Save PR-FAQ (Closing Bookend)

Before saving, review which of the 8 sections have been covered:

1. Headline
2. Subheadline
3. Problem
4. Solution
5. Quote
6. Call to Action
7. Customer FAQ
8. Internal FAQ

If any sections are missing, warn the user and offer to fill the gaps through additional questions.

### Compile and write

Compile all sections into a well-formatted PR-FAQ markdown document using the canonical section headings:

```markdown
# [Project Name] PR-FAQ

## Headline
[One-sentence product announcement]

## Subheadline
[Customer and benefit statement]

## Problem
[Customer pain point]

## Solution
[How the product solves it]

## Quote
[Leadership endorsement]

## Call to Action
[How to get started]

## Customer FAQ

**Q: [Question]**
A: [Answer]

## Internal FAQ

**Q: [Question]**
A: [Answer]
```

Write the compiled document to `./PR-FAQ.md` using the Write tool.

Then run the ingestion pipeline to validate, store, hash, and commit:

```bash
npx branchos ingest-prfaq --force
```

Report success with a summary of sections covered and the stored file path.

$ARGUMENTS
