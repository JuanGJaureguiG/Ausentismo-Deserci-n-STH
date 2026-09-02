# Tablero de Ausentismo y Deserción — UNIMINUTO Sede Tolima-Huila

Tablero de control interactivo construido a partir de
`3__Historico_Ausentismo_y_Deserción_STH_31-8-2026_1.xlsx`.

## Contenido

```
index.html      → estructura de la página
styles.css      → estilos (mismos tokens visuales que el tablero de Estudiantes)
app.js          → filtros, agregación y gráficos (Chart.js)
data.json       → series oficiales por Centro Universitario
build_data.py   → script que genera data.json a partir del Excel fuente
```

## Alcance de este tablero

Este archivo trae únicamente las hojas **"Ausentismo CU"** y **"Deserción CU"**:
series ya calculadas por la universidad, por Centro Universitario y periodo
(2012-2 a 2026-2). No incluye el detalle por programa académico, así que este
tablero muestra solo comparativos por CU (evolución histórica y promedio),
sin tabla de programas ni alertas de "programas críticos".

## Filtros disponibles

- **Año** — filtra el rango de periodos mostrado en ambos gráficos.
- **Centro Universitario** — sin selección, el gráfico de evolución muestra el
  total de la Sede Tolima-Huila; al seleccionar uno o más CU, se comparan esos.

Un interruptor arriba del tablero cambia entre **Ausentismo** y **Deserción**;
los filtros aplican a ambas vistas.

## Actualizar los datos

1. Reemplaza la ruta `SRC` en `build_data.py` por el nuevo Excel.
2. `python3 build_data.py` (requiere `pip install openpyxl`).
3. Sube el nuevo `data.json` al repositorio.

Si en el futuro vuelves a tener el detalle por programa (hojas "Ausentismo
Programas" / "Deserción Programas"), avísame y retomamos la versión con tabla
de detalle y alertas de programas críticos.

## Publicar / actualizar en GitHub Pages

Sigue el mismo proceso que usaste para el tablero de Estudiantes: sube estos
archivos a un repositorio y activa GitHub Pages en Settings → Pages.
