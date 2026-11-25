# Project memory

## Product intent & audience

- Mobile-first daily-puzzle web app shell with bilingual Marathi support
- Target audience: senior citizens
- Includes a "shop" feature area (interest stats, UPI payments planned)

## Brand personality & voice

- Bilingual: Marathi-primary with i18n support
- Senior-accessible: large touch targets, simple navigation, clear affordances

## Visual design & UX direction

- React + TypeScript + Tailwind CSS; lucide-react for icons; `@/` path alias for imports
- Senior-accessible UI: large text, high contrast, minimal clutter expected
- Placeholder routes present (shell stage; content/routes not yet fully wired)

## Decisions, constraints & rationale

- Supabase migrations live under project's database/migrations folder
- Newest confirmed migration: `shop-interest-stats` dated 22 Nov
- No external UI/theme/icon packages beyond lucide-react unless explicitly requested
- Build & Publish flow is expected after migrations are applied

## Open questions & assumptions

- Migration files requested by user may not always be synced into the workspace before the apply request (observed twice: shop migration, then UPI payments migration `20261125120000_shop_payments_upi.sql` which was not found)
- UPI shop-payments migration content unknown; needs to be provided/synced before it can be applied
- Assumption: app will eventually wire real puzzle content and shop/payment flows beyond the current shell