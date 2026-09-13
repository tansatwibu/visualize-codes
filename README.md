# Visualize Codes by Days

Simple web app that displays how many days each code appears in the dataset. It uses a sample `data/data.json` by default and can be switched to MongoDB by setting environment variables.

Quick start

1. Install dependencies

```bash
cd d:/works/visualize-codes
npm install
```

2. Run locally

```bash
npm start
# open http://localhost:3000
```

Development

```bash
npm run dev
```

Run tests

```bash
npm test
```

Project structure

```text
src/server/config/          Environment and application configuration
src/server/repositories/   File and MongoDB data access
src/server/controllers/    API request handling and response shaping
src/server/routes/         Express route definitions
public/js/api.js           Shared frontend API client
public/js/charts.js        Chart.js rendering
public/js/tables.js        Table rendering
public/js/dashboard.js     Dashboard state and event handling
test/                      Controller regression tests
```

Using a real MongoDB database

Set the following environment variables (for example in a `.env` file):
 - Set the following environment variables (for example in a `.env` file):

```
MONGO_URI=mongodb+srv://user:pass@host/mydb
MONGO_DBNAME=mydb          # optional
MONGO_COLLECTION=records  # optional, default 'records'
CORS_ORIGIN=                # optional, restrict access to a single origin (e.g. https://example.com). Leave empty to allow all.
```

Expected Mongo document shape (one document per day):

```json
{ "date": "2026-08-29", "codes": ["ACB","HPG","VIC"] }
```

MongoDB indexes (without changing document structure)

When MongoDB mode is enabled, the server creates these indexes automatically the first time it opens the collection. These commands are also provided for manual setup or verification; they only create indexes and do not add, remove, or rewrite fields in existing documents.

```javascript
use mydb

db.records.createIndex(
	{ date: 1 },
	{ name: "idx_records_date" }
)

db.records.createIndex(
	{ codes: 1, date: 1 },
	{ name: "idx_records_codes_date" }
)
```

Replace `mydb` and `records` with `MONGO_DBNAME` and `MONGO_COLLECTION` when they differ from the defaults.

Before creating an index, inspect the actual query plan:

```javascript
db.records.explain("executionStats").find({ date: { $gte: "2026-08-01", $lt: "2026-09-01" } })
db.records.explain("executionStats").find({ codes: "ACB", date: { $gte: "2026-08-01", $lt: "2026-09-01" } })
```

After creating the indexes, run the same commands again. Look for `IXSCAN` and a lower `totalDocsExamined`. Keep an index only when it improves the real workload; every index uses disk/RAM and makes writes slower.

Important: creating an index is different from a data migration. Do not run `updateMany` or add fields such as `dateNormalized` just to create an index. The aggregation pipelines now filter stored `date`, `datetime`, and `codes` fields before calculating normalized dates, allowing these indexes to reduce the scanned documents. Always confirm with `explain("executionStats")` before and after the change.

To remove an index without changing documents:

```javascript
db.records.dropIndex("idx_records_date")
db.records.dropIndex("idx_records_codes_date")
```

API

- `GET /api/data?days=30&top=8` — returns top codes, their counts and percent of days in the requested period.
- `GET /api/sample` — returns a small sample of records.
- `GET /api/code-history?code=ACB&days=30` — returns the dates where a code appeared.
- `GET /api/monthly-counts?year=2026` — returns code-day counts grouped by month.
- `GET /api/daily-counts?month=2026-08` — returns daily code counts for a month.
- `GET /api/daily-counts?start=2026-08-29&end=2026-09-01` — returns daily code counts for a date range.

Notes

- The frontend buttons map to the `days` query parameter.
- `percent` is `count / totalDays * 100` rounded to integer.

Run on a remote server or different device

- You only need to change the `MONGO_URI` (and optionally `CORS_ORIGIN`) to point to your MongoDB that contains the imported `data.json` documents. No code changes required.
- Ensure the server is reachable from clients: if running on a VM or server, open the chosen `PORT` (default `3000`) in firewall and use the server's public IP or domain when opening the site from another device.

Using Docker

1. Build and run with environment variables:

```bash
# set these in environment or in an .env file
docker-compose up --build -d
```

2. Provide `MONGO_URI` etc. as environment variables (e.g. exported in shell or in a `.env` file for docker-compose). The container reads the env and will connect to your remote MongoDB.

Security note

- Do not expose an open MongoDB URI publicly. Keep credentials secure and restrict access to trusted IPs. Use `CORS_ORIGIN` to limit which frontends can access the API.

