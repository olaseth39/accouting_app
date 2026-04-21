import os
import json
from agents.state import AccountingState

VENDOR_LIST_PATH = os.path.join("core", "approved_vendors.json")

def compliance_agent(state: AccountingState) -> AccountingState:
    print("--- COMPLIANCE AGENT (VENDOR VERIFICATION) ---")
    
    invoices = state.get("human_approved_invoices", [])
    if not invoices:
        print("  [Compliance] No approved invoices to check.")
        return state

    # Load approved vendors
    try:
        with open(VENDOR_LIST_PATH, "r") as f:
            approved_data = json.load(f)
            approved_vendors = set(v.lower() for v in approved_data.get("approved_vendors", []))
    except Exception as e:
        print(f"  [Compliance] ⚠️ Failed to load approved vendors: {str(e)}")
        approved_vendors = set()

    violations = []
    for inv in invoices:
        vendor = str(inv.get("vendor_name", "")).lower()
        if vendor and not any(v in vendor for v in approved_vendors):
            violations.append(f"Unapproved Vendor: '{inv.get('vendor_name')}' found in invoice {inv.get('source_file')}.")

    reviews = state.get("department_reviews", {}) or {}
    
    if violations:
        state["feedback_directive"] = "REJECT"
        reviews["compliance"] = {
            "title": "Compliance Agent",
            "emoji": "🛡️",
            "summary": f"REJECTED. {len(violations)} unapproved vendor(s) found.",
            "data": {"Unapproved Vendors": violations},
            "flags": violations,
        }
        state["audit_log"] = state.get("audit_log", []) + [f"❌ Compliance Agent: {len(violations)} violations."]
    else:
        state["feedback_directive"] = "APPROVE"
        reviews["compliance"] = {
            "title": "Compliance Agent",
            "emoji": "🛡️",
            "summary": "APPROVED. All vendors are on the approved list.",
            "data": {"Violations": 0},
            "flags": [],
        }
        state["audit_log"] = state.get("audit_log", []) + ["✅ Compliance Agent approved all vendors."]

    state["department_reviews"] = reviews
    return state
