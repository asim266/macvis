---
name: Data Analysis
description: Clean, analyze, and visualize datasets (pandas/CSV).
when_to_use: Exploring, cleaning, analyzing, or charting tabular data.
icon: 📊
---

# Data Analysis

## Load & inspect
- `pandas`: `df = pd.read_csv(path)`. First: `df.shape`, `df.info()`, `df.head()`, `df.describe()`, `df.isna().sum()`.
- Note dtypes and parse dates/numerics explicitly.

## Clean
- Handle missing values deliberately (drop vs impute — state which and why).
- Fix dtypes, strip/normalize strings, dedupe, remove obvious outliers (and document the rule).

## Analyze
- Group/aggregate (`groupby().agg()`), pivot, correlate. State the question before the query.
- Quantify findings (counts, %, deltas) — don't hand-wave.

## Visualize
- `matplotlib`/`plotly` for charts; label axes and units. One message per chart.
- For spreadsheets the user can open, use the **xlsx** skill to emit a formatted workbook.

## Report
- Lead with the answer, then the evidence. Note data caveats (sample size, missingness, date range).
