import re
import os

def convert_md_to_html(md_path, html_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md = f.read()

    # Parse headers
    html = md
    html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.*?)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)

    # Parse bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)

    # Parse links
    html = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', html)

    # Parse tables
    def make_table(match):
        lines = match.group(0).strip().split('\n')
        table_html = '<table>\n<thead>\n<tr>\n'
        
        headers = [c.strip() for c in lines[0].split('|')[1:-1]]
        for h in headers:
            table_html += f'<th>{h}</th>\n'
        table_html += '</tr>\n</thead>\n<tbody>\n'
        
        for r in lines[2:]:
            cols = [c.strip() for c in r.split('|')[1:-1]]
            table_html += '<tr>\n'
            for idx, c in enumerate(cols):
                align = ' style="text-align: right;"' if idx in [0, 4] and ('$' in c or c.isdigit()) else ''
                table_html += f'<td{align}>{c}</td>\n'
            table_html += '</tr>\n'
            
        table_html += '</tbody>\n</table>\n'
        return table_html

    table_pattern = re.compile(r'^\|.*?\|\n\|[-:| ]*?\|\n(?:\|.*?\|\n?)+', re.MULTILINE)
    html = table_pattern.sub(make_table, html)

    # Parse lists
    html = re.sub(r'^- \[(x| )\] (.*?)$', lambda m: f'<div class="todo-item"><input type="checkbox" disabled {"checked" if m.group(1)=="x" else ""}> <span>{m.group(2)}</span></div>', html, flags=re.MULTILINE)
    html = re.sub(r'^- (.*?)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    # Wrap lists
    html = re.sub(r'(<li>.*?</li>\n?)+', lambda m: f'<ul>\n{m.group(0)}</ul>\n', html, flags=re.DOTALL)

    # Clean up linebreaks and wrap paragraphs
    paragraphs = []
    current_block = []
    
    for line in html.split('\n'):
        line_strip = line.strip()
        if not line_strip:
            if current_block:
                block_content = '\n'.join(current_block)
                if not block_content.startswith(('<h', '<ul', '<table', '<div', '<hr', '<!--')):
                    paragraphs.append(f'<p>{block_content}</p>')
                else:
                    paragraphs.append(block_content)
                current_block = []
        else:
            if line_strip.startswith(('<h', '<ul', '<table', '<div', '<hr', '<!--')):
                if current_block:
                    paragraphs.append(f'<p>{" ".join(current_block)}</p>')
                    current_block = []
                paragraphs.append(line)
            else:
                current_block.append(line)
                
    if current_block:
        block_content = '\n'.join(current_block)
        if not block_content.startswith(('<h', '<ul', '<table', '<div', '<hr', '<!--')):
            paragraphs.append(f'<p>{block_content}</p>')
        else:
            paragraphs.append(block_content)
            
    body_content = '\n'.join(paragraphs)

    # Wrap in fully styled document
    styled_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PharmaLytics Project Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <style>
        :root {{
            --bg-primary: #f8fafc;
            --bg-card: #ffffff;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --primary: #164E63;
            --primary-dark: #0F3D4C;
            --accent-blue: #0ea5e9;
            --accent-green: #10b981;
            --accent-red: #ef4444;
            --border-color: #e2e8f0;
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 3rem 2rem;
        }}
        
        .report-container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 4rem;
            box-shadow: var(--shadow-md);
            position: relative;
        }}
        
        .no-print.print-btn {{
            position: absolute;
            top: 2rem;
            right: 2rem;
            padding: 0.75rem 1.5rem;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 700;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: background 0.2s, transform 0.1s;
            box-shadow: 0 4px 12px rgba(22, 78, 99, 0.2);
        }}
        
        .no-print.print-btn:hover {{
            background: var(--primary-dark);
            transform: translateY(-1px);
        }}
        
        .no-print.print-btn:active {{
            transform: translateY(0);
        }}
        
        h1 {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 2rem;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 1rem;
            letter-spacing: -0.03em;
        }}
        
        h2 {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-dark);
            margin-top: 2.5rem;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
        }}
        
        h3 {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-top: 1.75rem;
            margin-bottom: 0.75rem;
        }}
        
        p {{
            margin-bottom: 1.25rem;
            color: var(--text-secondary);
            font-size: 0.975rem;
            text-align: justify;
        }}
        
        ul {{
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
        }}
        
        li {{
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.95rem;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            font-size: 0.9rem;
        }}
        
        th, td {{
            border: 1px solid var(--border-color);
            padding: 0.75rem 1rem;
            text-align: left;
        }}
        
        th {{
            background: var(--bg-primary);
            color: var(--text-primary);
            font-weight: 700;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }}
        
        td {{
            color: var(--text-secondary);
        }}
        
        tr:nth-child(even) td {{
            background: #fafbfd;
        }}
        
        hr {{
            border: 0;
            height: 1px;
            background: var(--border-color);
            margin: 2.5rem 0;
        }}
        
        .todo-item {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
            color: var(--text-secondary);
        }}
        
        .todo-item input {{
            accent-color: var(--accent-green);
        }}
        
        .todo-item span {{
            vertical-align: middle;
        }}
        
        a {{
            color: var(--accent-blue);
            text-decoration: none;
            font-weight: 500;
        }}
        
        a:hover {{
            text-decoration: underline;
        }}
        
        /* Hide visuals carousel slides for print standard layout */
        .carousel-container {{
            margin: 2rem 0;
        }}
        
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .report-container {{
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }}
            .no-print {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <button class="no-print print-btn" onclick="window.print()">
            <i class="ph ph-printer"></i> Save as PDF / Print
        </button>
        {body_content}
    </div>
</body>
</html>
"""

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(styled_html)

if __name__ == '__main__':
    md_file = '/home/shubhajit/.gemini/antigravity/brain/19eb7f54-0ce0-4f9e-b759-71fbe2bbdca5/project_report.md'
    html_file = '/home/shubhajit/Desktop/proc dna project/PharmaLytics_Project_Report.html'
    convert_md_to_html(md_file, html_file)
    print("Report compiled successfully!")
