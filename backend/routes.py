from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Body
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
#from accounting_app.backend.session import get_db
from session import get_db
from agents.graph import accounting_app
from agents.state import AccountingState
from langgraph.types import Command
import uuid
from pydantic import BaseModel
from PyPDF2 import PdfReader
import pdfplumber


router = APIRouter()

class ApprovalRequest(BaseModel):
    modifications: Optional[dict] = None
    

@router.post("/upload")
async def upload_workflow(
    invoice: list[UploadFile] = File(None),
    bank_statement: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    if not invoice and not bank_statement:
        raise HTTPException(status_code=400, detail="Must provide at least an invoice or bank statement")

    invoice_contents = []
    invoice_texts = []   # collect all extracted texts here

    if invoice:
        for inv in invoice:
            text = ""
            try:
                import pdfplumber
                with pdfplumber.open(inv.file) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text() or ""
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading {inv.filename}: {str(e)}")

            print(f"Processing invoice: {inv.filename}, extracted text length={len(text)}")
            print("Extracted text preview:", text[:200])

            invoice_contents.append({
                "file_name": inv.filename,
                "file_type": inv.filename.split('.')[-1] if '.' in inv.filename else "",
                "file_content": text
            })
            invoice_texts.append(text)   # add to raw text list

    #print(f"Total invoices processed: {invoice_contents}")
    #print(f"Bank statement provided: {'Yes' if bank_statement else 'No'}")
    #print(invoice_texts)

    bank_content_list = []
    if bank_statement:
        bank_content = await bank_statement.read()
        bank_content_list.append({
            "file_name": bank_statement.filename,
            "file_content": bank_content
        })
        #print("Trying to check the content of bank content", bank_content_list)

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AccountingState = {
        "invoices": invoice_contents,
        "bank_statement": [],
        "raw_dataframe": None,
        "normalized_dataframe": None,
        "extracted_transactions": [],
        "validation_errors": [],
        "plan": [],
        "posted_transaction_ids": [],
        "financial_statements": {},
        "department_reviews": {},
        "elaborate_narratives": {},
        "anomalies_detected": [],
        "audit_log": [],
        "erp_ledger_uploaded": False,
        "erp_dataframe": None,
        "fpa_insights": {},
        "cash_flow_statement": {},
        "audit_workpapers": {},
        "feedback_directive": "",
        "fpa_forecast": {},
        "compliance_rejected_once": False,
        "controller_rejected_once": False,
        "bank_statement_transactions": bank_content_list,
        "standardized_bank_transactions": [],
        "reconciliation_report": {},
        "amortization_schedule": [],
        "raw_receipts": [],
        "extracted_receipts": [],
        "receipt_reconciliation_report": {},
        "invoice_tabular_view": "",
        "human_approved_invoices": [],
        "journal_entries": [],
        "chart_of_accounts": {},
        "approved_vendors": [],
        # ✅ pass all extracted texts here
        "invoice_raw_text": invoice_contents
    }
    
    # print("This is from the dictionary class",AccountingState.get(initial_state, "invoice_raw_text"))
    # print("-----------------")
    # print("This is using initial_state",initial_state["invoice_raw_text"])

    try:
        final_state = await accounting_app.ainvoke(initial_state, config=config)
        #print("Final state keys:", final_state.keys())
        #print("Final state:", final_state)

        return {
            "thread_id": thread_id,
            "status": "pending_approval",
            "invoice_tabular_view": final_state.get("invoice_tabular_view"),
            "extracted_transactions": final_state.get('extracted_receipts'),
            
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/workflow/{thread_id}/approve/test")
async def approve_workflow_test(thread_id: str, payload: dict = Body(...)):
    print("Dummy approve called with thread_id:", thread_id)
    print("Payload:", payload)

    return {
        "status": "ok",
        "message": "Dummy response from backend",
        "thread_id": thread_id,
        "received_payload": payload
    }


@router.post("/workflow/{thread_id}/approve")
async def approve_workflow(
    thread_id: str,
    payload: ApprovalRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    config = {"configurable": {"thread_id": thread_id}}
    
    # Note: Using Command to resume instead of plain dict, or we can just send "None" if state was updated manually.
    # We will pass None to ainvoke which tells langgraph to resume the interrupted thread.
    try:
        # In case the frontend passes specific modifications, we update the state first if necessary
        # However, typically resuming from an interrupt in langgraph is done by passing Command or None
        
        from langgraph.types import Command
         # Debug: show what came in
        print("=== Approve Workflow Called ===")
        print("Thread ID:", thread_id)
        print("Payload:", payload.dict())
        
         # Wrap ainvoke in try/except
        try:
            print("About to invoke accounting_app...")
             
            state = await accounting_app.ainvoke(
                Command(resume={
                    "human_approved_invoices": payload.modifications.get("human_approved_invoices", []),
                    "status": "approved"
                }),
                config=config
            )

            #state["human_approved_invoices"] = payload.modifications.get("human_approved_invoices", [])
            print("Finished invoking accounting_app.")
            #print("Final state:", final_state)
        except Exception as inner_err:
            print("Error inside ainvoke:", inner_err)
            raise
        # Update the state directly or by passing it via Command(resume=)
        #final_state = await accounting_app.ainvoke(Command(resume=payload.modifications or {"status": "approved"}), config=config)
        #final_state = await accounting_app.ainvoke(Command(resume=payload.modifications ), config=config)
        
        state.pop("file_content", None)
        state.pop("raw_dataframe", None)
        state.pop("normalized_dataframe", None)
        
        #print("Final state before cleanup:", state["human_approved_invoices"])
        
        return {
            "status": "completed",
            "financial_statements": state.get("financial_statements"),
            "audit_log": state.get("audit_log"),
            "anomalies_detected": state.get("anomalies_detected"),
            "journal_entries": state.get("journal_entries"),
            "human_approved_invoices": state.get("human_approved_invoices"),
            #state["human_approved_invoices"] : payload.modifications.get("human_approved_invoices", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/financial-statements")
async def get_financial_statements(db: AsyncSession = Depends(get_db)):
    from services.reporting_service import ReportingService
    reporting_svc = ReportingService(db)
    
    pnl = await reporting_svc.generate_profit_and_loss()
    bs = await reporting_svc.generate_balance_sheet()
    
    return {
        "profit_and_loss": pnl,
        "balance_sheet": bs
    }

@router.get("/dashboard/metrics")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    from services.reporting_service import ReportingService
    reporting_svc = ReportingService(db)
    pnl = await reporting_svc.generate_profit_and_loss()
    
    total_revenue = sum(r.get('amount', 0) for r in pnl if r.get('type') == 'Revenue')
    total_expenses = sum(r.get('amount', 0) for r in pnl if r.get('type') == 'Expense')
    net_income = total_revenue - total_expenses
    
    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_income": net_income,
        "health_score": 95 if net_income > 0 else 75
    }

@router.get("/dashboard/anomalies")
async def get_dashboard_anomalies(db: AsyncSession = Depends(get_db)):
    # To mock this without a real DB persistence layer from LangGraph state:
    return [
        {"id": "A001", "description": "Unusual weekend transaction of $1,500 for Office Supplies.", "severity": "Medium"}
    ]

@router.get("/dashboard/audit-logs")
async def get_dashboard_audit_logs(db: AsyncSession = Depends(get_db)):
    return [
        "System initiated",
        "Mailroom Clerk routed file successfully",
        "Data ingested and parsed without error"
    ]
