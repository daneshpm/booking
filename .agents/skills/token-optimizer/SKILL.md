---
name: token-optimizer
description: >-
  Provides actionable workflows, rules, and best practices for minimizing token usage and context consumption across AI agent interactions, file inspections, code editing, and command executions. Activate this skill when the user requests to optimize token usage, minimize token consumption, or increase context window efficiency.
---

# Token Optimization Skill

This skill enforces high-efficiency token conservation techniques to maximize reasoning bandwidth, avoid context bloat, and reduce costs.

---

## 1. Targeted File Operations (Slice-Based Reading)

- **Never read entire large files** when only a portion is needed.
- Always use `view_file` with explicit `StartLine` and `EndLine` parameters (e.g., lines 1–60 or 120–180) to inspect only relevant functions or components.
- Use `grep_search` with `MatchPerLine: true` first to locate exact line numbers before viewing files.
- Avoid repeated file views of the same content; store critical identifiers in thought context.

---

## 2. Minimalist Code Editing (`replace_file_content`)

- **Never rewrite entire files** using `write_to_file` when making modifications to existing files.
- Use `replace_file_content` targeting the smallest possible unambiguous contiguous chunk (typically 5–25 lines).
- Avoid expanding diff contexts with unnecessary unchanged lines.
- For multiple non-contiguous edits, use `multi_replace_file_content` in a single tool call rather than chaining multiple separate tool calls.

---

## 3. Terminal & Command Token Conservation

- Limit command verbosity:
  - Add `--reporter=compact` or `--bail 1` to test runners (`vitest`, `jest`).
  - Use `head -n 30` or `grep` when inspecting logs instead of printing thousands of lines into the context.
  - Ensure background servers use `IsDaemon: true` and appropriate `WaitMsBeforeAsync` to prevent streaming megabytes of repetitive compilation outputs.
- Kill background servers before running builds (`rm -rf apps/web/.next`) to eliminate file-lock build failures that force expensive re-execution loops.

---

## 4. Response & Artifact Optimization

- **No Redundant Re-Summarization**: When creating or editing artifacts (e.g., `implementation_plan.md`, `walkthrough.md`), do not re-summarize their contents in chat messages. Direct the user to the artifact path and summarize only open decisions or next steps.
- Keep agent conversational turns concise, structured, and bullet-oriented.
- Use GitHub markdown links (`[File](file:///path)`) instead of copying blocks of unchanged source code into messages.

---

## 5. Progressive Disclosure Pattern

- Defer large reference documentation into subdirectories (e.g., `references/` or scratch files) rather than dumping all documentation into the primary instruction prompt.
- Only load specialized domain models when specifically requested by the task.
