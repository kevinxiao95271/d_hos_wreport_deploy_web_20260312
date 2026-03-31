# -*- coding: utf-8 -*-
"""自测：会议/培训/指导/调研 倒序 + startYearQuarter / quarterIndex

依赖：本地后端已启动（默认 http://localhost:8083），测试账号有 daily_work 任务。

用法：
  python scripts/dw_quarter_selftest.py
  或设置环境变量：DW_BASE_URL=http://127.0.0.1:8083 DW_ACCOUNT=qc_005 DW_PASSWORD=xxx
"""
from __future__ import annotations

import os
import sys
from typing import Any

import requests

BASE = os.environ.get("DW_BASE_URL", "http://localhost:8083").rstrip("/")
ACCOUNT = os.environ.get("DW_ACCOUNT", "qc_005")
PASSWORD = os.environ.get("DW_PASSWORD", "Test@2025")


def start_keys(kind: str) -> tuple[str, str]:
    return {
        "meetings": ("meetingStartDate", "meetingStartHalf"),
        "trainings": ("trainingStartDate", "trainingStartHalf"),
        "guidances": ("guidanceStartDate", "guidanceStartHalf"),
        "surveys": ("surveyStartDate", "surveyStartHalf"),
    }[kind]


def _half_rank(h: Any) -> int:
    return 1 if h == "PM" else 0


def is_sorted_desc(items: list[dict], kind: str) -> bool:
    dk, hk = start_keys(kind)
    for i in range(len(items) - 1):
        a, b = items[i], items[i + 1]
        da, db = a.get(dk) or "", b.get(dk) or ""
        if da > db:
            continue
        if da < db:
            return False
        # same date
        ra, rb = _half_rank(a.get(hk)), _half_rank(b.get(hk))
        if ra > rb:
            continue
        if ra < rb:
            return False
        ida, idb = str(a.get("id", "")), str(b.get("id", ""))
        if ida > idb:
            continue
        if ida < idb:
            return False
    return True


def check_quarter_fields(items: list[dict], kind: str) -> list[str]:
    errs: list[str] = []
    for i, it in enumerate(items):
        yq = it.get("startYearQuarter")
        qi = it.get("quarterIndex")
        if yq is None and qi is None:
            continue
        if (yq is None) ^ (qi is None):
            errs.append(f"{kind}[{i}] startYearQuarter 与 quarterIndex 应同时存在")
            continue
        if not (isinstance(yq, str) and len(yq) >= 6):
            errs.append(f"{kind}[{i}] startYearQuarter 异常: {yq!r}")
        if not isinstance(qi, (int, float)) or not (1 <= int(qi) <= 4):
            errs.append(f"{kind}[{i}] quarterIndex 异常: {qi!r}")
    return errs


def main() -> int:
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    s = requests.Session()
    r = s.post(
        f"{BASE}/api/auth/login",
        json={"account": ACCOUNT, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    r.raise_for_status()
    j = r.json()
    if j.get("code") != 200:
        print("FAIL login:", j)
        return 1
    token = j["data"]["token"]
    s.headers["Authorization"] = token

    r2 = s.get(f"{BASE}/wr/task/active", timeout=15)
    r2.raise_for_status()
    j2 = r2.json()
    if j2.get("code") != 200:
        print("FAIL /wr/task/active:", j2)
        return 1
    tasks = j2.get("data") or []
    dw = [t for t in tasks if t.get("taskType") == "daily_work"]
    if not dw:
        print("FAIL: no daily_work task in /wr/task/active")
        return 1
    task_id = dw[0]["id"]
    print("taskId:", task_id, "name:", dw[0].get("taskName"))

    r3 = s.get(f"{BASE}/dw/record/init/{task_id}", timeout=15)
    r3.raise_for_status()
    j3 = r3.json()
    if j3.get("code") != 200:
        print("FAIL /dw/record/init:", j3)
        return 1
    data = j3["data"]

    kinds = [
        ("meetings", data.get("meetings") or []),
        ("trainings", data.get("trainings") or []),
        ("guidances", data.get("guidances") or []),
        ("surveys", data.get("surveys") or []),
    ]
    ok = True
    for kind, arr in kinds:
        if len(arr) < 2:
            print(f"SKIP sort check {kind}: len={len(arr)}")
            continue
        if not is_sorted_desc(arr, kind):
            print(f"FAIL sort {kind}: not DESC by start")
            ok = False
        else:
            print(f"PASS sort {kind}: len={len(arr)}")
        qerrs = check_quarter_fields(arr, kind)
        for e in qerrs:
            print("FAIL", e)
            ok = False
        if not qerrs and arr:
            print(f"PASS quarter fields {kind} (sample first row): yq={arr[0].get('startYearQuarter')!r} qi={arr[0].get('quarterIndex')!r}")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
