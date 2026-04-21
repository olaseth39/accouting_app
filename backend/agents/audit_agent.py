from agents.state import AccountingState
import json

def audit_agent(state: AccountingState) -> AccountingState:
    """Consolidates logs and provides explainable reasoning for the whole cycle."""
    print("--- AUDIT EXPLANATION AGENT ---")
    
    # In a full system, this would output to an immutable audit ledger/table
    # For now, we consolidate the `audit_log` inside the state.
    
    errors = state.get("validation_errors", [])
    anomalies = state.get("anomalies_detected", [])
    logs = state.get("audit_log", [])
    
    final_report = {
        "status": "Failed" if errors else "Success",
        "errors": errors,
        "anomalies": anomalies,
        "execution_steps": logs
    }
    
    # We might emit this to a DB via MemoryService or file
    print("=== FINAL AUDIT REPORT ===")
    print(json.dumps(final_report, indent=2))
    print("==========================")
    
    # We can inject the final dict back into state for API return
    # State is already holding the lists, so we just return state.
    return state
