import "./AccountingApp.css";
import React, { useContext, useState, useEffect } from "react";
import { Grid, Card, CardContent,Box, Dialog, DialogTitle, DialogContent, DialogActions, Container, CircularProgress, LinearProgress, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, Button, MenuItem, Select } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { DataContext } from "./DataContext";   // ✅ use DataContext, not DataProvider


 // 🔹 Initialize your invoicesList with dummy data
 // 🔹 Dummy invoices data for testing frontend
  const dummyInvoices = [
    {
      date: "2026-04-01",
      vendor_name: "ABC Supplies Ltd",
      description: "Office stationery purchase",
      amount: 250.0,
      source_file: "invoice_april.pdf",
    },
    {
      date: "2026-04-03",
      vendor_name: "XYZ Electronics",
      description: "Laptop repair service",
      amount: 120.0,
      source_file: "invoice_xyz.pdf",
    },
    {
      date: "2026-04-05",
      vendor_name: "FreshFoods Market",
      description: "Team lunch catering",
      amount: 450.0,
      source_file: "invoice_foods.pdf",
    },
    {
      date: "2026-04-07",
      vendor_name: "Global Transport",
      description: "Delivery charges",
      amount: 75.0,
      source_file: "invoice_transport.pdf",
    },
  ];

  
function AccountingApp() {
  const navigate = useNavigate();
  const { threadId, companyName, setCompanyNameState, invoiceFile, setInvoicesData, setBankKPIs, setThreadId } = useContext(DataContext);
  //const [companyNameInput, setCompanyNameInput] = useState(""); // ✅ local state
  const [fileType, setFileType] = useState("transaction");

  // Single file states
  const [uploadedFile, setUploadedFile] = useState(null);

  // Combined option states
  //const [invoiceFile, setInvoiceFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  // Output states
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [erpSummary, setErpSummary] = useState(null);
  const [invoicesList, setInvoicesList] = useState(null);
  const [bankKPIs] = useState(null);
  //const [invoicesFile, setInvoicesFile] = useState(dummyInvoices);
  const [pnlReport, setPnlReport] = useState(null); // store P&L JSON
  const [bsReport, setBsReport] = useState([]);   // store Balance Sheet JSON
  const [analysisResult, setAnalysisResult] = useState(null);  

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const [openUploadPrompt, setOpenUploadPrompt] = useState(false);

  //const [companyName, setCompanyName] = useState("");
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [openSessionModal, setOpenSessionModal] = useState(false);


  // React.useEffect(() => {
  //   setInvoicesData(dummyInvoices); // populate context with dummy data
  // }, []);

  const handleUploadClick = () => {
    if (!threadId) {
      console.log("Existing session found with threadId:", threadId);
      // No session yet → notify user
    alert("You need to create an accounting session before uploading files.");
    } else {
      // Session exists → open upload dialog directly
      console.log(threadId, "Session exists. Opening upload prompt.");
      setOpenUploadPrompt(true);
    }
};

// Sign in button click
  // const handleSignInClick = () => {
  //   setOpenSessionModal(true);
  // };

const handleSessionClick = () => {
  if (threadId) {
    // Kill session
    setThreadId(null, null);
    alert("Session ended.");
  } else {
    // Open modal to create session
    setOpenSessionModal(true);
  }
};
  

  // Step 1: Initialize session
  const initSession = async () => {

    // Check if a session already exists
    if (threadId) {
      alert("You have already started an accounting session.");
      return;
    }

    if (!companyName) {
      alert("Please enter a company name.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("company_name", companyName);
       //formData.append("company_name", companyNameInput)

      const res = await fetch("http://127.0.0.1:8002/agent/session", {
        method: "POST",
        body: formData,

      });
      
      const data = await res.json();
      setThreadId(data.thread_id, data.company_name)
      console.log("Session initialized:", data);

      //setThreadId(data.thread_id); // ✅ Save threadId in context
      alert(`Accounting session created for ${data.company_name}`);
      setOpenSessionModal(false);  // close company name modal
      //setSessionInitialized(true); // ✅ Unlock upload UI
      //setOpenUploadPrompt(true);   // open upload dialog
    } catch (err) {
      console.error("Session init failed:", err);
    }
  };


  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadedFile(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);

    try {
      const response = await fetch("/agent/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (fileType === "transaction") {
        setColumns(result.columns || []);
        setRows(result.rows || []);
      } else if (fileType === "erp") {
        setErpSummary(result.summary || {});
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  // Drag & drop handler
  const handleDrop = (event, setter) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setter(file);
    }
  };

  const handleCombinedUpload = async () => {
  if (!invoiceFile || !bankFile) {
    alert("Please upload the required files.");
    return;
  }

  const formData = new FormData();
  // Append each invoice file individually
  invoiceFile.forEach(file => {
    formData.append("invoice", file);   // key name must match backend param
  });
  //formData.append("invoice", invoiceFile);        // must match backend param name
  formData.append("bank_statement", bankFile);    // must match backend param name

  console.log(formData.get("invoice")); // Debug: Check if invoice file is in FormData
  console.log(formData.get("bank_statement")); // Debug: Check if bank statement file is in FormData

  try {
    console.log("Sending request to /agent/upload…");
    setLoading(true);
    setProgressStep(1); // Uploading

    // const response = await fetch("http://127.0.0.1:8001/agent/upload", {
    //   method: "POST",
    //   body: formData,
    // });

    const uploadRes = await fetch(
      `http://127.0.0.1:8002/agent/session/${threadId}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    setProgressStep(2); // Extracting data
    const uploadResult = await uploadRes.json();
    console.log("Upload result:", uploadResult);


    // 2. Run pipeline
    const runRes = await fetch(
      `http://127.0.0.1:8002/agent/session/${threadId}/run`,
      { method: "POST" }
    );

    const runResult = await runRes.json();
    console.log("Run result:", runResult);
    
    setProgressStep(3);

    // if (!runResult.ok) {
    //   throw new Error(`Server error: ${runResult.status}`);
    //   console.log("Response status:", runResult.status);
    // }

    //console.log("Response status:", runResult.status);

    //const result = await runResult.json();
    console.log("Backend response:", runResult);
    setProgressStep(4); // Generating reports

    // 3. Fetch state
    const stateRes = await fetch(
      `http://127.0.0.1:8002/agent/session/${threadId}/state`
    );
  const stateResult = await stateRes.json();
  console.log("State result:", stateResult);

    
    // Save backend response in Context
  setInvoicesData(stateResult.extracted_receipts || []); // Save extracted transactions
    //setInvoicesData(result.invoices  || []); // Save extracted transactions

    //console.log("Setting invoices data in context:", invoiceFile);

    setBankKPIs({
      invoiceView: stateResult.invoice_tabular_view,
      status: stateResult.status,
      audit_log: stateResult.audit_log,
      invoice_raw_text: stateResult.invoice_raw_text,

    });
    //setThreadId(stateResult.thread_id, stateResult.company_name);
    setThreadId(threadId, companyName)   // ✅ capture threadId and company name here
    console.log("Updated threadId in context:", threadId, companyName);
    setProgressStep(4); // Done
    navigate("/analysis");
  } catch (err) {
    console.error("Combined upload failed:", err);
  }
    finally {
    setLoading(false);
    setProgressStep(0);
  }
   
};

 
return (
  <div className="app-container">
    {/* Header */}
    {/* <header className="app-header"> */}
      {/* Logo at far left */}
       {/* <img src="/snapnetlogojpeg.jpg" alt="App Logo" className="nav-logo" /> */}
       {/* <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: "700" }}>
          AI Bookkeeper
      </Typography> */}
    {/* </header> */}

    <header class="nav">
        <div class="brand">
          <div class="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/></svg>
          </div>
          <div class="brand-text">
            <b>AI Bookkeeper</b>
            <span>by Snapnet</span>
          </div>
        </div>
        <div class="nav-actions">
          {/* <span class="pill"><span class="dot"></span> All systems normal</span> */}
          {/* <button class="btn-ghost" onClick={() => setOpenUploadPrompt(true)}> */}
          <button className="btn-ghost" onClick={handleUploadClick}>
            <span class="pill"><span class="dot"></span> Upload files</span>
          </button>
          {/* <button class="btn-ghost">Docs</button> */}
          <button class="btn-ghost" onClick={handleSessionClick}>
            {threadId ? "Kill Session" : "Create Session"}
          </button>
          {threadId && (
            <span className="pill">
              <span className="dot"></span> Signed in as {companyName}
            </span>
          )}
        </div>
    </header>

    {/* session id */}
    <Dialog
      open={openSessionModal}
      onClose={() => setOpenSessionModal(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Initialize Accounting Session</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          You are about to start a new accounting session. Please enter your company name:
        </Typography>
        <input
          type="text"
          value={companyName} 
          //onChange={(e) => setCompanyName(e.target.value)}
          onChange={(e) => setCompanyNameState(e.target.value)}
          placeholder="Company Name"
          style={{ width: "100%", padding: "8px", marginTop: "10px" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenSessionModal(false)}>Cancel</Button>
        <Button variant="contained" onClick={initSession}>OK</Button>
      </DialogActions>
    </Dialog>

    {/* sign in modal */}
    <Dialog
      open={openSessionModal}
      onClose={() => setOpenSessionModal(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Create Accounting Session</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Please enter your company name to create a new accounting session:
        </Typography>
        <input
          type="text"
          value={companyName} 
          // onChange={(e) => setCompanyName(e.target.value)}
          onChange={(e) => setCompanyNameState(e.target.value)}
          // placeholder="Company Name"
          style={{ width: "100%", padding: "8px", marginTop: "10px" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenSessionModal(false)}>Cancel</Button>
        <Button variant="contained" onClick={initSession}>OK</Button>
      </DialogActions>
    </Dialog>

    {/* Main Content */}
   
  {/* <Grid item xs={12} md={12}> */}
    {/* Nested container that holds both Upload and Analysis */}
    <Grid container spacing={2}>
      
      {/* Upload Segment (left side) */}
      {/* <Grid item xs={12} md={4}> */}
      

      {/* Analysis Segment (right side) */}
      {/* <Grid item xs={12} md={8}> */}
        <Grid size={12}>
          <section className="card">
            <div className="card-inner intro-inner">
              <span className="badge">● AI-powered bookkeeping</span>
              <h1 className="h-hero">
                Turn raw documents into <span className="grad">audit-ready books</span>.
              </h1>
              <p className="lead">
                AI Bookkeeper extracts data from your <strong>invoices</strong>, <strong>journals</strong>,
                <strong>ERP ledgers</strong>, and <strong>bank statements</strong> — then instantly generates
                reconciliations, trial balances, and discrepancy reports. No spreadsheets. No copy-paste.
              </p>
              <p className="lead">
                  <b>Try it now:</b> Click the <b>Upload files</b> button to upload your invoices and bank statements, and see how AI Bookkeeper can transform your accounting workflow. 
              </p>

              {/* Visual flow */}
              <div className="visual">
                <div className="flow">
                  <div className="doc">
                    <h5>INVOICE #INV-2041</h5>
                    <div className="row"><span className="muted">Acme Ltd.</span><span>$ 12,400.00</span></div>
                    <div className="row"><span className="muted">Consulting</span><span>$ 3,200.00</span></div>
                    <div className="row"><span className="muted">VAT 7.5%</span><span>$ 1,170.00</span></div>
                    <div className="row"><span>Total</span><span>$ 16,770.00</span></div>
                  </div>
                  <div className="arrow"></div>
                  <div className="out">
                    <div className="out-row"><span>Journal entries</span><b>248 created</b></div>
                    <div className="out-row"><span>Matched txns</span><b className="ok">96.4%</b></div>
                    <div className="out-row"><span>Trial balance</span><b className="ok">Balanced</b></div>
                    <div className="out-row" style={{ marginBottom: 0 }}>
                      <span>Discrepancies</span><b>3 flagged</b>
                    </div>
                    <div className="progress"><i></i></div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="features">
                <div className="feat">
                  <div className="ic">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/>
                      <rect x="7" y="12" width="3" height="6"/>
                      <rect x="12" y="8" width="3" height="10"/>
                      <rect x="17" y="5" width="3" height="13"/>
                    </svg>
                  </div>
                  <h4>Trial Balance</h4>
                  <p>Auto-generated, double-entry verified, ready to export.</p>
                </div>

                <div className="feat">
                  <div className="ic">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h4>Ledger Extraction</h4>
                  <p>Pulls structured data from PDFs, scans, and ERP exports.</p>
                </div>

                <div className="feat">
                  <div className="ic">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <h4>Smart Reconciliation</h4>
                  <p>Matches invoices to bank lines and flags every variance.</p>
                </div>
              </div>
            </div>
          </section>
      </Grid>
    </Grid>
  {/* </Grid> */}

  <Dialog
  open={openUploadPrompt}
  onClose={() => setOpenUploadPrompt(false)}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>Upload Files</DialogTitle>
  <DialogContent>
    <Grid size={12}>
      <Card className="upload-card" >
          <Typography variant="h5" gutterBottom className="upload-title" >
            Upload File
          </Typography>

          <Select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            fullWidth
            className="select-input"
          >
            <MenuItem value="transaction">Transaction File</MenuItem>
            <MenuItem value="erp">ERP Ledger (Optional)</MenuItem>
            <MenuItem value="combined">Invoices + Bank Statement</MenuItem>
          </Select>

          {fileType === "transaction" || fileType === "erp" ? (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setUploadedFile)}
                className="drag-drop-zone"
              >
                <label htmlFor="file-upload" className="drag-drop-label">
                  📂 Drag & drop file here or click to choose
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>

              {uploadedFile && (
                <Typography variant="body2" className="selected-file">
                  ✅ Selected {fileType} file: {uploadedFile.name}
                </Typography>
              )}
            </>
          ) : (
            <>
              {/* <Typography variant="body2" gutterBottom>
                Upload Invoices File:
              </Typography> */}

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setInvoicesData)}
                className="drag-drop-zone"
              >
                <label htmlFor="invoice-upload" className="drag-drop-label">
                  📂 Drag & drop invoice file here or click to choose
                </label>
                <input
                  id="invoice-upload"
                  type="file"
                  accept=".pdf"
                     //onChange={(e) => setInvoiceFile(e.target.files[0])}
                  onChange={(e) => setInvoicesData(Array.from(e.target.files))}
                  style={{ display: "none" }}
                multiple/>
              </div>

              {invoiceFile && invoiceFile.length > 0 && (
                <div className="selected-file">
                    {invoiceFile.map((file, index) => (
                    <Typography key={index} variant="body2">
                        ✅ Selected invoice file: {file.name}
                    </Typography>
                    ))}
                </div>
                )}

              {/* <Typography variant="body2" gutterBottom>
                Upload Bank Statement File:
              </Typography> */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setBankFile)}
                className="drag-drop-zone"
              >
                <label htmlFor="bank-upload" className="drag-drop-label">
                  📂 Drag & drop bankfile here or click to choose
                </label>
                <input
                  id="bank-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBankFile(e.target.files[0])}
                  style={{ display: "none" }}
                />
              </div>

              {bankFile && (
                <Typography variant="body2" className="selected-file">
                  ✅ Selected {fileType} file: {bankFile.name}
                </Typography>
              )}
            </>
          )}

          <Button
            variant="contained"
            fullWidth
           onClick={() => {
              handleCombinedUpload();      // run your upload logic
              setOpenUploadPrompt(false);  // close the modal afterwards
            }}
            className="upload-button"
          >
            🚀 Start / Analyse
          </Button>
        </Card>
    </Grid>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenUploadPrompt(false)}>Close</Button>
  </DialogActions>
</Dialog>

    {loading && (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1300,
        }}
      >
        <Card sx={{ padding: "30px", borderRadius: "12px", textAlign: "center", minWidth: "300px" }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" sx={{ marginTop: 2 }}>
            
            {progressStep === 0 && "🔄 Starting Pipeline…"}
            {progressStep === 1 && "🔄 Running Pipeline…"}
            {progressStep === 2 && "📊 Extracting files...…"}
            {progressStep === 3 && "📂 Creating Tables...…"}
            {progressStep === 4 && "✅ Analysis complete!"}
          </Typography>
          <LinearProgress sx={{ width: "100%", marginTop: 2 }} />
        </Card>
      </Box>
    )}


    {/* Footer */}
    {/* <footer style={{ backgroundColor: "#1d4ed8", padding: "15px", textAlign: "center", color: "white" }}>
      <Typography variant="body2">
        © 2026 AI Bookkeeper — Powered by Snapnet Team
      </Typography>
    </footer> */}

    <footer class="foot">
      <div>© 2026 AI Bookkeeper <span class="dot"></span> Powered by Snapnet Team</div>
      <div>Privacy <span class="dot"></span> Terms <span class="dot"></span> Support</div>
    </footer>

  </div>
    );
}

export default AccountingApp;

