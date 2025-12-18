---
name: nextjs-app
description: Next.js App Router development patterns for AHS Portion Completion project
---

# Next.js App Router Skill

This project uses Next.js with the App Router. Follow these conventions:

## Project Structure
- `app/` - App Router pages and layouts
- `components/` - Reusable React components
- `lib/` - Utility functions and shared logic
- `types/` - TypeScript type definitions
- `supabase/` - Supabase configuration and migrations

## Conventions
- Use Server Components by default
- Add "use client" directive only when needed (hooks, event handlers, browser APIs)
- Use TypeScript for all files
- Follow the existing component patterns in `components/`

## Database
- Supabase is used for the database
- Check `supabase/` folder for schema and migrations
