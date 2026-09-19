# Retired SalesCounter page (2026-09-19)

`/dashboard/sales-counter` now renders `StaffPOS` (see `client/src/route/index.jsx`),
so the standalone simple counter page had no route pointing at it and no Hold feature.

Moved here (kept for reference, delete whenever):

- `SalesCounter.jsx` — old walk-in-only counter page
- `salesCounterTotals.js` — its totals helper (superseded by `client/src/utils/posCartTotals.js`)
- `salesCounterTotals.test.js` — old tests (ported to `client/src/utils/posCartTotals.test.js`)

If you ever restore the page: re-add the lazy import + route in `client/src/route/index.jsx`.