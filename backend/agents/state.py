import pandas as pd
from typing import TypedDict, List, Dict, Any, Optional, Annotated
import io
import json
import operator

# Reducer to keep the log at a manageable size (last 50 entries)
def truncate_log(existing: List[str], new: List[str]) -> List[str]:
    combined = (existing or []) + (new or [])
    return combined[-50:]

# Define the overall Agentic State for LangGraph
class AccountingState(TypedDict):
    # Input data
    file_content: Optional[bytes]
    file_name: Optional[str]
    
    # Processed Data
    raw_dataframe: Optional[Any] # pd.DataFrame but typed as Any for TypedDict
    normalized_dataframe: Optional[Any]
    extracted_transactions: List[Dict[str, Any]]
    
    # ERP Alternative Flow Data
    erp_ledger_uploaded: bool
    erp_dataframe: Optional[Any]
    
    # Validation & Routing
    validation_errors: List[str]
    plan: List[str]
    
    # Output generated (Reducers for incremental updates)
    posted_transaction_ids: List[str]
    
    # ── Financial Reporting (Incremental) ──
    financial_statements: Annotated[Dict[str, Any], operator.ior]
    department_reviews: Annotated[Dict[str, Any], operator.ior]
    elaborate_narratives: Annotated[Dict[str, Any], operator.ior]

    fpa_insights: Dict[str, Any]
    cash_flow_statement: Dict[str, Any]
    audit_workpapers: Dict[str, Any]
    
    # Optimized Audit Log (Truncated to prevent memory crash)
    audit_log: Annotated[List[str], truncate_log] 
    
    file_type: str
    feedback_directive: str
    fpa_forecast: Dict[str, Any]
    compliance_rejected_once: bool
    controller_rejected_once: bool
    bank_statement_transactions: List[Dict[str, Any]]
    standardized_bank_transactions: List[Dict[str, Any]]
    reconciliation_report: Dict[str, Any]
    amortization_schedule: List[Dict[str, Any]]

    # Anomalies detected by anomaly_agent
    anomalies_detected: List[Dict[str, Any]]

    # --- AI Bookkeeper (Receipts + Bank) State ---
    raw_receipts: List[Dict[str, str]]
    extracted_receipts: List[Dict[str, Any]]
    receipt_reconciliation_report: Dict[str, List]
    
    # --- New PDF Invoicing & Journal Workflow ---
    invoice_tabular_view: str 
    human_approved_invoices: List[Dict[str, Any]]
    journal_entries: List[Dict[str, Any]]
    chart_of_accounts: Dict[str, Any]
    approved_vendors: List[str]
    invoice_raw_text: List[Dict[str, Any]]
