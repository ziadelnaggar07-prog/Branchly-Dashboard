import os
from flask import Flask, jsonify, render_template, request
import sqlite3
from pathlib import Path

app = Flask(__name__)
DB_PATH = Path(__file__).with_name("dashboard.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create the database and insert demo data the first time the app runs."""
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit_price REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            sale_date TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            revenue REAL NOT NULL,
            cost REAL NOT NULL,
            FOREIGN KEY(branch_id) REFERENCES branches(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        );
    """)
    if cur.execute("SELECT COUNT(*) FROM branches").fetchone()[0] == 0:
        branches = [
            (1, "Cairo Branch", "Cairo"), (2, "Alexandria Branch", "Alexandria"),
            (3, "Giza Branch", "Giza"), (4, "Mansoura Branch", "Mansoura"),
            (5, "Aswan Branch", "Aswan")
        ]
        products = [
            (1, "Laptop Pro", "Electronics", 32000),
            (2, "Smartphone X", "Electronics", 18000),
            (3, "Office Chair", "Furniture", 4200),
            (4, "Desk Lamp", "Home", 850),
            (5, "Coffee Maker", "Home", 2600),
            (6, "Wireless Headphones", "Electronics", 2400),
            (7, "Study Desk", "Furniture", 6500)
        ]
        cur.executemany("INSERT INTO branches VALUES (?, ?, ?)", branches)
        cur.executemany("INSERT INTO products VALUES (?, ?, ?, ?)", products)

        # Reproducible sample transactions across the year 2026.
        import random
        from datetime import date, timedelta
        rng = random.Random(203)
        start = date(2026, 1, 1)
        transactions = []
        for day in range(300):
            sale_day = start + timedelta(days=day)
            for _ in range(rng.randint(2, 7)):
                branch_id = rng.randint(1, len(branches))
                product_id = rng.randint(1, len(products))
                product_price = products[product_id - 1][3]
                qty = rng.randint(1, 5)
                revenue = round(product_price * qty * rng.uniform(0.92, 1.08), 2)
                cost = round(revenue * rng.uniform(0.58, 0.82), 2)
                transactions.append((branch_id, product_id, sale_day.isoformat(), qty, revenue, cost))
        cur.executemany("""
            INSERT INTO sales (branch_id, product_id, sale_date, quantity, revenue, cost)
            VALUES (?, ?, ?, ?, ?, ?)
        """, transactions)
    conn.commit()
    conn.close()

def filters():
    branch = request.args.get("branch", "all")
    start = request.args.get("start", "2026-01-01")
    end = request.args.get("end", "2026-10-27")
    return branch, start, end

def where_clause(branch, start, end):
    sql = " WHERE s.sale_date BETWEEN ? AND ? "
    params = [start, end]
    if branch != "all":
        sql += " AND s.branch_id = ? "
        params.append(branch)
    return sql, params

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/branches")
def api_branches():
    conn = get_db()
    rows = conn.execute("SELECT id, name FROM branches ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/summary")
def api_summary():
    branch, start, end = filters()
    sql, params = where_clause(branch, start, end)
    conn = get_db()
    row = conn.execute(f"""
        SELECT COALESCE(SUM(s.revenue),0) revenue,
               COALESCE(SUM(s.cost),0) cost,
               COALESCE(SUM(s.quantity),0) units,
               COUNT(*) orders
        FROM sales s {sql}
    """, params).fetchone()
    conn.close()
    revenue = float(row["revenue"])
    cost = float(row["cost"])
    return jsonify({
        "revenue": round(revenue, 2),
        "profit": round(revenue - cost, 2),
        "units": int(row["units"]),
        "orders": int(row["orders"])
    })

@app.route("/api/sales-by-branch")
def api_sales_by_branch():
    branch, start, end = filters()
    sql, params = where_clause(branch, start, end)
    conn = get_db()
    rows = conn.execute(f"""
        SELECT b.name branch, ROUND(SUM(s.revenue),2) sales
        FROM sales s JOIN branches b ON b.id=s.branch_id
        {sql} GROUP BY b.id ORDER BY sales DESC
    """, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/monthly-sales")
def api_monthly_sales():
    branch, start, end = filters()
    sql, params = where_clause(branch, start, end)
    conn = get_db()
    rows = conn.execute(f"""
        SELECT strftime('%Y-%m', s.sale_date) month,
               ROUND(SUM(s.revenue),2) sales,
               ROUND(SUM(s.revenue-s.cost),2) profit
        FROM sales s {sql}
        GROUP BY strftime('%Y-%m', s.sale_date)
        ORDER BY month
    """, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/category-sales")
def api_category_sales():
    branch, start, end = filters()
    sql, params = where_clause(branch, start, end)
    conn = get_db()
    rows = conn.execute(f"""
        SELECT p.category category, ROUND(SUM(s.revenue),2) sales
        FROM sales s JOIN products p ON p.id=s.product_id
        {sql} GROUP BY p.category ORDER BY sales DESC
    """, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/top-products")
def api_top_products():
    branch, start, end = filters()
    sql, params = where_clause(branch, start, end)
    conn = get_db()
    rows = conn.execute(f"""
        SELECT p.name product, SUM(s.quantity) units,
               ROUND(SUM(s.revenue),2) revenue
        FROM sales s JOIN products p ON p.id=s.product_id
        {sql} GROUP BY p.id ORDER BY revenue DESC LIMIT 5
    """, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

init_db()

init_db()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )