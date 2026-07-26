import pandas as pd
import sqlite3
import os

def clean_and_load_data(excel_path, db_path, schema_path):
    print("=== Phase 3: Validating Data Load Flow ===")
    
    # 1. Read Excel
    print("[1/9] Reading Excel file...")
    try:
        # Assuming data is in the second sheet (index 1) based on previous exploration
        df = pd.read_excel(excel_path, sheet_name=1)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    # 2. Clean column names
    print("[2/9] Cleaning column names...")
    df.columns = df.columns.str.strip()

    # 3. Clean categorical values
    print("[3/9] Cleaning categorical values...")
    str_cols = df.select_dtypes(include=['object']).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()

    # 4. Handle missing values & 5. Convert data types
    print("[4/9 & 5/9] Handling missing values and converting data types...")
    num_cols = ['Quantity', 'Price', 'Sales']
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Optional: ensure Year is integer
    if 'Year' in df.columns:
        df['Year'] = pd.to_numeric(df['Year'], errors='coerce').fillna(0).astype(int)

    # 6. Create database
    print("[6/9] Creating database connection...")
    if os.path.exists(db_path):
        os.remove(db_path) # Remove old db to start fresh
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 7. Execute schema.sql
    print("[7/9] Executing schema.sql...")
    try:
        with open(schema_path, 'r') as f:
            schema_script = f.read()
        cursor.executescript(schema_script)
        conn.commit()
    except Exception as e:
        print(f"Error executing schema.sql: {e}")
        conn.close()
        return

    # 8. Insert data
    print("[8/9] Inserting data into normalized tables...")
    
    # Prepare Dimension Tables (Generating IDs implicitly via index)
    # Regions
    regions_df = df[['City', 'Country', 'Latitude', 'Longitude']].drop_duplicates().reset_index(drop=True)
    regions_df.index += 1  # 1-based indexing
    regions_df.index.name = 'RegionID'
    
    # Doctors
    doctors_df = df[['Customer Name', 'Distributor', 'Channel', 'Sub-channel']].drop_duplicates().reset_index(drop=True)
    doctors_df.index += 1
    doctors_df.index.name = 'DoctorID'
    doctors_df = doctors_df.rename(columns={'Customer Name': 'CustomerName', 'Sub-channel': 'SubChannel'})
    
    # Drugs
    drugs_df = df[['Product Name', 'Product Class']].drop_duplicates().reset_index(drop=True)
    drugs_df.index += 1
    drugs_df.index.name = 'DrugID'
    drugs_df = drugs_df.rename(columns={'Product Name': 'ProductName', 'Product Class': 'ProductClass'})
    
    # SalesReps
    reps_df = df[['Name of Sales Rep', 'Manager', 'Sales Team']].drop_duplicates().reset_index(drop=True)
    reps_df.index += 1
    reps_df.index.name = 'RepID'
    reps_df = reps_df.rename(columns={'Name of Sales Rep': 'RepName', 'Sales Team': 'SalesTeam'})
    
    # Fact Table (Mapping IDs)
    fact_df = df.merge(regions_df.reset_index(), on=['City', 'Country', 'Latitude', 'Longitude'], how='left')
    fact_df = fact_df.merge(doctors_df.reset_index().rename(columns={'CustomerName': 'Customer Name', 'SubChannel': 'Sub-channel'}), 
                            on=['Customer Name', 'Distributor', 'Channel', 'Sub-channel'], how='left')
    fact_df = fact_df.merge(drugs_df.reset_index().rename(columns={'ProductName': 'Product Name', 'ProductClass': 'Product Class'}), 
                            on=['Product Name', 'Product Class'], how='left')
    fact_df = fact_df.merge(reps_df.reset_index().rename(columns={'RepName': 'Name of Sales Rep', 'SalesTeam': 'Sales Team'}), 
                            on=['Name of Sales Rep', 'Manager', 'Sales Team'], how='left')

    fact_sales = fact_df[['RegionID', 'DoctorID', 'DrugID', 'RepID', 'Month', 'Year', 'Quantity', 'Price', 'Sales']]
    fact_sales = fact_sales.rename(columns={'Sales': 'TotalSales'})
    fact_sales.index += 1
    fact_sales.index.name = 'SalesID'

    # Insert into database using append so it respects the schema
    regions_df.to_sql('Regions', conn, if_exists='append', index=False)
    doctors_df.to_sql('Doctors', conn, if_exists='append', index=False)
    drugs_df.to_sql('Drugs', conn, if_exists='append', index=False)
    reps_df.to_sql('SalesReps', conn, if_exists='append', index=False)
    fact_sales.to_sql('Sales', conn, if_exists='append', index=False)
    
    # 9. Verify row counts
    print("[9/9] Verifying row counts...")
    tables = ['Regions', 'Doctors', 'Drugs', 'SalesReps', 'Sales']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  - {table} table has {count} rows.")

    conn.commit()
    conn.close()
    print("\nData load and validation completed successfully!")

if __name__ == "__main__":
    base_dir = "/home/shubhajit/Desktop/proc dna project"
    excel_file = os.path.join(base_dir, "Pharma_data_analysis.xlsx")
    db_file = os.path.join(base_dir, "analytics.db")
    schema_file = os.path.join(base_dir, "schema.sql")
    
    if not os.path.exists(excel_file):
        print(f"Error: Dataset not found at {excel_file}")
    elif not os.path.exists(schema_file):
        print(f"Error: Schema file not found at {schema_file}")
    else:
        clean_and_load_data(excel_file, db_file, schema_file)
