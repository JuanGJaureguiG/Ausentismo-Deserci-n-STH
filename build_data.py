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
                    # el primer bloque (Sede) define la lista maestra de periodos
                    periods = [sem_fmt(p) for p in period_row[1:] if p is not None]
                # cada bloque tiene el mismo número de columnas que el bloque maestro,
                # alineadas por posición: si un CU aún no reportaba en ese periodo,
                # la columna viene vacía (None) mientras que las posteriores sí traen dato.
                # No se debe cortar la lectura en el primer None: hay que recorrer
                # todas las columnas y dejar None solo donde realmente no hay valor.
                vals = []
                for j in range(len(periods)):
                    v = pct_row[1 + j] if (1 + j) < len(pct_row) else None
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

# Se descarta todo lo anterior a 2014-1: la información de esos primeros
# periodos (2012-2 a 2013-2) no es relevante para el análisis actual.
CUTOFF = '2014-1'
def apply_cutoff(periods, series):
    start = periods.index(CUTOFF) if CUTOFF in periods else 0
    trimmed_periods = periods[start:]
    trimmed_series = {k: v[start:] for k, v in series.items()}
    return trimmed_periods, trimmed_series

aus_periods, aus_cu_series = apply_cutoff(aus_periods, aus_cu_series)
des_periods, des_cu_series = apply_cutoff(des_periods, des_cu_series)

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
