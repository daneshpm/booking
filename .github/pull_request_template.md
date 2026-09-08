## What this changes

<!-- One or two sentences. What behaviour is different after this merges? -->

## Why

<!-- The problem being solved, or a link to the issue. -->

## How to verify

<!-- The steps a reviewer runs to see it working. Include the URL or command. -->

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npx vitest run` passes
- [ ] Schema changes come with a migration (`npm run db:migrate`)
- [ ] Any new server action verifies workspace access with `requireWorkspace`
- [ ] No sample or placeholder data is written to the database
- [ ] New environment variables are documented in `.env.example`

## Risk

<!-- What could break, and how to roll it back. Write "low" for a contained change. -->
