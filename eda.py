import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def run_eda(file_path):
    print("===========================================")
    print("     PHARMA SALES EDA INITIALIZATION       ")
    print("===========================================\n")
    
    # 1. Load Data
    print("[1/4] Loading Data...")
    try:
        # Loading sheet index 1 which contains the actual data
        df = pd.read_excel(file_path, sheet_name=1)
    except Exception as e:
        print(f"Error loading Excel file: {e}")
        return

    # 2. Data Cleaning
    print("[2/4] Cleaning Data...")
    df.columns = df.columns.str.strip()
    
    # Clean string columns
    str_cols = df.select_dtypes(include=['object']).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
        
    # Handle numeric columns
    num_cols = ['Quantity', 'Price', 'Sales']
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
    # Ensure Year is integer
    if 'Year' in df.columns:
        df['Year'] = pd.to_numeric(df['Year'], errors='coerce').fillna(0).astype(int)

    # Setup output directory
    output_dir = os.path.join(os.path.dirname(file_path), "eda_outputs")
    os.makedirs(output_dir, exist_ok=True)
    
    # Set plotting style
    sns.set_theme(style="whitegrid", palette="muted")
    
    print("[3/4] Performing Analysis...\n")

    # --- Question 1: Which drugs generate the highest revenue? ---
    print("Q1: Which drugs generate the highest revenue?")
    top_drugs = df.groupby('Product Name')['Sales'].sum().reset_index()
    top_drugs = top_drugs.sort_values(by='Sales', ascending=False).head(10)
    print("Answer (Top 5 Drugs):")
    print(top_drugs.head(5).to_string(index=False))
    print("")
    
    # Visualization: Top Drugs
    plt.figure(figsize=(10, 6))
    sns.barplot(data=top_drugs, x='Sales', y='Product Name', palette='viridis')
    plt.title('Top 10 Drugs by Total Revenue')
    plt.xlabel('Total Sales ($)')
    plt.ylabel('Drug Name')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'top_drugs.png'))
    plt.close()

    # --- Question 2: Which regions perform best? ---
    print("Q2: Which regions perform best?")
    if 'Country' in df.columns and 'City' in df.columns:
        region_perf = df.groupby(['Country', 'City'])['Sales'].sum().reset_index()
        region_perf = region_perf.sort_values(by='Sales', ascending=False).head(10)
        best_region = region_perf.iloc[0]
        print(f"Answer: The best performing region is {best_region['City']}, {best_region['Country']} with total sales of ${best_region['Sales']:,.2f}")
        print("\nTop 5 Regions:")
        print(region_perf.head(5).to_string(index=False))
        print("")
        
        # Visualization: Region Performance
        plt.figure(figsize=(12, 6))
        region_perf['Region'] = region_perf['City'] + ", " + region_perf['Country']
        sns.barplot(data=region_perf, x='Sales', y='Region', palette='magma')
        plt.title('Top 10 Regions by Total Revenue')
        plt.xlabel('Total Sales ($)')
        plt.ylabel('Region (City, Country)')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'region_performance.png'))
        plt.close()

    # --- Question 3: Which sales reps perform best? ---
    print("Q3: Which sales reps perform best?")
    if 'Name of Sales Rep' in df.columns:
        rep_perf = df.groupby('Name of Sales Rep')['Sales'].sum().reset_index()
        rep_perf = rep_perf.sort_values(by='Sales', ascending=False).head(10)
        best_rep = rep_perf.iloc[0]
        print(f"Answer: The top performing representative is {best_rep['Name of Sales Rep']} with total sales of ${best_rep['Sales']:,.2f}")
        print("\nTop 5 Representatives:")
        print(rep_perf.head(5).to_string(index=False))
        print("")
        
        # Visualization: Rep Performance
        plt.figure(figsize=(10, 6))
        sns.barplot(data=rep_perf, x='Sales', y='Name of Sales Rep', palette='Blues_r')
        plt.title('Top 10 Sales Representatives')
        plt.xlabel('Total Sales ($)')
        plt.ylabel('Representative Name')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'rep_performance.png'))
        plt.close()

    # --- Question 4: How does revenue change over time? ---
    print("Q4: How does revenue change over time?")
    if 'Month' in df.columns and 'Year' in df.columns:
        # Create a helper mapping for months to sort chronologically
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        
        time_perf = df.groupby(['Year', 'Month'])['Sales'].sum().reset_index()
        time_perf['MonthNum'] = time_perf['Month'].map(month_map)
        time_perf = time_perf.sort_values(by=['Year', 'MonthNum']).reset_index(drop=True)
        time_perf['DateStr'] = time_perf['Year'].astype(str) + "-" + time_perf['MonthNum'].astype(str).str.zfill(2)
        
        print("Answer (Monthly Revenue for the past 6 months):")
        print(time_perf.tail(6)[['DateStr', 'Sales']].to_string(index=False))
        print("")
        
        # Visualization: Monthly Revenue Over Time
        plt.figure(figsize=(14, 6))
        sns.lineplot(data=time_perf, x='DateStr', y='Sales', marker='o', color='royalblue', linewidth=2.5)
        plt.xticks(rotation=45)
        plt.title('Monthly Revenue Trend (2017 - 2020)')
        plt.xlabel('Year-Month')
        plt.ylabel('Total Sales ($)')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'monthly_revenue.png'))
        plt.close()

    # --- Question 5: Is quantity related to revenue? ---
    print("Q5: Is quantity related to revenue?")
    correlation = df['Quantity'].corr(df['Sales'])
    print(f"Answer: Pearson Correlation Coefficient between Quantity and Revenue is {correlation:.4f}")
    if correlation > 0.8:
        print("Conclusion: Strong positive relationship. Quantity sold is highly related to total revenue.")
    elif correlation > 0.5:
        print("Conclusion: Moderate positive relationship. Quantity sold increases revenue, but pricing has a strong impact.")
    else:
        print("Conclusion: Weak relationship. Revenue is heavily driven by price variance rather than unit volume.")
    print("")

    # Visualization: Quantity vs Revenue
    plt.figure(figsize=(10, 6))
    plot_df = df.sample(n=min(5000, len(df)), random_state=42) if len(df) > 5000 else df
    sns.scatterplot(data=plot_df, x='Quantity', y='Sales', alpha=0.5, color='teal')
    sns.regplot(data=plot_df, x='Quantity', y='Sales', scatter=False, color='darkred', line_kws={"linewidth": 2})
    plt.title('Quantity vs. Revenue (Sales)')
    plt.xlabel('Quantity Sold')
    plt.ylabel('Total Revenue ($)')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'quantity_vs_revenue.png'))
    plt.close()

    # --- Question 6: Which products are growing or declining? ---
    print("Q6: Which products are growing or declining?")
    if 'Year' in df.columns and 'Product Name' in df.columns:
        # We look at sales per product in 2017 vs 2020 to compute the growth rate
        pivot_df = df.pivot_table(index='Product Name', columns='Year', values='Sales', aggfunc='sum').fillna(0)
        
        # Check if we have 2017 and 2020 data
        if 2017 in pivot_df.columns and 2020 in pivot_df.columns:
            pivot_df['Growth_Value'] = pivot_df[2020] - pivot_df[2017]
            # Avoid division by zero
            pivot_df['Growth_Pct'] = (pivot_df['Growth_Value'] / pivot_df[2017].replace(0, 1)) * 100
            
            # Sort to find growing and declining
            growing = pivot_df.sort_values(by='Growth_Pct', ascending=False).head(5)
            declining = pivot_df.sort_values(by='Growth_Pct', ascending=True).head(5)
            
            print("Top 5 Growing Products (2017 vs 2020 by % Growth):")
            print(growing[[2017, 2020, 'Growth_Pct']].to_string())
            print("\nTop 5 Declining Products (2017 vs 2020 by % Growth):")
            print(declining[[2017, 2020, 'Growth_Pct']].to_string())
            print("")
        else:
            print("Growth analysis requires both 2017 and 2020 data in the dataset.")
            print("")

    print("[4/4] Visualizations successfully saved to 'eda_outputs' directory!")
    print("\nEDA Completed.")

if __name__ == "__main__":
    file_path = "/home/shubhajit/Desktop/proc dna project/Pharma_data_analysis.xlsx"
    if not os.path.exists(file_path):
        print(f"Error: Dataset not found at {file_path}")
    else:
        run_eda(file_path)
