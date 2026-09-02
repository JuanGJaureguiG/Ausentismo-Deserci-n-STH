import openpyxl, json
from collections import OrderedDict

SRC = "/mnt/user-data/uploads/3__Historico_Ausentismo_y_Deserción_STH_31-8-2026_1.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)

CU_NORMALIZE = {'Libano': 'Líbano'}

def sem_fmt(period):
    year, sem = period.split('-')
    return f"{year}-{int(sem)}"

def parse_cu_sheet(sheet_name, value_label):
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    periods = None
    series = OrderedDict()
    i = 0
    while i < len(rows):
        row = rows[i]
        c0 = row[0]
        if c0 and c0 not in (value_label, '% Ausentes', '% Desertores') and not (isinstance(c0, str) and c0.startswith(('Ausente', 'Desertor'))):
            name = CU_NORMALIZE.get(c0, c0)
            if i + 2 < len(rows):
                period_row = rows[i + 1]
                pct_row = rows[i + 2]
                if periods is None:
                    periods = [sem_fmt(p) for p in period_row[1:] if p is not None]
                vals = []
                for p, v in zip(period_row[1:], pct_row[1:]):
                    if p is None:
                        break
                    vals.append(round(v * 100, 2) if isinstance(v, (int, float)) else None)
                series[name] = vals
            i += 3
        else:
            i += 1
    return periods, series

aus_periods, aus_cu_series = parse_cu_sheet('Ausentismo CU', '% Ausentes')
des_periods, des_cu_series = parse_cu_sheet('Deserción CU', '% Desertores')
aus_cu_series['Sede Tolima-Huila'] = aus_cu_series.pop('Sede Tolima - Huila')
des_cu_series['Sede Tolima-Huila'] = des_cu_series.pop('Sede Tolima - Huila')

data = {
    "cu_periods": aus_periods,
    "cu_series": {"ausentismo": aus_cu_series, "desercion": des_cu_series},
    "as_of": "31 de agosto de 2026"
}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

import os
print("data.json size:", os.path.getsize("data.json"), "bytes")
print("periods:", aus_periods[:3], "...", aus_periods[-3:], "(", len(aus_periods), ")")
print("CU keys ausentismo:", list(aus_cu_series.keys()))
print("CU keys desercion:", list(des_cu_series.keys()))
