import json
import re
from pathlib import Path

import pandas as pd


SOURCE = Path('/private/tmp/ming_children.html')
OUTPUT = Path('data/ming_children.json')


def clean(value):
    if pd.isna(value):
        return ''
    return re.sub(r'\s+', ' ', str(value)).strip()


tables = pd.read_html(SOURCE)
df = tables[0].copy()
df.columns = ['parent', 'order', 'name_life', 'sex', 'title', 'mother', 'notes']
df['parent'] = df['parent'].ffill()

records = []
for _, row in df.iterrows():
    parent = clean(row['parent'])
    raw = clean(row['name_life'])
    sex = clean(row['sex'])
    if parent == '君主' or sex not in {'男', '女'}:
        continue

    # The source combines the personal name and life years in one cell.
    match = re.match(r'^(.*?)(?:(\d{3,4}年|\?|？|\d{3,4}年代\？?)\s*[－—-]\s*(\d{3,4}年|\?|？))$', raw)
    if match:
        name = clean(match.group(1))
        birth = clean(match.group(2)).replace('？', '?').replace('年', '')
        death = clean(match.group(3)).replace('？', '?').replace('年', '')
    else:
        name = raw
        birth = ''
        death = ''

    order = ''
    if not pd.isna(row['order']):
        try:
            order = int(float(row['order']))
        except (TypeError, ValueError):
            order = clean(row['order'])

    records.append({
        'parent': parent,
        'order': order,
        'name': name,
        'birth': birth,
        'death': death,
        'sex': sex,
        'title': clean(row['title']),
        'mother': clean(row['mother']),
        'notes': clean(row['notes']),
        'source_url': 'https://zh.wikipedia.org/wiki/%E6%98%8E%E6%9C%9D%E5%90%9B%E4%B8%BB%E5%AD%90%E5%A5%B3%E5%88%97%E8%A1%A8',
        'primary_source': '《明史》卷116—121（诸王、公主）',
        'confidence': '中' if birth and death and '?' not in birth + death else '低',
    })

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'wrote {len(records)} records to {OUTPUT}')
