/* ------------------------------------------------------------------
   Tablero de control — Ausentismo y Deserción (por Centro Universitario)
   UNIMINUTO Sede Tolima-Huila
------------------------------------------------------------------- */

const PALETTE = {
  accent: '#E2962B', teal: '#2F7A6D', ink: '#16324F', purple: '#8A5FBF',
  danger: '#C1432B', grid: '#EDEFEC', muted: '#6B7280'
};
const CU_COLORS = {
  'Sede Tolima-Huila': '#16324F', 'Ibagué': '#E2962B', 'Neiva': '#2F7A6D',
  'Garzón': '#C1432B', 'Pitalito': '#8A5FBF', 'Lérida': '#5294E2',
  'La Dorada': '#E84393', 'Líbano': '#7A9E7E'
};

let DATA = null;
let metric = 'ausentismo'; // 'ausentismo' | 'desercion'
let state = { cu: new Set(), anio: new Set(), semestre: new Set() };
let charts = {};

async function boot() {
  const res = await fetch('data.json');
  DATA = await res.json();
  buildSidebar();
  document.getElementById('tab-ausentismo').addEventListener('click', () => setMetric('ausentismo'));
  document.getElementById('tab-desercion').addEventListener('click', () => setMetric('desercion'));
  render();
}

function setMetric(m) {
  metric = m;
  document.getElementById('tab-ausentismo').classList.toggle('active', m === 'ausentismo');
  document.getElementById('tab-desercion').classList.toggle('active', m === 'desercion');
  render();
}

/* ---------------- sidebar ---------------- */

function toggleSet(set, val, el) {
  if (set.has(val)) { set.delete(val); el.classList.remove('active'); }
  else { set.add(val); el.classList.add('active'); }
  render();
}

function chipGroup(values, set) {
  const wrap = document.createElement('div');
  wrap.className = 'chip-list';
  values.forEach(v => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = v;
    chip.addEventListener('click', () => toggleSet(set, v, chip));
    wrap.appendChild(chip);
  });
  return wrap;
}

function makeGroup(title, contentEl, open = false) {
  const details = document.createElement('details');
  details.className = 'filter-group';
  details.open = open;
  const summary = document.createElement('summary');
  summary.innerHTML = `<span>${title}</span>`;
  details.appendChild(summary);
  details.appendChild(contentEl);
  return details;
}

function buildSidebar() {
  const sidebar = document.getElementById('sidebar');

  const anios = [...new Set(DATA.cu_periods.map(p => p.slice(0, 4)))].sort();
  sidebar.appendChild(makeGroup('Año', chipGroup(anios, state.anio), true));

  const semWrap = document.createElement('div');
  semWrap.className = 'chip-list';
  [['1', 'Semestre 1'], ['2', 'Semestre 2']].forEach(([val, label]) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = label;
    chip.addEventListener('click', () => toggleSet(state.semestre, val, chip));
    semWrap.appendChild(chip);
  });
  sidebar.appendChild(makeGroup('Semestre', semWrap, true));

  const cus = Object.keys(DATA.cu_series.ausentismo).filter(k => k !== 'Sede Tolima-Huila').sort();
  sidebar.appendChild(makeGroup('Centro Universitario', chipGroup(cus, state.cu), true));

  document.getElementById('clear-all').addEventListener('click', () => {
    state.cu.clear(); state.anio.clear(); state.semestre.clear();
    document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));
    render();
  });
}

function periodMatches(p) {
  const [year, sem] = p.split('-');
  if (state.anio.size && !state.anio.has(year)) return false;
  if (state.semestre.size && !state.semestre.has(sem)) return false;
  return true;
}

/* ---------------- charts ---------------- */

const baseGrid = { color: PALETTE.grid, drawBorder: false };
const baseFont = { family: "'IBM Plex Sans', sans-serif", size: 11 };

const dataLabelsPlugin = {
  id: 'dataLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const type = chart.config.type;
    if (type !== 'bar' && type !== 'line') return;
    const horizontal = chart.options.indexAxis === 'y';
    const nSeries = chart.data.datasets.filter(d => !d.hidden).length;

    // con una sola serie mostramos todas las etiquetas (escalonadas si hay muchos puntos);
    // con varias series reducimos cuántos puntos se etiquetan por serie para que no se amontonen,
    // pero siempre se dibuja algo (antes, con muchas series, no se dibujaba ninguna etiqueta).
    const skip = nSeries <= 1 ? 1 : nSeries === 2 ? 2 : 3;

    chart.data.datasets.forEach((dataset, dsIndex) => {
      const meta = chart.getDatasetMeta(dsIndex);
      if (meta.hidden) return;
      const nPoints = dataset.data.length;
      const shownCount = Math.ceil(nPoints / skip);
      const rows = shownCount > 15 ? 3 : shownCount > 8 ? 2 : 1;
      const rowOffsets = [12, 26, 40].slice(0, rows);

      meta.data.forEach((el, i) => {
        const value = dataset.data[i];
        if (value === null || value === undefined) return;
        if (skip > 1 && i % skip !== 0 && i !== nPoints - 1) return;

        ctx.save();
        ctx.font = (type === 'line' && rows > 1) ? "600 9.5px 'IBM Plex Sans', sans-serif" : "600 10px 'IBM Plex Sans', sans-serif";
        ctx.fillStyle = type === 'line' ? (dataset.borderColor || PALETTE.ink) : PALETTE.ink;
        ctx.textBaseline = 'middle';
        const pos = el.tooltipPosition();
        if (type === 'line') {
          ctx.textAlign = 'center';
          const shownIdx = Math.floor(i / skip);
          const yOffset = rowOffsets[shownIdx % rows];
          ctx.fillText(value.toFixed(2) + '%', pos.x, pos.y - yOffset);
        } else if (horizontal) {
          ctx.textAlign = 'left';
          ctx.fillText(value.toFixed(2) + '%', pos.x + 6, pos.y);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(value.toFixed(2) + '%', pos.x, pos.y - 10);
        }
        ctx.restore();
      });
    });
  }
};
if (typeof Chart !== 'undefined') Chart.register(dataLabelsPlugin);

function ensureChart(id, config) {
  const ctx = document.getElementById(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, config);
}

function render() {
  const periods = DATA.cu_periods.filter(periodMatches);
  const cuSeries = DATA.cu_series[metric];
  const idxList = periods.map(p => DATA.cu_periods.indexOf(p));

  document.getElementById('metric-title').textContent = metric === 'ausentismo' ? 'Ausentismo' : 'Deserción';

  if (!periods.length) {
    document.getElementById('content-body').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    return;
  }
  document.getElementById('content-body').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';

  // Evolución: sin CU seleccionado se muestra el total de la Sede; si se elige alguno, esos.
  const evoKeys = state.cu.size ? [...state.cu] : ['Sede Tolima-Huila'];
  const evoDatasets = evoKeys.map(k => ({
    label: k,
    data: idxList.map(i => cuSeries[k][i]),
    borderColor: CU_COLORS[k] || PALETTE.muted,
    backgroundColor: 'transparent',
    pointBackgroundColor: CU_COLORS[k] || PALETTE.muted,
    borderWidth: k === 'Sede Tolima-Huila' ? 3 : 2,
    pointRadius: 3, tension: 0.3, spanGaps: true
  }));
  ensureChart('chart-evolucion', {
    type: 'line',
    data: { labels: periods, datasets: evoDatasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 56 } },
      plugins: { legend: { labels: { font: baseFont, color: PALETTE.ink, boxWidth: 10 } } },
      scales: {
        x: { ticks: { font: baseFont, color: PALETTE.muted, maxRotation: 45, minRotation: 45 }, grid: { display: false } },
        y: { ticks: { font: baseFont, color: PALETTE.muted, callback: v => v + '%' }, grid: baseGrid, min: 0 }
      }
    }
  });

  // Comparativo por CU: si no hay selección se comparan todos; si hay selección, solo esos.
  const barKeys = state.cu.size ? [...state.cu] : Object.keys(cuSeries).filter(k => k !== 'Sede Tolima-Huila');
  const avgByCu = barKeys.map(k => {
    const vals = idxList.map(i => cuSeries[k][i]).filter(v => v !== null && v !== undefined);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { k, avg };
  }).sort((a, b) => b.avg - a.avg);

  ensureChart('chart-cu-bar', {
    type: 'bar',
    data: {
      labels: avgByCu.map(e => e.k),
      datasets: [{ data: avgByCu.map(e => e.avg), backgroundColor: avgByCu.map(e => CU_COLORS[e.k] || PALETTE.muted), borderRadius: 2, maxBarThickness: 26 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 44 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: baseFont, color: PALETTE.muted, callback: v => v + '%' }, grid: baseGrid, suggestedMax: (Math.max(...avgByCu.map(e => e.avg), 1)) * 1.25 },
        y: { ticks: { font: baseFont, color: PALETTE.muted }, grid: { display: false } }
      }
    }
  });

  // ---- KPIs ----
  const sedeVals = idxList.map(i => cuSeries['Sede Tolima-Huila'][i]).filter(v => v !== null && v !== undefined);
  const scopeVals = evoKeys.length === 1
    ? idxList.map(i => cuSeries[evoKeys[0]][i]).filter(v => v !== null && v !== undefined)
    : sedeVals;

  const avgScope = scopeVals.length ? scopeVals.reduce((a, b) => a + b, 0) / scopeVals.length : null;
  document.getElementById('kpi-tasa').textContent = avgScope !== null ? avgScope.toFixed(1) + '%' : '—';

  const lastVal = [...scopeVals].pop();
  document.getElementById('kpi-ultima').textContent = lastVal !== undefined ? lastVal.toFixed(1) + '%' : '—';

  const mayor = avgByCu[0];
  const menor = avgByCu[avgByCu.length - 1];
  document.getElementById('kpi-mayor').textContent = mayor ? `${mayor.k} (${mayor.avg.toFixed(1)}%)` : '—';
  document.getElementById('kpi-menor').textContent = menor ? `${menor.k} (${menor.avg.toFixed(1)}%)` : '—';
}

boot();
