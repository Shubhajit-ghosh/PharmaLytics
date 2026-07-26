# Pharmaceutical Sales Analytics Dashboard

A professional, data-driven pharmaceutical sales analytics application built for Business Analysts and Executives. The dashboard provides dynamic KPIs, regional sales breakdowns, representative tracking, and future revenue forecasting by executing SQL queries against a structured SQLite database.

## 1. Business Problem
A multinational pharmaceutical company wants to understand which medicines, geographic regions, and sales representatives perform best. They require a data system to identify top-performing drug lines, flag underperforming territories, analyze doctor-wise prescription volume, and forecast future revenue to assist in supply chain and sales planning.

## 2. Dataset
The project analyzes the **Kaggle Pharmaceutical Sales Dataset**, consisting of **254,082 sales records** spanning from 2017 to 2020 across Germany and Poland. Key variables include transaction dates (Month, Year), customer details (Customer Name, Distributor, Channel, Sub-channel), product info (Product Name, Product Class), regional metadata (City, Country, Lat/Lng coordinates), sales rep details (Name, Manager, Team), and transaction metrics (Quantity, Price, and calculated Sales Revenue).

## 3. Architecture
The project is built around a standard **Star Schema** analytics data pipeline:

```
┌─────────────────────┐
│  Raw Excel Dataset  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    load_data.py     │  <-- Clean column names, fill missing values, enforce types
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    analytics.db     │  <-- Normalized Star Schema (Fact: Sales | Dims: Drugs, Reps, etc.)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   Flask Backend     │  <-- Parameterized SQL Query Builders (app.py)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  JS Frontend Client │  <-- Fetch API, chart binding, interactive filtering (app.js)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   HTML5 Dashboard   │  <-- Light/Dark Themes & Font Size adjustments (index.html)
└─────────────────────┘
```

## 4. Tech Stack
*   **Database**: SQLite 3 (relational, serverless, supporting CTEs and Window Functions).
*   **Backend**: Python 3, Flask (RESTful API, SQL mapping).
*   **Data Prep**: Python (Pandas, Openpyxl).
*   **Frontend**: Vanilla HTML5, Vanilla CSS (Premium Light/Dark themes, responsive grids), Vanilla JavaScript (fetch API, Chart.js).

## 5. Database Schema (Star Schema)
To optimize query performance and reduce redundancy, the data is normalized:
*   **`Sales` (Fact)**: `SalesID` (PK), `RegionID` (FK), `DoctorID` (FK), `DrugID` (FK), `RepID` (FK), `Month`, `Year`, `Quantity`, `Price`, `TotalSales`.
*   **`Regions` (Dim)**: `RegionID` (PK), `City`, `Country`, `Latitude`, `Longitude`.
*   **`Doctors` (Dim)**: `DoctorID` (PK), `CustomerName`, `Distributor`, `Channel`, `SubChannel`.
*   **`Drugs` (Dim)**: `DrugID` (PK), `ProductName`, `ProductClass`.
*   **`SalesReps` (Dim)**: `RepID` (PK), `RepName`, `Manager`, `SalesTeam`.

## 6. SQL Analysis & Advanced KPI Queries
The project implements advanced SQL query mechanics (located in `kpi_queries.sql`):
*   **JOINs & CTEs**: To aggregate sales volume and correlate variables across fact and dimensions.
*   **Window Functions (`LAG()`)**: To compare current month sales to previous month sales for Month-over-Month (MoM) revenue growth percentage.
*   **Window Functions (`RANK()`)**: Partitioned by geography to list the top-selling drugs in each region.
*   **Window Functions (`DENSE_RANK()`)**: Ordered by revenue to rank sales representatives globally.

## 7. Python EDA
The standalone script `eda.py` utilizes Pandas, Matplotlib, and Seaborn to conduct Exploratory Data Analysis. It answers:
1.  **Top Drugs**: Finds highest revenue generators.
2.  **Top Regions**: Ranks territories by sales volume.
3.  **Representative Performance**: Lists bottom 5 and top 10 representatives.
4.  **Quantity vs. Revenue Correlation**: Performs Pearson correlation checking (`0.8995`, indicating a strong positive relationship).
5.  **Growth Rates**: Compares product sales (2017 vs. 2020) to identify growing (e.g., Tetratanyl: +452%) and declining lines (e.g., Zyvance: -62%).
*Visualizations are exported directly to `eda_outputs/`.*

## 8. Forecasting Method
*   **Methodology**: Historical monthly revenue is plotted from actual database sales records, while future months are estimated using a **3-month average growth linear trend**.
*   **Formula**: Future sales are projected by extrapolating the rolling monthly growth rate over the last quarter.
*   **Visualization**: The line chart visually distinguishes **Actual Revenue** (Solid Line) from **Forecast** (Dashed Line) so predicted values are not confused with historical facts.

## 9. API Endpoints (`backend/app.py`)
All endpoints accept optional query filters `?country=X` and `?year=Y` to enable interactive dashboard filtering.

| Endpoint | Method | Purpose | Sample Response |
| :--- | :--- | :--- | :--- |
| `/api/kpis` | GET | Fetches overall KPIs (Revenue, Units, Reps, Top Location) | `{"total_revenue": 11798987642, "total_units": 28678778, ...}` |
| `/api/revenue-trend` | GET | Historical monthly revenue timeline | `{"labels": ["2017-01", ...], "data": [151872184, ...]}` |
| `/api/forecast` | GET | Forecasted monthly sales values (next 3 months) | `{"labels": ["2020-12", ...], "data": [306284161, ...]}` |
| `/api/region-performance`| GET | Geographic sales distribution by country | `{"labels": ["Germany", "Poland"], "data": [11118107840, ...]}` |
| `/api/top-drugs` | GET | Top 5 drug sales | `{"labels": ["Ionclotide", "Tetratanyl", ...], "data": [169083391, ...]}` |
| `/api/rep-performance` | GET | Sales representative ranking table data | `[{"name": "Jimmy Grey", "manager": "Alisha", "team": "Charlie", "sales": 985969993}, ...]` |

## 10. How to Run the Project
1.  Ensure you have Python 3 and virtual environment tools installed.
2.  Install dependencies:
    ```bash
    pip install pandas openpyxl matplotlib seaborn flask
    ```
3.  Clean the Excel data and load it into the normalized SQLite database:
    ```bash
    python3 load_data.py
    ```
4.  Start the backend application server:
    ```bash
    python3 backend/app.py
    ```
5.  Open your web browser and navigate to:
    **http://localhost:8080**

## 11. Key Business Insights
*   **Drug Concentration**: A single drug, *Ionclotide*, accounts for the largest share of revenue (\$169M), posing a concentration risk. Conversely, *Tetratanyl* shows massive growth (+452.9%), emerging as a key product line.
*   **Geographic Focus**: Germany dominates the sales footprint (\$11.1B vs \$0.68B in Poland). *Butzbach, Germany* is the top-performing city.
*   **Average Order Profile**: The average price per unit across the catalog sits around **\$411.42**, indicating a highly premium product inventory.
