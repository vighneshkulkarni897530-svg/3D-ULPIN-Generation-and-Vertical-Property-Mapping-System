# Supabase Seed Data (Phase 13)

## Overview

Seed files populate a fresh Supabase database with the same demo entities used
by the prototype's in-memory mock data.

## Order of Execution

SQL files are applied in alphabetical order. Run them after applying all
migrations:

1. `00_seed_users.sql` — 5 users (1 citizen, 2 officers, 1 admin, 1 citizen corp)
2. `01_seed_parcels_buildings_floors.sql` — 5 parcels, 3 buildings, 15 floors
3. `02_seed_property_units_b102_a.sql` — 5 property units (B-102 floors G–1)
4. `03_seed_property_units_b102_b.sql` — 5 property units (B-102 floors 2–4)
5. `04_seed_property_units_b104.sql` — 6 property units (B-104)
6. `05_seed_property_units_b306.sql` — 4 property units (B-306)
7. `06_seed_demo_spatial_ids.sql` — 20 demo spatial IDs (via INSERT...SELECT)
8. `07_seed_conflicts.sql` — 3 spatial conflicts
9. `08_seed_verifications_a.sql` — 13 verification records
10. `09_seed_verifications_b.sql` — 12 verification records
11. `10_seed_workflow_tasks.sql` — 6 workflow tasks
12. `11_seed_disputes.sql` — 2 disputes
13. `12_seed_field_verification_requests.sql` — 2 field verification requests
14. `13_seed_notifications.sql` — 4 notifications
15. `14_seed_activities_a.sql` — 8 activity records
16. `15_seed_activities_b.sql` — 7 activity records
17. `seed_property_items.ts` — TypeScript seed for legacy property items

## Running Seeds

### SQL seeds
Apply each `.sql` file in order using the Supabase CLI:
```bash
supabase db reset  # applies migrations + seeds
```
Or manually:
```bash
psql $SUPABASE_DB_URL -f supabase/migrations/*.sql -f supabase/seed/*.sql
```

### TypeScript seed (legacy property items)
```bash
npx tsx supabase/seed/seed_property_items.ts
```

## Notes

- Only demo registry entities are seeded; no fake audit history is created.
- Demo Spatial IDs are explicitly marked `is_official = false`.
- Official ULPIN references remain `NULL` (integration pending).
- The TypeScript seed script reads from the existing `@/data/mockProperties`
  module, ensuring the DB seed always matches the in-memory prototype data.
