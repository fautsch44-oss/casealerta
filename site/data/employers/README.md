# OFLC H-2A / H-2B employer data — status

Retrieval attempt: 2026-10-20
Status: **NOT YET RETRIEVED.** No data rows are in this folder yet. No data was invented.

## Target files (official U.S. DOL OFLC disclosure data, public)

Fetch these in a real browser. Each one is an `.xlsx` file of about 10–40 MB.

| Program | Fiscal year | Official URL | Note |
|---|---|---|---|
| H-2A | FY2025 (full year) | https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-2A_Disclosure_Data_FY2025_Q4.xlsx | Name follows the confirmed `PERM_Disclosure_Data_FY2025_Q4.xlsx` pattern in the same folder |
| H-2B | FY2025 (full year) | https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-2B_Disclosure_Data_FY2025_Q4.xlsx | Same pattern |
| H-2A | FY2026 (year to date, through Q3) | https://www.dol.gov/media/H-2A_Disclosure_Data_FY2026_Q3.xlsx | Q3 is the latest release; it replaces Q1 |
| H-2B | FY2026 (year to date, through Q3) | https://www.dol.gov/media/H-2B_Disclosure_Data_FY2026_Q3.xlsx | Exact URL confirmed by analytics.usa.gov download logs |

If a link returns 404, open the landing page and click the link under "Disclosure Data":
https://www.dol.gov/agencies/eta/foreign-labor/performance

How sure we are about each URL:
- The H-2B FY2026 Q3 URL is confirmed. It appears in the DOL download log at https://analytics.usa.gov/data/labor/top-downloads-yesterday.csv.
- The other three URLs follow DOL's naming pattern but are not yet confirmed. The FY2025 Q4 files sit in `/sites/dolgov/files/ETA/oflc/pdfs/` because `PERM_Disclosure_Data_FY2025_Q4.xlsx` is confirmed there. The FY2026 Q3 files sit in `/media/` because the confirmed H-2B, PERM and LCA files for FY2026 Q3 are there.

Record layouts (official, read successfully):
- https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-2A_Record_Layout_FY2025_Q4.pdf — the worker count is `TOTAL_WORKERS_H-2A_CERTIFIED`. The period is Oct 1, 2024 – Sep 30, 2025.
- https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-2B_Record_Layout_FY2025_Q4.pdf — the worker count is `TOTAL_WORKERS_CERTIFIED`. The period is the same.

## How to load the files once they are downloaded

```
pip install openpyxl --break-system-packages
python3 -I normalize_oflc_h2.py H-2A 2025 /path/H-2A_Disclosure_Data_FY2025_Q4.xlsx
python3 -I normalize_oflc_h2.py H-2B 2025 /path/H-2B_Disclosure_Data_FY2025_Q4.xlsx
python3 -I normalize_oflc_h2.py H-2A 2026 /path/H-2A_Disclosure_Data_FY2026_Q3.xlsx
python3 -I normalize_oflc_h2.py H-2B 2026 /path/H-2B_Disclosure_Data_FY2026_Q3.xlsx
```

This writes `raw_h2a_2025.csv`, `raw_h2b_2025.csv`, `raw_h2a_2026.csv` and `raw_h2b_2026.csv`. Each file has these columns:
`case_number, program, fiscal_year, case_status, decision_date, employer_name, employer_city, employer_state, worksite_city, worksite_state, worksite_county, job_title, soc_title, workers_certified`.

The script keeps a row when the employer state **or** the worksite state is TX, FL, CA, GA or NC. It keeps every case status (certified, partial, denied, withdrawn). Filter on `case_status` when you build the pages. After loading, add the row counts and the retrieval date below.

## Row counts

| File | Rows | Retrieved |
|---|---|---|
| raw_h2a_2025.csv | — | — |
| raw_h2b_2025.csv | — | — |
| raw_h2a_2026.csv | — | — |
| raw_h2b_2026.csv | — | — |

## Routes tried on 2026-10-20

1. **Direct download from the sandbox shell.** dol.gov, data.gov, analytics.usa.gov, seasonaljobs.dol.gov, api.seasonaljobs.dol.gov and huggingface.co all failed to connect. They are blocked by the network allowlist.
2. **WebFetch on the DOL performance page.** The page loaded, but the "Disclosure Data" links are built by JavaScript and were not in the fetched HTML. WebFetch cannot read `.xlsx` files: it returns an error for both real and fake file URLs.
3. **catalog.data.gov.** The OFLC and H-2A/H-2B program-history records do not list file downloads. They only point back to the DOL performance page.
4. **seasonaljobs.dol.gov/feeds.** This site has three daily feeds of new H-2A job orders, H-2A acceptance notices and H-2B acceptance notices. They cover only the last 20 days, are packed as zip files, and are not reachable from the shell. They are a possible future source of fresh job orders. They are not the certification disclosure data.
5. **GitHub, Hugging Face and pip/npm mirrors.** GitHub search is blocked for this session, which can only reach repositories already set up for it. Web search found mirrors for H-1B/LCA data only, not H-2A/H-2B for FY2025. No pip or npm package includes this data.
