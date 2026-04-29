from agents.state import AccountingState
from agents.llm_utils import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
import json
import pandas as pd

def transaction_extraction_agent(state: AccountingState) -> AccountingState:
    """Invoice Agent: Extracts data from multiple invoices/receipts (PDF text or Image vision)."""
    print("--- INVOICE EXTRACTION AGENT (LLM) ---")
    
    raw_docs = state.get("invoice_raw_text", [])
    #print("Checking the val of raw document", raw_docs)
    if not raw_docs:
        #print("  [Invoice Agent] No invoice data found to extract.")
        return state
        
    llm = get_llm(temperature=0)
    extracted_invoices = []
    
    sys_prompt = (
        "You are a Senior Forensic Auditor. Extract data from the provided document. "
        "⚠️ EXTREME SKEPTICISM REQUIRED: Many documents contain 'Reference Numbers', 'Invoice IDs', and dates that look like amounts (e.g. 2024001, 142580). "
        "DO NOT EXTRACT THESE AS THE AMOUNT. "
        "1. IGNORE anything labeled 'Ref', 'ID', 'Invoice No', 'No.', 'Order #', 'P.O. #'. "
        "2. AN AMOUNT IS ONLY VALID IF it is explicitly near a currency symbol (₦, $, £) or labeled as 'GRAND TOTAL', 'Total Due', or 'Net Amount'. "
        "3. If a number is > 100,000 and NOT near a 'Total' label or currency symbol, IGNORE IT. Look for a smaller, labeled total. "
        "Return ONLY a JSON object with: 'vendor_name', 'date' (YYYY-MM-DD), 'amount' (float), 'description'."
    )
    
    for item in raw_docs:
        #print("This docs is from extraction_agent", item['file_content'], item.keys(), item["file_type"])
        filename = item.get("file_name")
        doc_type = item.get("file_type", "text")
        file_content = item.get("file_content")
        
        try:
            if doc_type == "text" or doc_type == "pdf": 
                
                text = item.get("text", "")
                # if not text.strip():
                #     continue
                #print("At the extraction-agent")
                #prompt = f"File: {filename}\nContent:\n{text[:6000]}"
                prompt = f"File: {filename}\nContent:\n{file_content[:6000]}"
                messages = [SystemMessage(content=sys_prompt), HumanMessage(content=prompt)]
                #print("This messages is from extraction_agent",messages)
            else:
                # Multi-modal for images
                b64_data = item.get("base64_data", "")
                mime_type = item.get("mime_type", "image/jpeg")
                if not b64_data:
                    continue
                
                messages = [
                    SystemMessage(content=sys_prompt),
                    HumanMessage(content=[
                        {"type": "text", "text": f"Please extract data from this receipt image: {filename}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
                        }
                    ])
                ]
            
            response = llm.invoke(messages)
            #print("LLM response", response.content)
            raw_contents = response.content.strip()
            # Handle potential markdown code blocks
            if "```json" in raw_contents:
                raw_json = raw_contents.split("```json")[-1].split("```")[0].strip()
            elif "```" in raw_contents:
                raw_json = raw_contents.split("```")[-1].split("```")[0].strip()
            else:
                raw_json = raw_contents
            
            data = json.loads(raw_json)
            # Ensure fields exist
            data["vendor_name"] = data.get("vendor_name", "Unknown Vendor")
            data["date"] = data.get("date", str(pd.to_datetime("today").date()))
            amt_raw = data.get("amount", 0.0)
            data["amount"] = float(amt_raw)
            data["description"] = data.get("description", f"Extracted from {filename}")
            
            # 🛡️ Outlier Guard: If the number is huge but looks like an ID (e.g., 733358385)
            if data["amount"] > 10000000 and "TOTAL" not in data["description"].upper():
                 msg = f"⚠️ POTENTIAL ID ERROR: Extracted {data['amount']} from {filename}. Flagging as suspicious."
                 state["validation_errors"] = state.get("validation_errors", []) + [msg]
                 data["amount"] = 0.0 # Safety zero to prevent $733M hallucinations
            
            data["source_file"] = filename
            extracted_invoices.append(data)
            msg = f"Extracted from {filename}: {data['vendor_name']} | {data['amount']}"
            state["audit_log"] = state.get("audit_log", []) + [msg]
            #print(f"  [Invoice Agent] {msg}")
            
        except Exception as e:
            msg = f"Failed to extract from {filename}: {str(e)}"
            state["validation_errors"] = state.get("validation_errors", []) + [msg]
            #print(f"  [Invoice Agent] ⚠️ {msg}")
            
    # Create Tabular View (Markdown)
    md_table = ""
    if extracted_invoices:
        #print("this is the extracted_invoice", extracted_invoices)
        df = pd.DataFrame(extracted_invoices)
        #print("this is the df", df)
        required_cols = ['date', 'vendor_name', 'description', 'amount', 'source_file']
        for col in required_cols:
            if col not in df.columns:
                df[col] = "N/A"
        md_table = df[required_cols].to_markdown(index=False)
        #print("Generated Markdown table for extracted invoices.", md_table)
        
    print("Am at the final part of the extraction agent, preparing return state") 
    return {
        "extracted_receipts": extracted_invoices,
        #"human_approved_invoices": extracted_invoices,
        "invoice_tabular_view": md_table,
        "invoice_raw_text": [], # Clear heavy text/image data
        "audit_log": [f"Extracted {len(extracted_invoices)} invoices. Intermediate text purged."]
    }