from agents.state import AccountingState
from agents.llm_utils import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
import json
import pandas as pd
import pandas as pd

def journal_agent(state: AccountingState) -> AccountingState:
    """
    Journal Agent: Uses approved invoices and bank statement transactions 
    to build a comprehensive journal.
    """
    print("--- JOURNAL AGENT ---")
    #print("This is from journal agent:", state)
    
    
    #approved_invoices = state.get("human_approved_invoices", [])
    approved_invoices = state.get("human_approved_invoices") or state.get("extracted_receipts", [])
    #approved_invoices = state.get("human_approved_invoices")
    bank_txns = state.get("standardized_bank_transactions", [])
    #print("This is from journal agent (bank_txns):", bank_txns)
    
    if not approved_invoices:
        print("  [Journal Agent] No approved invoices found.")
        # If no internal invoices, we might just be processing bank statement directly
        if not bank_txns:
            return state
            
    # matching logic
    journal_entries = []
    matched_bank_indices = set()
    
    for inv in approved_invoices:
        inv_amt = float(inv.get("amount", 0.0))
        #print("This is from journal agent (invoice amount):", inv_amt)
        inv_vendor = str(inv.get("vendor_name", "")).lower()
        #print("This is from journal agent (invoice vendor):", inv_vendor)
        inv_date = str(inv.get("date", ""))
        #print("This is from journal agent (invoice date):", inv_date)
        
        match_idx = None
        for i, btx in enumerate(bank_txns):
            if i in matched_bank_indices:
                continue
            
            b_amt = float(btx.get("Credit ($)", 0.0))
            #print("This is from journal agent (bank amount):", b_amt)
            b_desc = str(btx.get("Description", "")).lower()
            #print("This is from journal agent (bank description):", b_desc)
            
            # Simple match: Amount (absolute) and Vendor name in description
            if abs(abs(b_amt) - inv_amt) < 0.05: # 5 cent tolerance
                if inv_vendor in b_desc or any(word in b_desc for word in inv_vendor.split() if len(word) > 3):
                    match_idx = i
                    break
        
        if match_idx is not None:
            matched_bank_indices.add(match_idx)
            btx = bank_txns[match_idx]
            
            # Create Double Entry Journal
            # Entry 1: Expense (Debit)
            journal_entries.append({
                "date": inv_date,
                "account": "Expense (Uncategorized)", # CoA agent will refine this
                "debit": inv_amt,
                "credit": 0.0,
                "description": f"Invoice from {inv.get('vendor_name')} - {inv.get('description')}",
                "ref": inv.get("source_file"),
                "matched_bank_tx": btx.get("Description")
            })
            # Entry 2: Cash/Bank (Credit)
            journal_entries.append({
                "date": inv_date,
                "account": "Cash/Bank",
                "debit": 0.0,
                "credit": inv_amt,
                "description": f"Payment to {inv.get('vendor_name')} (Matched to bank)",
                "ref": inv.get("source_file"),
                "matched_bank_tx": btx.get("Description")
            })
            print(f"  [Journal Agent] Matched invoice {inv.get('vendor_name')} (${inv_amt}) to bank transaction.")
        else:
            # Unmatched invoice: Create AP entry?
            journal_entries.append({
                "date": inv_date,
                "account": "Expense (Uncategorized)",
                "debit": inv_amt,
                "credit": 0.0,
                "description": f"Invoice from {inv.get('vendor_name')} - {inv.get('description')} (UNMATCHED TO BANK)",
                "ref": inv.get("source_file")
            })
            journal_entries.append({
                "date": inv_date,
                "account": "Accounts Payable",
                "debit": 0.0,
                "credit": inv_amt,
                "description": f"Liability for {inv.get('vendor_name')} (Unpaid)",
                "ref": inv.get("source_file")
            })
            print(f"  [Journal Agent] Invoice {inv.get('vendor_name')} (${inv_amt}) unmatched to bank. Created AP.")

    # 2. Add remaining (unmatched) bank statement transactions to the journal
    for i, btx in enumerate(bank_txns):
        if i not in matched_bank_indices:
            b_amt = float(btx.get("amount", 0.0))
            b_desc = str(btx.get("description", "Bank Transaction"))
            b_date = str(btx.get("date", pd.to_datetime("today").strftime("%Y-%m-%d")))
            b_type = str(btx.get("type", "")).lower()
            
            # If deposit, it's a debit to bank / credit to suspense
            # If withdrawal, it's a credit to bank / debit to suspense
            if b_type == "deposit":
                journal_entries.append({
                    "date": b_date, "account": "Cash/Bank", "debit": b_amt, "credit": 0.0, "description": b_desc, "ref": "Bank Feed"
                })
                journal_entries.append({
                    "date": b_date, "account": "Revenue (Uncategorized)", "debit": 0.0, "credit": b_amt, "description": f"Unmatched Deposit: {b_desc}", "ref": "Bank Feed"
                })
            else:
                journal_entries.append({
                    "date": b_date, "account": "Expense (Uncategorized)", "debit": b_amt, "credit": 0.0, "description": f"Unmatched Withdrawal: {b_desc}", "ref": "Bank Feed"
                })
                journal_entries.append({
                    "date": b_date, "account": "Cash/Bank", "debit": 0.0, "credit": b_amt, "description": b_desc, "ref": "Bank Feed"
                })

    #print("journal entries records",journal_entries)
    return {
        **state,
        "journal_entries": journal_entries,
        "audit_log": [f"Built journal with {len(journal_entries)} entries. Matched {len(matched_bank_indices)} bank records."]
    }
