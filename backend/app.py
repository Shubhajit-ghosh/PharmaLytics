from flask import Flask, jsonify, send_from_directory, request
import sqlite3
import os

app = Flask(__name__, static_folder='../', static_url_path='')
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../analytics.db'))

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def run_migrations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. SalesReps columns migration
        cursor.execute("PRAGMA table_info(SalesReps)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'Password' not in columns:
            cursor.execute("ALTER TABLE SalesReps ADD COLUMN Password TEXT")
            conn.commit()
        if 'Username' not in columns:
            cursor.execute("ALTER TABLE SalesReps ADD COLUMN Username TEXT")
            conn.commit()
            
        # Seed default password Rep@1 and Username Jimmy for representative Jimmy Grey
        cursor.execute("UPDATE SalesReps SET Password = ?, Username = ? WHERE RepName = ?", ('Rep@1', 'Jimmy', 'Jimmy Grey'))
        conn.commit()
        
        # 2. Managers Table creation
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Managers (
                ManagerID INTEGER PRIMARY KEY AUTOINCREMENT,
                ManagerName VARCHAR(100) UNIQUE,
                Username VARCHAR(100),
                Password TEXT
            )
        """)
        conn.commit()
        
        # Seed managers from unique Managers in SalesReps
        cursor.execute("SELECT DISTINCT Manager FROM SalesReps WHERE Manager IS NOT NULL AND Manager != ''")
        managers = [m[0] for m in cursor.fetchall()]
        all_manager_names = list(set(managers + ['Patricia Diaz']))
        for m in all_manager_names:
            cursor.execute("INSERT OR IGNORE INTO Managers (ManagerName) VALUES (?)", (m,))
            first_name = m.split()[0]
            cursor.execute("UPDATE Managers SET Username = ?, Password = ? WHERE ManagerName = ? AND (Username IS NULL OR Username = '')", (first_name, 'Mgr@1', m))
        conn.commit()

        # 3. Add Status column to Sales table
        cursor.execute("PRAGMA table_info(Sales)")
        sales_cols = [col[1] for col in cursor.fetchall()]
        if 'Status' not in sales_cols:
            cursor.execute("ALTER TABLE Sales ADD COLUMN Status TEXT DEFAULT 'Approved'")
            conn.commit()
            
        # 4. Add Status column to Drugs table
        cursor.execute("PRAGMA table_info(Drugs)")
        drugs_cols = [col[1] for col in cursor.fetchall()]
        if 'Status' not in drugs_cols:
            cursor.execute("ALTER TABLE Drugs ADD COLUMN Status TEXT DEFAULT 'Active'")
            conn.commit()
            
        # 5. Create Targets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Targets (
                TargetID INTEGER PRIMARY KEY AUTOINCREMENT,
                Type VARCHAR(50),
                Name VARCHAR(100),
                Year INTEGER,
                Month VARCHAR(20),
                TargetAmount DECIMAL(12, 2),
                UNIQUE(Type, Name, Year, Month)
            )
        """)
        conn.commit()
        
        # Seed default Targets
        cursor.execute("SELECT COUNT(*) FROM Targets")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT OR IGNORE INTO Targets (Type, Name, Year, Month, TargetAmount) VALUES ('Global', 'Company', 2026, 'July', 2000000.00)")
            cursor.execute("INSERT OR IGNORE INTO Targets (Type, Name, Year, Month, TargetAmount) VALUES ('Manager', 'Patricia Diaz', 2026, 'July', 500000.00)")
            cursor.execute("INSERT OR IGNORE INTO Targets (Type, Name, Year, Month, TargetAmount) VALUES ('Rep', 'Jimmy Grey', 2026, 'July', 100000.00)")
            conn.commit()
            
        conn.close()
    except Exception as e:
        print("Migration failed:", e)

run_migrations()

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    return response

# Helper to build and execute SQL queries with dynamic filters
def execute_filtered_query(select_fields, group_by="", order_by="", limit=""):
    country = request.args.get('country')
    year = request.args.get('year')
    rep = request.args.get('rep')
    drug = request.args.get('drug')
    manager = request.args.get('manager')
    
    conditions = ["s.Status = 'Approved'"]
    params = []
    
    # We join all dimensions in a star-schema configuration for secure, dynamic query filters
    all_joins = """
        JOIN Regions r ON s.RegionID = r.RegionID 
        JOIN SalesReps sr ON s.RepID = sr.RepID 
        JOIN Drugs d ON s.DrugID = d.DrugID 
        JOIN Doctors doc ON s.DoctorID = doc.DoctorID
    """
    
    if country and country != 'All':
        conditions.append("r.Country = ?")
        params.append(country)
    if year and year != 'All':
        conditions.append("s.Year = ?")
        params.append(int(year))
    if rep and rep != 'All':
        conditions.append("sr.RepName = ?")
        params.append(rep)
    if manager and manager != 'All' and (not rep or rep == 'All'):
        conditions.append("sr.Manager = ?")
        params.append(manager)
    if drug and drug != 'All':
        conditions.append("d.ProductName = ?")
        params.append(drug)
        
    where_clause = ""
    if conditions:
        where_clause = " WHERE " + " AND ".join(conditions)
        
    query = f"SELECT {select_fields} FROM Sales s {all_joins} {where_clause}"
    if group_by:
        query += f" GROUP BY {group_by}"
    if order_by:
        query += f" ORDER BY {order_by}"
    if limit:
        query += f" LIMIT {limit}"
        
    conn = get_db_connection()
    try:
        res = conn.execute(query, params).fetchall()
        return res
    finally:
        conn.close()

@app.route('/')
def index():
    return send_from_directory('../', 'index.html')

# 1. GET /api/kpis (Calculated dynamically based on filters)
@app.route('/api/kpis')
def get_kpis():
    try:
        # Total Revenue
        total_rev_row = execute_filtered_query("SUM(s.TotalSales)")[0]
        total_rev = total_rev_row[0] if total_rev_row[0] is not None else 0
        
        # Total Units Sold
        total_units_row = execute_filtered_query("SUM(s.Quantity)")[0]
        total_units = total_units_row[0] if total_units_row[0] is not None else 0
        
        # Active Reps
        active_reps_row = execute_filtered_query("COUNT(DISTINCT s.RepID)")[0]
        active_reps = active_reps_row[0] if active_reps_row[0] is not None else 0
        
        # Top Region
        top_reg_rows = execute_filtered_query(
            "r.City, r.Country, SUM(s.TotalSales) as Sales",
            group_by="s.RegionID",
            order_by="Sales DESC",
            limit=1
        )
        top_region = f"{top_reg_rows[0]['City']}, {top_reg_rows[0]['Country']}" if top_reg_rows else "-"
        top_region_sales = top_reg_rows[0]['Sales'] if top_reg_rows else 0
        
        # Top Drug (retained for dashboard KPI cards)
        top_drug_rows = execute_filtered_query(
            "d.ProductName, SUM(s.TotalSales) as Sales",
            group_by="s.DrugID",
            order_by="Sales DESC",
            limit=1
        )
        top_drug = top_drug_rows[0]['ProductName'] if top_drug_rows else "-"
        top_drug_sales = top_drug_rows[0]['Sales'] if top_drug_rows else 0
        
        return jsonify({
            "total_revenue": total_rev,
            "total_units": total_units,
            "active_reps": active_reps,
            "top_region": top_region,
            "top_region_sales": top_region_sales,
            "top_drug": top_drug,
            "top_drug_sales": top_drug_sales
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. GET /api/revenue-trend
@app.route('/api/revenue-trend')
def get_revenue_trend():
    try:
        rows = execute_filtered_query(
            "s.Year, s.Month, SUM(s.TotalSales) as Sales",
            group_by="s.Year, s.Month"
        )
        
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        
        sorted_data = []
        for r in rows:
            m_num = month_map.get(r['Month'], 1)
            sorted_data.append({
                'label': f"{r['Year']}-{str(m_num).zfill(2)}",
                'sales': r['Sales'],
                'sort_key': r['Year'] * 100 + m_num
            })
        sorted_data = sorted(sorted_data, key=lambda x: x['sort_key'])
        
        labels = [item['label'] for item in sorted_data]
        sales = [item['sales'] for item in sorted_data]
        
        return jsonify({
            "labels": labels,
            "data": sales
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. GET /api/forecast
@app.route('/api/forecast')
def get_forecast():
    try:
        rows = execute_filtered_query(
            "s.Year, s.Month, SUM(s.TotalSales) as Sales",
            group_by="s.Year, s.Month"
        )
        
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        
        sorted_data = []
        for r in rows:
            m_num = month_map.get(r['Month'], 1)
            sorted_data.append({
                'label': f"{r['Year']}-{str(m_num).zfill(2)}",
                'sales': r['Sales'],
                'sort_key': r['Year'] * 100 + m_num
            })
        sorted_data = sorted(sorted_data, key=lambda x: x['sort_key'])
        
        labels = [item['label'] for item in sorted_data]
        sales = [item['sales'] for item in sorted_data]
        
        forecast_labels = []
        forecast_data = []
        
        if len(sales) >= 3:
            last_val = sales[-1]
            diff = (sales[-1] - sales[-3]) / 2
            
            # Start forecast from the last actual point as a bridge
            forecast_labels.append(labels[-1])
            forecast_data.append(last_val)
            
            last_year, last_month = map(int, labels[-1].split('-'))
            for i in range(1, 4):
                next_month = last_month + i
                next_year = last_year
                if next_month > 12:
                    next_month -= 12
                    next_year += 1
                forecast_labels.append(f"{next_year}-{str(next_month).zfill(2)}")
                forecast_data.append(last_val + diff * i)
                
        return jsonify({
            "labels": forecast_labels,
            "data": forecast_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. GET /api/region-performance
@app.route('/api/region-performance')
def get_region_performance():
    try:
        rows = execute_filtered_query(
            "r.Country, SUM(s.TotalSales) as Sales",
            group_by="r.Country",
            order_by="Sales DESC"
        )
        
        labels = [r['Country'] for r in rows]
        sales = [r['Sales'] for r in rows]
        
        return jsonify({
            "labels": labels,
            "data": sales
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. GET /api/top-drugs
@app.route('/api/top-drugs')
def get_top_drugs():
    try:
        rows = execute_filtered_query(
            "d.ProductName, SUM(s.TotalSales) as Sales",
            group_by="d.ProductName",
            order_by="Sales DESC",
            limit=5
        )
        
        labels = [r['ProductName'] for r in rows]
        sales = [r['Sales'] for r in rows]
        
        return jsonify({
            "labels": labels,
            "data": sales
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 6. GET /api/rep-performance
@app.route('/api/rep-performance')
def get_rep_performance():
    try:
        rows = execute_filtered_query(
            "sr.RepName, sr.Manager, sr.SalesTeam, SUM(s.TotalSales) as Sales",
            group_by="sr.RepID",
            order_by="Sales DESC"
        )
        
        reps = []
        for r in rows:
            reps.append({
                "name": r['RepName'],
                "manager": r['Manager'],
                "team": r['SalesTeam'],
                "sales": r['Sales']
            })
        return jsonify(reps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Doctor Chart API (Backwards compatibility)
@app.route('/api/charts/doctors')
def get_doctors_chart():
    try:
        rows = execute_filtered_query(
            "doc.CustomerName, SUM(s.Quantity) as Quantity",
            group_by="doc.CustomerName",
            order_by="Quantity DESC",
            limit=6
        )
        
        labels = [r['CustomerName'] for r in rows]
        quantities = [r['Quantity'] for r in rows]
        
        return jsonify({
            "labels": labels,
            "data": quantities
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Drugs list API (Backwards compatibility)
@app.route('/api/drugs')
def get_drugs():
    try:
        rows = execute_filtered_query(
            "d.DrugID, d.ProductName, d.ProductClass, SUM(s.Quantity) as Quantity, SUM(s.TotalSales) as Sales",
            group_by="d.DrugID",
            order_by="Sales DESC"
        )
        
        drugs = []
        for r in rows:
            qty = r['Quantity'] or 0
            sales = r['Sales'] or 0.0
            avg_price = round(sales / qty, 2) if qty > 0 else 100.0
            drugs.append({
                "id": r['DrugID'],
                "name": r['ProductName'],
                "class": r['ProductClass'],
                "quantity": qty,
                "sales": sales,
                "avgPrice": avg_price
            })
        return jsonify(drugs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# POST /api/reps
@app.route('/api/reps', methods=['POST'])
def add_sales_rep():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('manager') or not data.get('team'):
        return jsonify({"error": "Missing representative name, manager, or team."}), 400
    
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO SalesReps (RepName, Manager, SalesTeam) VALUES (?, ?, ?)",
            (data['name'], data['manager'], data['team'])
        )
        conn.commit()
        return jsonify({"success": True, "message": "Representative added successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# POST /api/drugs
@app.route('/api/drugs', methods=['POST'])
def add_drug():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('class'):
        return jsonify({"error": "Missing drug name or class."}), 400
    
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO Drugs (ProductName, ProductClass) VALUES (?, ?)",
            (data['name'], data['class'])
        )
        conn.commit()
        return jsonify({"success": True, "message": "Drug segment added successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# GET /api/reps/check-password?name=...
@app.route('/api/reps/check-password')
def check_rep_password():
    name = request.args.get('name')
    if not name:
        return jsonify({"error": "Missing name parameter."}), 400
    
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT Password, RepName FROM SalesReps WHERE LOWER(Username) = ? OR LOWER(RepName) = ?", (name.lower(), name.lower())).fetchone()
        if not row:
            return jsonify({"exists": False, "firstLogin": True})
        
        has_password = row['Password'] is not None and row['Password'].strip() != ""
        return jsonify({
            "exists": True,
            "firstLogin": not has_password,
            "mappedName": row['RepName']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# POST /api/reps/set-password
@app.route('/api/reps/set-password', methods=['POST'])
def set_rep_password():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('password'):
        return jsonify({"error": "Missing name or password."}), 400
    
    name = data['name']
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT RepID, RepName FROM SalesReps WHERE LOWER(Username) = ? OR LOWER(RepName) = ?", (name.lower(), name.lower())).fetchone()
        if not row:
            return jsonify({"error": "Representative not found."}), 404
        
        conn.execute("UPDATE SalesReps SET Password = ? WHERE RepID = ?", (data['password'], row['RepID']))
        conn.commit()
        return jsonify({"success": True, "message": "Password registered successfully!", "mappedName": row['RepName']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# POST /api/reps/login
@app.route('/api/reps/login', methods=['POST'])
def rep_login():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('password'):
        return jsonify({"error": "Missing name or password."}), 400
    
    name = data['name']
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT RepID, RepName, Password FROM SalesReps WHERE LOWER(Username) = ? OR LOWER(RepName) = ?", (name.lower(), name.lower())).fetchone()
        if not row:
            return jsonify({"error": "Representative not found."}), 404
        
        if not row['Password'] or row['Password'] != data['password']:
            return jsonify({"error": "Invalid password."}), 401
            
        return jsonify({"success": True, "repId": row['RepID'], "mappedName": row['RepName']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# POST /api/managers/login
@app.route('/api/managers/login', methods=['POST'])
def manager_login():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('password'):
        return jsonify({"error": "Missing name or password."}), 400
    
    name = data['name']
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT ManagerID, ManagerName, Password FROM Managers WHERE LOWER(Username) = ? OR LOWER(ManagerName) = ?", (name.lower(), name.lower())).fetchone()
        if not row:
            return jsonify({"error": "Manager not found."}), 404
        
        if not row['Password'] or row['Password'] != data['password']:
            return jsonify({"error": "Invalid password."}), 401
            
        return jsonify({"success": True, "managerId": row['ManagerID'], "mappedName": row['ManagerName']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# GET /api/manager/reps
@app.route('/api/manager/reps')
def get_manager_reps():
    manager_name = request.args.get('managerName')
    if not manager_name:
        return jsonify({"error": "Missing managerName."}), 400
        
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT RepID, RepName FROM SalesReps WHERE Manager = ?", (manager_name,)).fetchall()
        reps = [{"id": r['RepID'], "name": r['RepName']} for r in rows]
        return jsonify(reps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

import datetime

# Global memory list to store representative update notifications for Admin monitoring
admin_notifications = []

@app.route('/api/sales/entry', methods=['POST'])
def add_sales_entry():
    data = request.get_json()
    if not data or not data.get('repName') or not data.get('drugId') or not data.get('units') or not data.get('date') or not data.get('country'):
        return jsonify({"error": "Missing required fields."}), 400
    
    rep_name = data['repName']
    drug_id = int(data['drugId'])
    units = int(data['units'])
    date_str = data['date'] # YYYY-MM-DD
    country = data['country'] # Germany or Poland
    
    # 1. Parse date details
    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        year = dt.year
        month_name = dt.strftime("%B") # January, February, etc.
    except Exception as e:
        return jsonify({"error": f"Invalid date format: {str(e)}"}), 400
        
    conn = get_db_connection()
    try:
        # 2. Get RepID
        rep_row = conn.execute("SELECT RepID FROM SalesReps WHERE RepName = ?", (rep_name,)).fetchone()
        if not rep_row:
            return jsonify({"error": f"Representative '{rep_name}' not found."}), 404
        rep_id = rep_row['RepID']
        
        # 3. Get Drug details & compute Price
        drug_row = conn.execute("SELECT ProductName FROM Drugs WHERE DrugID = ?", (drug_id,)).fetchone()
        if not drug_row:
            return jsonify({"error": f"Drug Segment ID {drug_id} not found."}), 404
        drug_name = drug_row['ProductName']
        
        price_row = conn.execute("""
            SELECT COALESCE(SUM(TotalSales) / SUM(Quantity), 100.0) as Price 
            FROM Sales WHERE DrugID = ?
        """, (drug_id,)).fetchone()
        price = price_row['Price'] if price_row else 100.0
        total_sales = round(units * price, 2)
        
        # 4. Get RegionID matching the country
        region_row = conn.execute("SELECT RegionID FROM Regions WHERE Country = ? LIMIT 1", (country,)).fetchone()
        region_id = region_row['RegionID'] if region_row else 1
        
        # 5. Get DoctorID associated with this country historically, or fallback to first doctor
        doctor_row = conn.execute("""
            SELECT s.DoctorID FROM Sales s
            JOIN Regions r ON s.RegionID = r.RegionID
            WHERE r.Country = ? LIMIT 1
        """, (country,)).fetchone()
        doctor_id = doctor_row['DoctorID'] if doctor_row else 1
        
        # 6. Insert new record into Sales table with 'Pending Review' status
        conn.execute("""
            INSERT INTO Sales (RegionID, DoctorID, DrugID, RepID, Month, Year, Quantity, Price, TotalSales, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review')
        """, (region_id, doctor_id, drug_id, rep_id, month_name, year, units, price, total_sales))
        conn.commit()
        
        # 7. Add notification for the Admin
        notif_msg = f"{rep_name} added {units} units of {drug_name} in {country} (Est. Revenue: ${total_sales:,.2f}) on {date_str}."
        admin_notifications.insert(0, {
            "id": int(datetime.datetime.now().timestamp() * 1000),
            "title": "Representative Update",
            "message": notif_msg,
            "time": "Just now",
            "read": False
        })
        
        return jsonify({
            "success": True,
            "message": "Sales entry successfully recorded in SQLite!",
            "revenue": total_sales,
            "price": round(price, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/notifications')
def get_admin_notifications():
    return jsonify(admin_notifications)

@app.route('/api/admin/notifications/clear', methods=['POST'])
def clear_admin_notifications():
    global admin_notifications
    admin_notifications = []
    return jsonify({"success": True})

@app.route('/api/reps/monthly-summary')
def get_rep_monthly_summary():
    rep_name = request.args.get('repName')
    month = request.args.get('month') # e.g. "July"
    year = request.args.get('year') # e.g. "2026"
    if not rep_name or not month or not year:
        return jsonify({"error": "Missing parameters."}), 400
        
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT COALESCE(SUM(s.Quantity), 0) as MonthlyQty,
                   COALESCE(SUM(s.TotalSales), 0.0) as MonthlySales
            FROM Sales s
            JOIN SalesReps sr ON s.RepID = sr.RepID
            WHERE sr.RepName = ? AND s.Month = ? AND s.Year = ?
        """, (rep_name, month, int(year))).fetchone()
        
        return jsonify({
            "monthlyQty": row['MonthlyQty'],
            "monthlySales": round(row['MonthlySales'], 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/reps-managers')
def get_reps_managers():
    conn = get_db_connection()
    try:
        reps = conn.execute("SELECT RepID, RepName, Manager, Username, Password FROM SalesReps").fetchall()
        managers = conn.execute("SELECT ManagerID, ManagerName, Username, Password FROM Managers").fetchall()
        return jsonify({
            "reps": [{"id": r['RepID'], "name": r['RepName'], "manager": r['Manager'], "username": r['Username'] or "", "password": r['Password'] or ""} for r in reps],
            "managers": [{"id": m['ManagerID'], "name": m['ManagerName'], "username": m['Username'] or "", "password": m['Password'] or ""} for m in managers]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/save-credentials', methods=['POST'])
def save_credentials():
    data = request.get_json()
    if not data or not data.get('type') or not data.get('id') or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Missing fields."}), 400
        
    user_type = data['type']
    user_id = int(data['id'])
    username = data['username']
    password = data['password']
    
    # Check password constraints
    import re
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters long."}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"error": "Password must contain at least one uppercase letter."}), 400
    if not re.search(r"[a-z]", password):
        return jsonify({"error": "Password must contain at least one lowercase letter."}), 400
    if not re.search(r"\d", password):
        return jsonify({"error": "Password must contain at least one digit."}), 400
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return jsonify({"error": "Password must contain at least one special character."}), 400

    conn = get_db_connection()
    try:
        if user_type == 'rep':
            conn.execute("UPDATE SalesReps SET Username = ?, Password = ? WHERE RepID = ?", (username, password, user_id))
        else:
            conn.execute("UPDATE Managers SET Username = ?, Password = ? WHERE ManagerID = ?", (username, password, user_id))
        conn.commit()
        return jsonify({"success": True, "message": "Credentials updated successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Dynamic Approvals, Drugs, and Targets APIs
@app.route('/api/admin/pending-approvals')
def get_pending_approvals():
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT s.SalesID, sr.RepName, d.ProductName, s.Quantity, s.Month, s.Year, r.Country, s.TotalSales
            FROM Sales s
            JOIN SalesReps sr ON s.RepID = sr.RepID
            JOIN Drugs d ON s.DrugID = d.DrugID
            JOIN Regions r ON s.RegionID = r.RegionID
            WHERE s.Status = 'Pending Review'
            ORDER BY s.SalesID DESC
        """).fetchall()
        return jsonify([{
            "id": r['SalesID'],
            "rep": r['RepName'],
            "drug": r['ProductName'],
            "units": r['Quantity'],
            "date": f"{r['Month']} {r['Year']}",
            "country": r['Country'],
            "revenue": round(r['TotalSales'], 2)
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/approve-reject', methods=['POST'])
def approve_reject():
    data = request.get_json()
    if not data or not data.get('id') or not data.get('action'):
        return jsonify({"error": "Missing fields."}), 400
    
    sales_id = int(data['id'])
    action = data['action'] # 'Approved' or 'Rejected'
    if action not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid action."}), 400
        
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT sr.RepName, s.Quantity, d.ProductName, s.Month, s.Year, s.TotalSales
            FROM Sales s
            JOIN SalesReps sr ON s.RepID = sr.RepID
            JOIN Drugs d ON s.DrugID = d.DrugID
            WHERE s.SalesID = ?
        """, (sales_id,)).fetchone()
        if not row:
            return jsonify({"error": "Record not found."}), 404
            
        conn.execute("UPDATE Sales SET Status = ? WHERE SalesID = ?", (action, sales_id))
        conn.commit()
        
        # Insert notification
        notif_title = "Submission Approved" if action == 'Approved' else "Submission Rejected"
        notif_msg = f"{row['RepName']}'s entry of {row['Quantity']} units of {row['ProductName']} for {row['Month']} {row['Year']} was {action.lower()} by Admin."
        admin_notifications.insert(0, {
            "id": int(datetime.datetime.now().timestamp() * 1000),
            "title": notif_title,
            "message": notif_msg,
            "time": "Just now",
            "read": False
        })
        
        return jsonify({"success": True, "message": f"Submission successfully {action.lower()}!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/drugs')
def get_admin_drugs():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT DrugID, ProductName, ProductClass, Status FROM Drugs").fetchall()
        drugs_list = []
        for r in rows:
            price_row = conn.execute("""
                SELECT COALESCE(SUM(TotalSales) / SUM(Quantity), 100.0) as Price 
                FROM Sales WHERE DrugID = ?
            """, (r['DrugID'],)).fetchone()
            price = price_row['Price'] if price_row else 100.0
            drugs_list.append({
                "id": r['DrugID'],
                "name": r['ProductName'],
                "category": r['ProductClass'],
                "price": round(price, 2),
                "status": r['Status'] or 'Active'
            })
        return jsonify(drugs_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/toggle-drug-status', methods=['POST'])
def toggle_drug_status():
    data = request.get_json()
    if not data or not data.get('id') or not data.get('status'):
        return jsonify({"error": "Missing fields."}), 400
    drug_id = int(data['id'])
    status = data['status']
    
    conn = get_db_connection()
    try:
        conn.execute("UPDATE Drugs SET Status = ? WHERE DrugID = ?", (status, drug_id))
        conn.commit()
        return jsonify({"success": True, "message": f"Drug status updated to {status}!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/drugs/active')
def get_active_drugs():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT DrugID, ProductName, ProductClass FROM Drugs WHERE Status = 'Active'").fetchall()
        drugs_list = []
        for r in rows:
            price_row = conn.execute("""
                SELECT COALESCE(SUM(TotalSales) / SUM(Quantity), 100.0) as Price 
                FROM Sales WHERE DrugID = ? AND Status = 'Approved'
            """, (r['DrugID'],)).fetchone()
            price = price_row['Price'] if price_row else 100.0
            drugs_list.append({
                "id": r['DrugID'],
                "name": r['ProductName'],
                "class": r['ProductClass'],
                "avgPrice": round(price, 2)
            })
        return jsonify(drugs_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/targets')
def get_targets():
    year = request.args.get('year', 2026)
    month = request.args.get('month', 'July')
    rep_name = request.args.get('repName')
    manager_name = request.args.get('managerName')
    
    conn = get_db_connection()
    try:
        # Determine manager name if a rep name was passed but no manager name
        if rep_name and not manager_name:
            mgr_row = conn.execute("SELECT Manager FROM SalesReps WHERE RepName = ?", (rep_name,)).fetchone()
            if mgr_row:
                manager_name = mgr_row['Manager']
                
        # If no manager_name is found, default to first seeded manager target in the database
        if not manager_name:
            t_mgr = conn.execute("SELECT Name FROM Targets WHERE Type = 'Manager' AND Year = ? AND Month = ? LIMIT 1", (int(year), month)).fetchone()
            if t_mgr:
                manager_name = t_mgr['Name']
            else:
                manager_name = "Alisha Cordwell" # Fallback
                
        # If no rep_name is found, default to first seeded rep target for that manager
        if not rep_name:
            t_rep = conn.execute("SELECT Name FROM Targets WHERE Type = 'Rep' AND Year = ? AND Month = ? LIMIT 1", (int(year), month)).fetchone()
            if t_rep:
                rep_name = t_rep['Name']
            else:
                rep_name = "Jimmy Grey" # Fallback
                
        # Fetch targets from DB
        global_target_row = conn.execute("SELECT TargetAmount FROM Targets WHERE Type = 'Global' AND Year = ? AND Month = ?", (int(year), month)).fetchone()
        global_target_amt = global_target_row['TargetAmount'] if global_target_row else 2000000.00
        
        manager_target_row = conn.execute("SELECT TargetAmount FROM Targets WHERE Type = 'Manager' AND Name = ? AND Year = ? AND Month = ?", (manager_name, int(year), month)).fetchone()
        manager_target_amt = manager_target_row['TargetAmount'] if manager_target_row else 500000.00
        
        rep_target_row = conn.execute("SELECT TargetAmount FROM Targets WHERE Type = 'Rep' AND Name = ? AND Year = ? AND Month = ?", (rep_name, int(year), month)).fetchone()
        rep_target_amt = rep_target_row['TargetAmount'] if rep_target_row else 100000.00
        
        # Calculate actuals
        global_actual = conn.execute("""
            SELECT COALESCE(SUM(TotalSales), 0.0) as Actual FROM Sales 
            WHERE Year = ? AND Month = ? AND Status = 'Approved'
        """, (int(year), month)).fetchone()['Actual']
        
        manager_actual = conn.execute("""
            SELECT COALESCE(SUM(s.TotalSales), 0.0) as Actual FROM Sales s
            JOIN SalesReps sr ON s.RepID = sr.RepID
            WHERE s.Year = ? AND s.Month = ? AND s.Status = 'Approved' AND sr.Manager = ?
        """, (int(year), month, manager_name)).fetchone()['Actual']
        
        rep_actual = conn.execute("""
            SELECT COALESCE(SUM(s.TotalSales), 0.0) as Actual FROM Sales s
            JOIN SalesReps sr ON s.RepID = sr.RepID
            WHERE s.Year = ? AND s.Month = ? AND s.Status = 'Approved' AND sr.RepName = ?
        """, (int(year), month, rep_name)).fetchone()['Actual']
        
        # Calculate reps progress under this manager
        reps_progress = []
        if manager_name:
            reps_rows = conn.execute("SELECT RepName FROM SalesReps WHERE Manager = ?", (manager_name,)).fetchall()
            for r in reps_rows:
                r_name = r['RepName']
                t_row = conn.execute("SELECT TargetAmount FROM Targets WHERE Type = 'Rep' AND Name = ? AND Year = ? AND Month = ?", (r_name, int(year), month)).fetchone()
                t_amt = t_row['TargetAmount'] if t_row else 0.0
                a_row = conn.execute("""
                    SELECT COALESCE(SUM(s.TotalSales), 0.0) as Actual FROM Sales s
                    JOIN SalesReps sr ON s.RepID = sr.RepID
                    WHERE s.Year = ? AND s.Month = ? AND s.Status = 'Approved' AND sr.RepName = ?
                """, (int(year), month, r_name)).fetchone()
                a_amt = a_row['Actual'] if a_row else 0.0
                reps_progress.append({
                    "name": r_name,
                    "target": t_amt,
                    "actual": round(a_amt, 2),
                    "achievement": round((a_amt / t_amt * 100) if t_amt > 0 else 0, 1)
                })
                
        all_targets = conn.execute("SELECT TargetID, Type, Name, Year, Month, TargetAmount FROM Targets").fetchall()
        
        return jsonify({
            "global": {
                "name": "Company",
                "target": global_target_amt,
                "actual": round(global_actual, 2),
                "achievement": round((global_actual / global_target_amt * 100) if global_target_amt > 0 else 0, 1)
            },
            "manager": {
                "name": manager_name,
                "target": manager_target_amt,
                "actual": round(manager_actual, 2),
                "achievement": round((manager_actual / manager_target_amt * 100) if manager_target_amt > 0 else 0, 1)
            },
            "rep": {
                "name": rep_name,
                "target": rep_target_amt,
                "actual": round(rep_actual, 2),
                "achievement": round((rep_actual / rep_target_amt * 100) if rep_target_amt > 0 else 0, 1)
            },
            "reps_progress": reps_progress,
            "list": [{
                "id": t['TargetID'],
                "type": t['Type'],
                "name": t['Name'],
                "year": t['Year'],
                "month": t['Month'],
                "target": t['TargetAmount']
            } for t in all_targets]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/set-target', methods=['POST'])
def set_target():
    data = request.get_json()
    if not data or not data.get('type') or not data.get('name') or not data.get('target'):
        return jsonify({"error": "Missing fields."}), 400
        
    target_type = data['type']
    name = data['name']
    year = int(data.get('year', 2026))
    month = data.get('month', 'July')
    amount = float(data['target'])
    
    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT INTO Targets (Type, Name, Year, Month, TargetAmount)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(Type, Name, Year, Month) DO UPDATE SET TargetAmount = excluded.TargetAmount
        """, (target_type, name, year, month, amount))
        conn.commit()
        
        updater = data.get('updater', 'Admin')
        admin_notifications.insert(0, {
            "id": int(datetime.datetime.now().timestamp() * 1000),
            "title": "Target Updated",
            "message": f"{updater} set {target_type} target for {name} ({month} {year}) to ${amount:,.2f}.",
            "time": "Just now",
            "read": False
        })
        return jsonify({"success": True, "message": "Target saved successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/delete-target/<int:target_id>', methods=['POST', 'DELETE'])
def delete_target(target_id):
    conn = get_db_connection()
    try:
        # Check target exists and get details for notification
        target = conn.execute("SELECT Type, Name, Year, Month, TargetAmount FROM Targets WHERE TargetID = ?", (target_id,)).fetchone()
        if not target:
            return jsonify({"error": "Target not found."}), 404
        
        conn.execute("DELETE FROM Targets WHERE TargetID = ?", (target_id,))
        conn.commit()
        
        # Add notification
        admin_notifications.insert(0, {
            "id": int(datetime.datetime.now().timestamp() * 1000),
            "title": "Target Deleted",
            "message": f"Target of ${target['TargetAmount']:,.2f} for {target['Name']} ({target['Month']} {target['Year']}) was deleted.",
            "time": "Just now",
            "read": False
        })
        return jsonify({"success": True, "message": "Target deleted successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
