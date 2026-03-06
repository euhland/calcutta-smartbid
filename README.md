# Calcutta SmartBid

Calcutta SmartBid is a live NCAA Calcutta auction cockpit built with Next.js. The current implementation ships with:

- a setup flow for creating an auction workspace
- a live operator cockpit and synchronized viewer mode
- Monte Carlo tournament simulation and bid recommendations
- a ledger for syndicate ownership, spend, and remaining bankroll
- a local file-backed repository for immediate use, plus Supabase-oriented schema and client scaffolding

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Local storage

By default the app persists auction data to a JSON file under the OS temp directory. You can override that path with `CALCUTTA_STORE_FILE`.

## Projection providers

- `mock`: loads the included sample tournament field
- `remote`: fetches JSON from `SPORTS_PROJECTIONS_URL`

The remote endpoint should return:

```json
{
  "provider": "your-provider-name",
  "teams": [
    {
      "id": "duke",
      "name": "Duke",
      "shortName": "DUKE",
      "region": "East",
      "seed": 1,
      "rating": 95,
      "offense": 121.2,
      "defense": 92.7,
      "tempo": 69.1
    }
  ]
}
```

## Supabase

The app includes:

- browser/server Supabase helpers
- realtime subscription hooks
- a starter schema at `supabase/schema.sql`

The local repository remains the default execution path so the app works immediately without provisioning infrastructure.
