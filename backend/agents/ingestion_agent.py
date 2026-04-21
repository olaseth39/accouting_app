import pdfplumber
import io
import pandas as pd
import base64
from agents.state import AccountingState


def data_ingestion_agent(state: AccountingState) -> AccountingState:
    """Reads uploaded files (PDF/CSV/Excel/Images). Aggregates data for multiple invoices."""
    print("--- DATA INGESTION AGENT ---")
    
    if state.get("skip_to_journal"):
        return state
    
    # if not state.get("raw_receipts"):
    #     return state
    
    # 1. Handle Multiple Receipts (Invoices, Receipts, Images)
    #raw_docs = state.get("raw_receipts", [])
    #print("state in ingestion agent", state)
    raw_docs = state.get("invoice_raw_text", [])
    #invoice_texts = []
    #invoice_texts = state.get("invoice_raw_text", [])
    
    if raw_docs:
        print(f"  [Ingestion] Processing {len(raw_docs)} files from raw_receipts...")
        for doc in raw_docs:
            #print("This is doc from ingestion_agent", doc)
            filename = doc.get("file_name", "unknown.pdf")
            #filename = doc.get("filename", "unknown.pdf")
            #print(f"Processing file: {filename}")
            b64_data = doc.get("base64_data", "")
            #print(b64_data)
            # if not b64_data:
            #     continue
            
            if filename.lower().endswith(".pdf"):
                #print(filename, "is a PDF. Attempting to extract text...")
                try:
                    if b64_data:
                        file_bytes = base64.b64decode(b64_data)
                        #print("extracting values from pdf in ingestion agent")
                        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                            text = ""
                            for page in pdf.pages:
                                text += page.extract_text() or ""
                                print(text)
                            invoice_texts.append({
                                "filename": filename, 
                                "text": text, 
                                "type": "text"
                            })
                            # print(f"  [Ingestion] Extracted text from {filename}")
                            # print("invoice_texts from ingestion", invoice_texts)
                    else:
                        print(f"  [Ingestion] No base64 data for {filename}, skipping PDF extraction.")
                except Exception as e:
                    state["validation_errors"] = state.get("validation_errors", []) + [f"Error reading PDF {filename}: {str(e)}"]
            
            elif filename.lower().endswith((".jpg", ".jpeg", ".png")):
                # For images, we keep the base64 for GPT-4o vision
                mime_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
                invoice_texts.append({
                    "filename": filename, 
                    "base64_data": b64_data, 
                    "mime_type": mime_type,
                    "type": "image"
                })
                print(f"  [Ingestion] Captured image data for {filename}")
            
                state["invoice_raw_text"] = invoice_texts
                
            else:
                print(f"  [Ingestion] Unsupported file type for {filename}, skipping.")
    
    # 2. Handle Single File Upload (legacy/CSV) mostly for bank statements
    #content = state.get("file_content")
    content = state['bank_statement_transactions'][0].get("file_content")
    #file_name = state.get("file_name", "")
    file_name = state['bank_statement_transactions'][0].get("file_name", "")
    
    if content:
        try:
            if file_name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(content))
                #state["raw_dataframe"] = df
                state["standardized_bank_transactions"] = df.to_dict(orient='records')
                state['bank_statement_transactions'] = []
            elif file_name.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(content))
                #state["raw_dataframe"] = df
                state["standardized_bank_transactions"] = df.to_dict(orient='records')
                state['bank_statement_transactions'] = []
            elif file_name.endswith('.pdf') and not raw_docs:
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text = "".join([p.extract_text() or "" for p in pdf.pages])
                    invoice_texts = [{"filename": file_name, "text": text, "type": "text"}]
        except Exception as e:
            msg = f"Error reading {file_name}: {str(e)}"
            state["validation_errors"] = state.get("validation_errors", []) + [msg]
    
    #print("state from ingestion agent", state)
    # return {
    #     "invoice_raw_text": invoice_texts,
    #     "raw_receipts": [], # Clear heavy base64 data from memory
    #     "audit_log": ["Source documents ingested and raw data purged for stability."]
    # }
    
    # I added this 
    # state['bank_statement_transactions'] = [] # Clear heavy bank statement data from memory since we have it in standardized_bank_transactions now
    # state["invoice_raw_text"] = raw_docs
    # state["raw_receipts"] = [] # Clear heavy base64 data from memory
    # state["audit_log"] = state.get("audit_log", []) + ["Source documents ingested and raw data purged for stability."]
    # state["human_approved_invoices"] = []
    
    return {
        **state,
        "standardized_bank_transactions": state.get("standardized_bank_transactions", []),
        "invoice_raw_text": raw_docs,
        "raw_receipts": [],
        "audit_log": state.get("audit_log", []) + ["Source documents ingested and raw data purged for stability."],
        "human_approved_invoices": []
    }
    
    #print("state from ingestion agent", state)
    
    return state        
    
