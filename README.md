# Branchly - Sales Dashboard (DSAI 203)

A Flask + SQLite academic dashboard for a fictional multinational retail company with multiple branches. All charts are implemented with **amCharts 5**.

## Features
- KPI cards: revenue, profit, units sold, transactions
- Revenue and profit trend by month
- Sales comparison by branch
- Revenue by product category
- Top five products
- Branch and date filters
- JSON API endpoints served by Flask

## Run
1. Install Python 3.10 or newer.
2. Open a terminal in this folder.
3. Create and activate a virtual environment (optional but recommended).
4. Run `pip install -r requirements.txt`.
5. Run `python app.py`.
6. Open `http://127.0.0.1:5000` in your browser.

The SQLite database (`dashboard.db`) is created automatically on first run and populated with clearly fictional demo data.

## API endpoints
- `/api/branches`
- `/api/summary`
- `/api/sales-by-branch`
- `/api/monthly-sales`
- `/api/category-sales`
- `/api/top-products`

All data endpoints accept optional `branch`, `start`, and `end` query parameters. Example:
`/api/summary?branch=1&start=2026-01-01&end=2026-10-27`

## Important notes
- amCharts and Google Fonts are loaded from their public CDNs, so internet access is needed when opening the dashboard.
- This is a starter academic project. Replace demo data with approved client/company data before final submission.
- The Flask API is the server-side data source in this implementation. For deployment to a public remote host, deploy the Flask app and database to a hosting server.
