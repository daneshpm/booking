# Project Rules & Token Optimization Protocols

## 1. Token Minimization Guidelines
- **Slice-Based File Viewing**: Always use `view_file` with targeted `StartLine` and `EndLine` ranges (max 50–100 lines). Never read entire multi-hundred-line files when locating a function.
- **Surgical Code Edits**: Use `replace_file_content` targeting small, exact blocks (5–25 lines) instead of full-file overwrites.
- **Targeted Ripgrep Searches**: Use `grep_search` with specific query patterns and `MatchPerLine: true` to locate lines before reading files.
- **Concise Outputs**: Keep chat responses and tool summaries compact, structured, and focused. Avoid re-summarizing artifact contents in chat messages.
- **Terminal Output Control**: Run commands with compact reporters (e.g., `vitest --reporter=compact`) to keep output token footprints low.

## 2. Dev Server & Build Concurrency Rule
- **Safe Next.js Lifecycle**: Never run `next build` while `next dev` is running concurrently in the background. Always terminate background dev servers (`manage_task kill`) and clean cache (`rm -rf apps/web/.next`) before executing builds to prevent lock collisions and retry cycles.

## 3. Core Architecture Standards
- **Multi-Tenant Availability**: All availability, shift, and buffer calculations must be timezone-aware (`date-fns-tz`) and stored in UTC in PostgreSQL.
- **Double-Booking Prevention**: Always execute collision checks in PostgreSQL before booking creation or rescheduling.
