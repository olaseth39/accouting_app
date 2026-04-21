from agents.state import AccountingState
from agents.llm_utils import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
import json

def coa_agent(state: AccountingState) -> AccountingState:
    """
    Chart of Accounts (CoA) Agent: Analyzes journal entries 
    and builds/updates a hierarchical Chart of Accounts.
    """
    print("--- CHART OF ACCOUNTS AGENT ---")
    
    journal_entries = state.get("journal_entries", [])
    if not journal_entries:
        print("  [CoA Agent] No journal entries to analyze.")
        return state
        
    current_coa = state.get("chart_of_accounts", {})
    if not current_coa:
        # Initialize default CoA structure
        current_coa = {
            "Assets": {"Cash": 1000, "Accounts Receivable": 1100, "Inventory": 1200},
            "Liabilities": {"Accounts Payable": 2000, "Accrued Expenses": 2100},
            "Equity": {"Retained Earnings": 3000},
            "Revenue": {"Sales Revenue": 4000, "Service Revenue": 4100},
            "Expenses": {"Office Supplies": 5000, "Utilities": 5100, "Rent": 5200, "Travel": 5300, "Software": 5400, "Hardware": 5500}
        }
        
    # Analyze unusual accounts or those not in CoA
    accounts_in_journal = set(e.get("account") for e in journal_entries)
    
    # Flatten CoA for easy checking
    flat_coa = {}
    for category, subcats in current_coa.items():
        for name, code in subcats.items():
            flat_coa[name] = category
            
    llm = get_llm(temperature=0)
    
    sys_prompt = (
        "You are a Senior Accounting Architect. Categorize the following accounts into: "
        "'Assets', 'Liabilities', 'Equity', 'Revenue', or 'Expenses'. "
        "Return ONLY a JSON map: {account_name: category}."
    )
    
    unmatched_accounts = [acc for acc in accounts_in_journal if acc not in flat_coa]
    
    if unmatched_accounts:
        try:
            prompt = f"New Accounts to Categorize: {unmatched_accounts}"
            response = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=prompt)])
            
            raw_json = response.content.replace("```json", "").replace("```", "").strip()
            new_mappings = json.loads(raw_json)
            
            for acc, cat in new_mappings.items():
                if cat in current_coa:
                    # Give it a new code (simple increment of max)
                    existing_codes = list(current_coa[cat].values())
                    new_code = max(existing_codes) + 1 if existing_codes else 100
                    current_coa[cat][acc] = new_code
                    print(f"  [CoA Agent] Added account '{acc}' to {cat} with code {new_code}")
                    
        except Exception as e:
            print(f"  [CoA Agent] ⚠️ Failed to categorize new accounts: {str(e)}")
            
    state["chart_of_accounts"] = current_coa
    state["audit_log"] = state.get("audit_log", []) + [f"Chart of Accounts updated. Total accounts: {sum(len(v) for v in current_coa.values())}"]
    
    return state
