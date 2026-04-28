from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from agents.state import AccountingState

# Import Agents
from agents.inbox_clerk_agent import inbox_clerk_agent
from agents.ingestion_agent import data_ingestion_agent
from agents.extraction_agent import transaction_extraction_agent # Invoice Agent
from agents.journal_agent import journal_agent
from agents.posting_agent import ledger_posting_agent # Ledger Agent
from agents.compliance_agent import compliance_agent
from agents.coa_agent import coa_agent
from agents.reporting_agent import financial_reporting_agent
from agents.anomaly_agent import anomaly_detection_agent
from agents.audit_agent import audit_agent
from agents.memory_agent import memory_update_agent

#print("Entering conditional edge logic after extraction_agent...")
# Define conditional edge logic
def should_continue_after_extraction(state: AccountingState) -> str:
    """Pause for human review of the tabular invoice list."""
    
    if state.get("validation_errors"):
        return "audit_agent"
        
    return "journal_agent"  # Go to human merge for error resolution before journal entry
    # In a real dynamic graph, we would return a specific 'human_review' state/node
    # For this simulation, we proceed to journal_agent assuming approval
    #print("No validation errors found, proceeding to journal_agent.")
    #return "journal_agent"
# after_extraction_res = should_continue_after_extraction(AccountingState())
# continue_to_journal = "".join(after_extraction_res)
# print("Result from should_continue_after_extraction:", continue_to_journal)


# def human_merge_agent(state: AccountingState) -> AccountingState:
#     print("--- HUMAN MERGE AGENT ---")
    
#     # This is where resume payload gets injected
#     # LangGraph puts resume data under "__resume__"
#     resume_data = state.get("__resume__", {})
    
#     print("RESUME DATA:", resume_data)
    
#     return {
#         **state,
#         **resume_data,  # 🔥 THIS is the key
#     }


def define_accounting_graph():
    workflow = StateGraph(AccountingState)
    
    # Add Nodes
    print("Defining graph nodes and edges...")
    workflow.add_node("inbox_clerk_agent", inbox_clerk_agent)
    print("Added inbox_clerk_agent")
    workflow.add_node("ingestion_agent", data_ingestion_agent)
    print("Added ingestion_agent")
    workflow.add_node("extraction_agent", transaction_extraction_agent) # Invoice Agent
    print("Added extraction_agent")
    #workflow.add_node("human_merge_agent", human_merge_agent)
    workflow.add_node("journal_agent", journal_agent)
    workflow.add_node("posting_agent", ledger_posting_agent)
    workflow.add_node("compliance_agent", compliance_agent)
    workflow.add_node("coa_agent", coa_agent)
    workflow.add_node("reporting_agent", financial_reporting_agent)
    workflow.add_node("anomaly_agent", anomaly_detection_agent)
    workflow.add_node("audit_agent", audit_agent)
    
    # Define Edges
    workflow.add_edge(START, "inbox_clerk_agent")
    
    # Route from Inbox
    # def route_from_inbox(state: AccountingState) -> str:
    #     return "ingestion_agent"
    
    
    def route_from_inbox(state: AccountingState) -> str:
        if state.get("skip_to_journal"):
            print("Skipping to journal_agent...")
            return "journal_agent"
        return "ingestion_agent"
    
    workflow.add_conditional_edges("inbox_clerk_agent", route_from_inbox)
    workflow.add_edge("ingestion_agent", "extraction_agent")
    
    # Breakpoint Simulation: After extraction, the user reviews invoice_tabular_view.
    # In LangGraph terms, we would use interrupt_before=["journal_agent"]
    
    #workflow.add_conditional_edges("extraction_agent", should_continue_after_extraction)
    #journal_agent_result = should_continue_after_extraction(AccountingState())
    #workflow.add_conditional_edges("extraction_agent", should_continue_after_extraction)
    #workflow.add_conditional_edges("extraction_agent", "journal_agent")
    #print("Conditional edge from extraction_agent defined, expecting journal_agent next...")
    
    #workflow.add_edge("journal_agent",  END)
    
    workflow.add_conditional_edges("extraction_agent", should_continue_after_extraction)

    #workflow.add_edge("human_merge_agent", "journal_agent")
    #workflow.add_edge("journal_agent", END)
    workflow.add_edge("journal_agent", "posting_agent")
    workflow.add_edge("posting_agent", "compliance_agent")
    workflow.add_edge("compliance_agent", "coa_agent")
    workflow.add_edge("coa_agent", "reporting_agent")
    workflow.add_edge("reporting_agent", "anomaly_agent")
    workflow.add_edge("anomaly_agent", "audit_agent")
    
    workflow.add_edge("audit_agent", END)
    
    # Compile with interrupt for human review
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory, interrupt_before=["journal_agent"])
    #app = workflow.compile(checkpointer=memory)
    return app

# Singleton compiled graph instance
accounting_app = define_accounting_graph()
