import pandas as pd

file_path = '/home/shubhajit/Desktop/proc dna project/Pharma_data_analysis.xlsx'
try:
    df_dict = pd.read_excel(file_path, sheet_name=None)
    for name, sheet in df_dict.items():
        print(f"\n================ SHEET: {name} ================\n")
        print("--- HEAD ---")
        print(sheet.head(3))
        print("\n--- INFO ---")
        sheet.info()
        print("\n--- NULL VALUES ---")
        print(sheet.isnull().sum())
except Exception as e:
    print(f"Error: {e}")
