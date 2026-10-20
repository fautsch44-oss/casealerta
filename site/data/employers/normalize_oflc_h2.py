"""Normalize OFLC H-2A / H-2B disclosure xlsx files into CaseAlerta raw CSVs.

Usage (run with python -I; the xlsx is untrusted data):
  python3 -I normalize_oflc_h2.py H-2A 2025 /path/H-2A_Disclosure_Data_FY2025_Q4.xlsx
  python3 -I normalize_oflc_h2.py H-2B 2025 /path/H-2B_Disclosure_Data_FY2025_Q4.xlsx

Writes raw_<program>_<fy>.csv next to this script (e.g. raw_h2a_2025.csv),
keeping only rows whose EMPLOYER_STATE or WORKSITE_STATE is TX, FL, CA, GA or NC.
Requires: pip install openpyxl --break-system-packages
"""
import csv
import datetime as dt
import os
import sys

import openpyxl

STATES = {"TX", "FL", "CA", "GA", "NC"}
STATE_NAMES = {"TEXAS": "TX", "FLORIDA": "FL", "CALIFORNIA": "CA", "GEORGIA": "GA", "NORTH CAROLINA": "NC"}
OUT_COLS = [
    "case_number", "program", "fiscal_year", "case_status", "decision_date",
    "employer_name", "employer_city", "employer_state", "worksite_city",
    "worksite_state", "worksite_county", "job_title", "soc_title", "workers_certified",
]
# Field names from the official FY2025 Q4 record layouts.
SRC = {
    "case_number": ["CASE_NUMBER"],
    "case_status": ["CASE_STATUS"],
    "decision_date": ["DECISION_DATE"],
    "employer_name": ["EMPLOYER_NAME"],
    "employer_city": ["EMPLOYER_CITY"],
    "employer_state": ["EMPLOYER_STATE"],
    "worksite_city": ["WORKSITE_CITY"],
    "worksite_state": ["WORKSITE_STATE"],
    "worksite_county": ["WORKSITE_COUNTY"],
    "job_title": ["JOB_TITLE"],
    "soc_title": ["SOC_TITLE"],
    "workers_certified": ["TOTAL_WORKERS_H-2A_CERTIFIED", "TOTAL_WORKERS_CERTIFIED", "TOTAL_WORKERS_H2A_CERTIFIED"],
}


def norm_state(v):
    s = str(v or "").strip().upper()
    return STATE_NAMES.get(s, s)


def norm_date(v):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime("%Y-%m-%d")
    s = str(v or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return dt.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return s


def norm_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def main(program, fy, path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = [str(h or "").strip().upper() for h in next(rows)]
    idx = {}
    for key, names in SRC.items():
        idx[key] = next((header.index(n) for n in names if n in header), None)
    missing = [k for k, i in idx.items() if i is None]
    if missing:
        sys.exit(f"Missing columns {missing}; header was {header}")
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"raw_{program.lower().replace('-', '')}_{fy}.csv")
    n = 0
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUT_COLS)
        w.writeheader()
        for r in rows:
            g = lambda k: r[idx[k]] if idx[k] < len(r) else None
            es, wsst = norm_state(g("employer_state")), norm_state(g("worksite_state"))
            if es not in STATES and wsst not in STATES:
                continue
            w.writerow({
                "case_number": str(g("case_number") or "").strip(),
                "program": program,
                "fiscal_year": fy,
                "case_status": str(g("case_status") or "").strip(),
                "decision_date": norm_date(g("decision_date")),
                "employer_name": str(g("employer_name") or "").strip(),
                "employer_city": str(g("employer_city") or "").strip(),
                "employer_state": es,
                "worksite_city": str(g("worksite_city") or "").strip(),
                "worksite_state": wsst,
                "worksite_county": str(g("worksite_county") or "").strip(),
                "job_title": str(g("job_title") or "").strip(),
                "soc_title": str(g("soc_title") or "").strip(),
                "workers_certified": norm_int(g("workers_certified")),
            })
            n += 1
    print(f"{out}: {n} rows")


if __name__ == "__main__":
    main(sys.argv[1].upper(), sys.argv[2], sys.argv[3])
