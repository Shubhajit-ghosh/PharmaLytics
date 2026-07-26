import zipfile
import xml.etree.ElementTree as ET

file_path = '/home/shubhajit/Desktop/proc dna project/Pharma_data_analysis.xlsx'

try:
    with zipfile.ZipFile(file_path, 'r') as z:
        # Get shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            with z.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns_prefix = root.tag.split('}')[0] + '}' if '}' in root.tag else ''
                for si in root.findall(f'.//{ns_prefix}si'):
                    t = si.find(f'.//{ns_prefix}t')
                    if t is not None:
                        shared_strings.append(t.text)
                    else:
                        shared_strings.append('')

        # Iterate all sheets
        for name in z.namelist():
            if name.startswith('xl/worksheets/sheet'):
                print(f"\n================ SHEET: {name} ================\n")
                with z.open(name) as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns_prefix = root.tag.split('}')[0] + '}' if '}' in root.tag else ''
                    rows = root.findall(f'.//{ns_prefix}row')
                    
                    printed = 0
                    for row in rows:
                        row_data = []
                        for c in row.findall(f'.//{ns_prefix}c'):
                            v = c.find(f'{ns_prefix}v')
                            if v is not None:
                                val = v.text
                                if c.get('t') == 's':  # shared string
                                    val = shared_strings[int(val)]
                                row_data.append(val)
                            else:
                                row_data.append('')
                        
                        # Only print non-empty rows
                        if any(str(x).strip() for x in row_data):
                            print(row_data)
                            printed += 1
                        if printed >= 5:
                            break
except Exception as e:
    print(f"Error: {e}")
