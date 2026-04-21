from agents.state import AccountingState
from agents.llm_utils import get_llm
import pandas as pd
import numpy as np
import json


def _get_llm():
    """Return the Azure OpenAI LLM instance via centralized utility."""
    return get_llm(temperature=0)


def _generate_narratives(anomalies_raw: list[dict], all_transactions: list[dict]) -> list[dict]:
    """
    Send detected anomalies to the LLM along with transaction context.
    Returns enriched anomalies with narratives, investigation steps, and risk levels.
    """
    if not anomalies_raw:
        return []

    # Build concise context about the full dataset
    account_summaries = {}
    for t in all_transactions:
        acc = t.get("account", "Unknown")
        if acc not in account_summaries:
            account_summaries[acc] = {"count": 0, "total_debit": 0, "total_credit": 0}
        account_summaries[acc]["count"] += 1
        account_summaries[acc]["total_debit"] += float(t.get("debit", 0))
        account_summaries[acc]["total_credit"] += float(t.get("credit", 0))

    ctx_lines = []
    for acc, stats in account_summaries.items():
        ctx_lines.append(
            f"  {acc}: {stats['count']} entries, Total Debit: {stats['total_debit']:,.2f}, Total Credit: {stats['total_credit']:,.2f}"
        )
    context_block = "\n".join(ctx_lines[:30])  # Limit context to 30 accounts

    # Build anomaly list for the LLM
    anomaly_lines = []
    for i, a in enumerate(anomalies_raw):
        anomaly_lines.append(f"  [{i}] Type: {a['type']}, Account: {a.get('account','N/A')}, "
                             f"Amount: {a.get('amount', 'N/A')}, Details: {a.get('details','')}")
    anomaly_block = "\n".join(anomaly_lines)

    prompt = f"""You are a senior forensic accountant. Analyze these anomalies detected in a company's financial data.
For EACH anomaly, provide:
1. A plain-English explanation of WHY this is unusual
2. The most likely root cause (business reason or error)
3. Specific investigation steps the accountant should take
4. Risk level: "High", "Medium", or "Low"

ACCOUNT CONTEXT (summary of all accounts in the dataset):
{context_block}

DETECTED ANOMALIES:
{anomaly_block}

Respond ONLY with a valid JSON array. Each element must have:
{{"index": 0, "narrative": "...", "root_cause": "...", "investigation_steps": ["step1", "step2"], "risk_level": "High|Medium|Low"}}
"""

    try:
        from langchain_core.messages import HumanMessage
        llm = _get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        result_str = response.content.replace("```json", "").replace("```", "").strip()
        narratives = json.loads(result_str)

        # Merge narratives back into anomalies
        enriched = []
        for n in narratives:
            idx = n.get("index", 0)
            if idx < len(anomalies_raw):
                merged = {**anomalies_raw[idx]}
                merged["narrative"] = n.get("narrative", "")
                merged["root_cause"] = n.get("root_cause", "")
                merged["investigation_steps"] = n.get("investigation_steps", [])
                merged["risk_level"] = n.get("risk_level", "Medium")
                enriched.append(merged)
        # Add any anomalies that the LLM missed
        enriched_indices = {n.get("index") for n in narratives}
        for i, a in enumerate(anomalies_raw):
            if i not in enriched_indices:
                a["narrative"] = a.get("details", "")
                a["root_cause"] = "Unable to determine"
                a["investigation_steps"] = ["Review the transaction manually"]
                a["risk_level"] = "Medium"
                enriched.append(a)
        return enriched
    except Exception as e:
        # Fallback: return anomalies with basic info
        for a in anomalies_raw:
            a["narrative"] = a.get("details", "")
            a["root_cause"] = "LLM analysis unavailable"
            a["investigation_steps"] = ["Review the transaction manually"]
            a["risk_level"] = "Medium"
        return anomalies_raw


def anomaly_detection_agent(state: AccountingState) -> AccountingState:
    """
    Detects anomalies using statistical methods (z-score, duplicate detection),
    then uses LLM reasoning to generate rich narratives explaining WHY each
    anomaly is unusual and WHAT to investigate.
    """
    print("--- ANOMALY DETECTION AGENT ---")

    transactions = state.get("extracted_transactions", [])
    if not transactions:
        return state

    # For very large files, cap the rows used for statistical analysis.
    # Z-score and period-over-period work best on a representative sample.
    # Duplicate detection always runs on ALL rows (it's O(n) with a set).
    STAT_CAP = 5_000
    stat_txns = transactions[:STAT_CAP]
    sampled = len(transactions) > STAT_CAP

    anomalies_raw = []  # Structured anomaly objects

    # ── Statistical Detection: Z-Score (on capped sample) ──────────────────
    amounts = []
    for t in stat_txns:
        d = float(t.get("debit", 0))
        c = float(t.get("credit", 0))
        if d > 0:
            amounts.append(d)
        if c > 0:
            amounts.append(c)

    if len(amounts) > 5:
        mean_amt = np.mean(amounts)
        std_dev = np.std(amounts)

        if std_dev > 0:
            for t in stat_txns:
                amt = max(float(t.get("debit", 0)), float(t.get("credit", 0)))
                z_score = (amt - mean_amt) / std_dev
                if z_score > 3:
                    anomalies_raw.append({
                        "type": "Unusually Large Amount",
                        "account": t.get("account", "Unknown"),
                        "amount": amt,
                        "z_score": round(z_score, 2),
                        "date": str(t.get("date", "")),
                        "details": (
                            f"{t.get('account')} had a transaction of {amt:,.2f} "
                            f"(Z-score: {z_score:.2f}, mean: {mean_amt:,.2f}, std: {std_dev:,.2f})"
                        ),
                    })

    # ── Duplicate Detection ───────────────────────────────────────────────
    seen = set()
    for t in transactions:
        sig = (
            str(t.get("date", "")),
            t.get("account", ""),
            float(t.get("debit", 0)),
            float(t.get("credit", 0)),
            t.get("description", ""),
        )
        if sig in seen:
            anomalies_raw.append({
                "type": "Potential Duplicate",
                "account": t.get("account", "Unknown"),
                "amount": max(float(t.get("debit", 0)), float(t.get("credit", 0))),
                "date": str(t.get("date", "")),
                "details": (
                    f"Duplicate entry found for {t.get('account')} on {t.get('date')} — "
                    f"same amount, same description"
                ),
            })
        else:
            seen.add(sig)

    # ── Period-over-Period Spike Detection (on capped sample) ────────────
    # Group by account+month, detect if any month is 2x the previous
    monthly_totals = {}
    for t in stat_txns:
        acc = t.get("account", "Unknown")
        raw_date = t.get("date")
        try:
            dt = pd.to_datetime(str(raw_date), errors="coerce")
            if pd.isna(dt):
                continue
            period = dt.strftime("%Y-%m")
        except Exception:
            continue
        key = (acc, period)
        monthly_totals[key] = monthly_totals.get(key, 0) + float(t.get("debit", 0)) + float(t.get("credit", 0))

    # Check for month-over-month spikes per account
    accounts_seen = set(k[0] for k in monthly_totals.keys())
    for acc in accounts_seen:
        periods = sorted([k[1] for k in monthly_totals.keys() if k[0] == acc])
        for i in range(1, len(periods)):
            prev_val = monthly_totals.get((acc, periods[i - 1]), 0)
            curr_val = monthly_totals.get((acc, periods[i]), 0)
            if prev_val > 0 and curr_val > prev_val * 2:
                anomalies_raw.append({
                    "type": "Month-over-Month Spike",
                    "account": acc,
                    "amount": curr_val,
                    "date": periods[i],
                    "details": (
                        f"{acc}: {periods[i]} total ({curr_val:,.2f}) is {curr_val/prev_val:.1f}x "
                        f"the previous month ({periods[i-1]}: {prev_val:,.2f})"
                    ),
                })

    # ── LLM Narrative Generation ──────────────────────────────────────────
    if anomalies_raw:
        # Cap at 20 anomalies to avoid huge LLM calls
        capped = anomalies_raw[:20]
        enriched = _generate_narratives(capped, transactions)
        # Add back any that were beyond the cap without narratives
        for a in anomalies_raw[20:]:
            a["narrative"] = a.get("details", "")
            a["root_cause"] = "Not analyzed (beyond batch limit)"
            a["investigation_steps"] = ["Review manually"]
            a["risk_level"] = "Medium"
            enriched.append(a)
        anomalies_final = enriched
    else:
        anomalies_final = []

    state["anomalies_detected"] = anomalies_final
    state["audit_log"] = state.get("audit_log", []) + [
        f"Anomaly detection complete: {len(anomalies_final)} anomalies found"
        + (f" (statistical checks on first {STAT_CAP:,} of {len(transactions):,} rows)" if sampled else "") + "."
    ]

    return state
