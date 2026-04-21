from agents.state import AccountingState
from services.memory_service import MemoryService
from session import AsyncSessionLocal

async def memory_update_agent(state: AccountingState) -> AccountingState:
    """Updates the Long-Term Memory (Patterns) using the successfully posted transactions."""
    print("--- MEMORY UPDATE AGENT ---")
    from collections import defaultdict
    
    posted_txs = [t for t in state.get("extracted_transactions", []) if not state.get("validation_errors")]
    if not posted_txs:
        return state
        
    async with AsyncSessionLocal() as session:
        memory_svc = MemoryService(session)
        # Simplified memory update: save insight about total transaction volume
        try:
            total_vol = sum(t['debit'] for t in posted_txs)
            insight_text = f"Processed {len(posted_txs)} line items totaling {total_vol} across {len(set(t['account'] for t in posted_txs))} accounts."
            
            await memory_svc.add_insight(insight_text)
            
            state["audit_log"] = state.get("audit_log", []) + ["Financial Memory updated successfully."]
        except Exception as e:
            state["audit_log"] = state.get("audit_log", []) + [f"Failed to update memory: {str(e)}"]

    return state
