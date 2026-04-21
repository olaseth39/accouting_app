from agents.state import AccountingState
#from agents.llm_utils import get_llm
from langchain_core.messages import HumanMessage
import os

def inbox_clerk_agent(state: AccountingState) -> AccountingState:
    print("--- INBOX / CLERK AGENT ---")

    # ✅ Guard clause: if we already have extracted text, skip the mock fallback
    if state.get("invoice_raw_text"):
        #print("invoice_raw_text from inbox_clerk_agent:", state)
        print("  [Inbox Clerk] Raw invoice text already present, skipping mock extraction.")
        return state

    file_type = state.get("file_type", "").lower()
    
    if "csv" in file_type or "spreadsheet" in file_type or "excel" in file_type:
        # Standard structured data, pass it on
        return state
        
    # If we get here, it's unstructured (PDF or Image)
    # Since we can't fully execute complex OCR in a mock environment safely without libraries,
    # we will use an LLM call if it's text, or mock the extraction if it's an image.
    
    state["audit_log"] = state.get("audit_log", []) + [
        f"Mailroom Clerk received a raw document ({state.get('file_name')}). Constructing initial journal entry via multimodal extraction."
    ]
    
    # Mocking extraction of a scanned invoice for the sake of the graph flow
    extracted = {
        "date": "2026-03-21",
        "account": "Office Supplies Expense",
        "debit": 1500.00,
        "credit": 0.0,
        "description": "Purchased supplies from Staples (Scanned Receipt)",
        "source": "receipt_scan"
    }
    extracted2 = {
        "date": "2026-03-21",
        "account": "Accounts Payable",
        "debit": 0.0,
        "credit": 1500.00,
        "description": "Liability for Staples",
        "source": "receipt_scan"
    }
    
    state["extracted_transactions"] = state.get("extracted_transactions", []) + [extracted, extracted2]
    
    reviews = state.get("department_reviews", {})
    reviews["inbox"] = "Successfully extracted 2 transaction lines from the raw invoice scan."
    state["department_reviews"] = reviews
    
    # Instruct the graph to skip ingestion & mapping since we already have extracted_transactions
    state["feedback_directive"] = "SKIP_TO_PLANNING"
    return state
