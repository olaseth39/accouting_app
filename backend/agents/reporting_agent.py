from agents.state import AccountingState
from services.reporting_service import ReportingService
from session import AsyncSessionLocal

async def financial_reporting_agent(state: AccountingState) -> AccountingState:
    """Generates the main financial statements."""
    print("--- FINANCIAL REPORTING AGENT ---")
    
    # Check if there are validations errors, we might still want to report on existing DB state,
    # but normally we only run this if postings succeeded or if specifically requested.
    
    async with AsyncSessionLocal() as session:
        reporting_svc = ReportingService(session)
        
        try:
            pnl = await reporting_svc.generate_profit_and_loss()
            bs = await reporting_svc.generate_balance_sheet()
            
            state["financial_statements"] = {
                "profit_and_loss": pnl,
                "balance_sheet": bs
            }
            state["audit_log"] = state.get("audit_log", []) + ["Successfully generated financial statements."]
        except Exception as e:
            state["audit_log"] = state.get("audit_log", []) + [f"Error generating statements: {str(e)}"]
            
    return state
