# Sifarma Stock Bridge

Architecture:

Netlify -> Railway API <- HTTPS sync <- Mac Connector -> Mock data now / Oracle later

The Mac is the source of truth for pharmacy stock. It pushes a stock snapshot to Railway.
Railway serves that synchronized data to the public frontend.

## Security

The Mac and Railway share a secret `BRIDGE_API_KEY`.
The Mac sends it in `X-Bridge-Key`.
Do not commit real secrets to GitHub.

## Components

- `mac_connector/` — runs continuously on the Mac.
- `backend/` — deploy to Railway.
- `frontend/` — deploy to Netlify.

## Data flow

1. Mac loads products from `mock_products.json`.
2. Every 30 seconds it POSTs them to Railway `/api/internal/stock/sync`.
3. Railway stores the most recent snapshot in memory.
4. Frontend searches Railway.
5. Later set `DATA_SOURCE=oracle` on the Mac connector and it will load from `SIFV_PRODUTOS`.

For production persistence, Railway PostgreSQL should eventually replace the in-memory store.
For development this is sufficient because the always-on Mac re-syncs automatically.
