from agents.state import AccountingState
from services.transaction_service import TransactionService
from session import AsyncSessionLocal
from database.models import Account, AccountType, NormalBalance
from sqlalchemy import select
from itertools import groupby

async def ledger_posting_agent(state: AccountingState) -> AccountingState:
    """Posts validated journal entries to the PostgreSQL general ledger."""
    print("--- LEDGER POSTING AGENT ---")
    
    # Use the new journal_entries instead of extracted_transactions
    journal_entries = state.get("journal_entries", [])
    #print(f"Journal entries to post: {journal_entries[0].keys()}")
    if not journal_entries:
        print("  [Ledger Agent] No journal entries to post.")
        return state
        
      
    if state.get("validation_errors"):
        print("Skipping posting due to existing validation errors.")
        return state
          
    print("Posting the following journal entries to the ledger:", state.get('validation_errors'))     
    posted_ids = []
    
    async with AsyncSessionLocal() as session:
        # First, ensure all accounts exist in the DB
        account_names = list(set(e.get("account", "Unknown") for e in journal_entries))
        stmt = select(Account).where(Account.name.in_(account_names))
        result = await session.execute(stmt)
        existing_accounts = result.scalars().all()
        acc_dict = {a.name: a.id for a in existing_accounts}
        
        # Auto-creation of missing accounts (consistent with legacy logic)
        for name in account_names:
            if name not in acc_dict:
                a_type = AccountType.EXPENSE
                n_bal = NormalBalance.DEBIT
                lower_name = name.lower()
                if "cash" in lower_name or "bank" in lower_name or "asset" in lower_name:
                    a_type = AccountType.ASSET
                elif "capital" in lower_name or "equity" in lower_name:
                    a_type = AccountType.EQUITY
                    n_bal = NormalBalance.CREDIT
                elif "revenue" in lower_name or "sales" in lower_name:
                    a_type = AccountType.REVENUE
                    n_bal = NormalBalance.CREDIT
                elif "payable" in lower_name or "liability" in lower_name:
                    a_type = AccountType.LIABILITY
                    n_bal = NormalBalance.CREDIT
                    
                new_acc = Account(name=name, account_type=a_type, normal_balance=n_bal)
                session.add(new_acc)
                await session.flush()
                acc_dict[name] = new_acc.id
                
        # Group entries into single Transactions (by date + description + source_file/ref)
        key_func = lambda x: (str(x.get('date')), x.get('description'), x.get('ref'))
        sorted_entries = sorted(journal_entries, key=key_func)
        
        tx_service = TransactionService(session)
        
        from itertools import groupby
        for key, group in groupby(sorted_entries, key=key_func):
            date_str, desc, ref = key
            lines = list(group)
            
            mapped_lines = []
            for line in lines:
                mapped_lines.append({
                    "account_id": acc_dict[line.get('account', 'Unknown')],
                    "debit": line.get('debit', 0.0),
                    "credit": line.get('credit', 0.0)
                })
            
            try:
                # Use TransactionService to save to DB
                tx = await tx_service.create_transaction(date=date_str, description=desc, lines_data=mapped_lines)
                posted_ids.append(str(tx.id))
            except Exception as e:
                state["validation_errors"] = state.get("validation_errors", []) + [f"Failed to post transaction '{desc}': {str(e)}"]
                
    state["posted_transaction_ids"] = state.get("posted_transaction_ids", []) + posted_ids
    state["audit_log"] = state.get("audit_log", []) + [f"Successfully posted {len(posted_ids)} matched transactions to General Ledger."]
                
    return state
