import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress, LinearProgress,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Fade,
} from "@mui/material";


// import { BarChart, Bar } from "recharts";
import { DataGrid } from "@mui/x-data-grid";
import { DataContext, DataProvider } from "./DataContext";
import { useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function InvoicesPage() {
  const {invoiceFile, companyName, invoicesData, bankKPIs, setInvoicesData, setBankKPIs, threadId, setThreadId} = useContext(DataContext);
  const [tabIndex, setTabIndex] = useState(0);
  const [openConfirm, setOpenConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const transactions = location.state?.transactions || [];
  const [allApproved, setAllApproved] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [journalEntries, setJournalEntries] = useState([]);

  const [reconciling, setReconciling] = useState(false);
  const [reconcileStep, setReconcileStep] = useState(0);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [modelGoal, setModelGoal] = useState("");
  const [usePL, setUsePL] = useState(false);
  const [useBS, setUseBS] = useState(false);
  const [useLedger, setUseLedger] = useState(false);
  const [modelReqs, setModelReqs] = useState("");
  const [modelOutput, setModelOutput] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  //EMail
  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  // for ledger
   
//   When the user clicks "Approve All Invoices", we want to:
// 1. Update the local state to mark all invoices as approved (this gives instant feedback in the UI).
// 2. Send a request to the backend to trigger the reconciliation process immediately with all invoices marked as approved.
// 3. Optionally, we can show a loading state while waiting for the backend to process and return the updated journal entries.
  const handleToggleApprove = async () => {
    if (allApproved) {
      // Unapprove all
      const unapprovedInvoices = invoiceFile.map(inv => ({
        ...inv,
        approved: false
      }));
      setInvoicesData(unapprovedInvoices);
      setAllApproved(false);
      alert("All invoices have been unapproved!");
    } else {
      // Approve all
      const approvedInvoices = invoiceFile.map(inv => ({
        ...inv,
        approved: true
      }));
      setInvoicesData(approvedInvoices);
      setAllApproved(true);
      alert("All invoices have been approved!");

      // ✅ Trigger reconciliation immediately
      try {
        setReconciling(true);
        setReconcileStep(1); // Step 1: Starting reconciliation

        const response = await fetch(
          `http://127.0.0.1:8002/agent/session/${threadId}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modifications: {
                status: "approved",
                human_approved_invoices: approvedInvoices
              }
            })
          }
        );

        setReconcileStep(2); // Step 2: Matching invoices with bank transactions

        // ✅ Then fetch updated state
        const stateRes = await fetch(
          `http://127.0.0.1:8002/agent/session/${threadId}/state`
        );
        
        const data = await response.json();
        const stateData = await stateRes.json();
        console.log("Raw response:", data.state);
        console.log("Updated state:", stateData);

        if (stateData.journal_entries) {
          console.log("Journal entries received:", stateData.journal_entries);
          setJournalEntries(stateData.journal_entries);
        }

        setReconcileStep(3); // Step 3: Done
      } catch (err) {
        console.error("Reconciliation failed:", err);
        setReconciling(false);
      }
    }
};

  const columns = [
    { field: "date", headerName: "Date", flex: 1, headerClassName: "custom-header" },
    { field: "vendor_name", headerName: "Vendor Name", flex: 2, headerClassName: "custom-header" },
    { field: "client_name", headerName: "Client Name", flex: 2, headerClassName: "custom-header" },
    { field: "description", headerName: "Description", flex: 3, headerClassName: "custom-header" },
    { field: "amount", headerName: "Amount", flex: 1, headerClassName: "custom-header" },
    { field: "source_file", headerName: "Source File", flex: 2, headerClassName: "custom-header" },
    {
      field: "approved",
      headerName: "Approved",
      flex: 1,
      headerClassName: "custom-header",
      renderCell: (params) => (
        <Button
          variant="outlined"
          color={params.row.approved ? "success" : "error"}
          onClick={() =>
            params.row.approved
              ? handleRowApprove(params.row.id)
              : handleRowUnapprove(params.row.id)
          }
        >
          {params.row.approved ? "Approved" : "Unapprove"}
        </Button>
      )
    },
]

  const handleBack = () => {
    navigate("/");
  };

  const handleClearData = () => {
    setInvoicesData([]);
    setBankKPIs({});
    setOpenConfirm(false);
    navigate("/"); // go back after clearing
  };
  
  const handleRowApprove = (rowId) => {
  const updatedInvoices = invoiceFile.map((inv, idx) =>
    idx + 1 === rowId ? { ...inv, approved: true } : inv
  );
  setInvoicesData(updatedInvoices);
};

  
const handleRowUnapprove = (rowId) => {
  // Mark the row as unapproved
  const updatedInvoices = invoiceFile.map((inv, idx) =>
    idx + 1 === rowId ? { ...inv, approved: false } : inv
  );
  setInvoicesData(updatedInvoices);

  // Prompt for deletion
  setRowToDelete(rowId);
  setOpenDeleteConfirm(true);
};

// console.log("InvoicesPage threadId:", threadId);


// const handleRowToggle = (rowId) => {
//   const updatedInvoices = invoiceFile.map((inv, idx) =>
//     idx + 1 === rowId ? { ...inv, approved: !inv.approved } : inv
//   );
//   setInvoicesData(updatedInvoices);
// };

return (
   <Box sx={{ width: "100%"  }}>

      {/* Header */}
          {/* <header className="app-header">
            <Typography variant="h4" className="header-title">
               Financial Analysis App
            </Typography>
          </header> */}

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
          {/* <button class="btn-ghost" onClick={() => setOpenUploadPrompt(true)}>
            <span class="pill"><span class="dot"></span> Upload files</span>
          </button> */}
          {/* <button class="btn-ghost">Docs</button> */}
          {/* <button class="btn-ghost">Sign in</button> */}
          {threadId && (
            <span className="pill">
              <span className="dot"></span> Signed in as {companyName}
            </span>
          )}
        </div>
      </header>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px" }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "700", color: "#dde1eb"}}>
          Reconciliation & Analysis
        </Typography>

        <Box sx={{ display: "flex", gap: "10px" }}>
          {/* Back Button */}
          <Button
            variant="outlined"
            onClick={handleBack}
            sx={{ borderRadius: "8px", fontWeight: "600", color: "#1d4ed8", borderColor: "#1d4ed8" }}
          >
            ⬅ Back to Upload
          </Button>

          {/* ✅ Only show these when tabIndex === 0 */}
          {tabIndex === 0 && (
            <>
          {/* Clear Data Button */}
          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenConfirm(true)}
            sx={{ borderRadius: "8px", fontWeight: "600" }}
          >
            🗑 Clear Data
          </Button>
          {/* Approval button */}
          <Button
            variant="contained"
            color={allApproved ? "warning" : "success"}
            onClick={handleToggleApprove}
            sx={{ borderRadius: "8px", fontWeight: "600" }}
          >
            {allApproved ? "❌ Unapprove All Invoices" : "✅ Approve All Invoices"}
        </Button>
      </> 
      )}
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Confirm Clear Data</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all invoices and KPIs? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleClearData} color="error" variant="contained">
            Yes, Clear Data
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to delete this unapproved invoice record?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const updatedInvoices = invoiceFile.filter(
                (inv, idx) => idx + 1 !== rowToDelete
              );
              setInvoicesData(updatedInvoices);
              setOpenDeleteConfirm(false);
              setRowToDelete(null);
            }}
            color="error"
            variant="contained"
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>


      {/* <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ marginBottom: "20px" }}>
        <Tab label="Invoices & Receipts" />
        <Tab label="Data Preview" />
        <Tab label="Validation" />
        <Tab label="Journal Entries" />
        <Tab label="Detailed  Ledgers" />
        <Tab label="Trial Balance" />
      </Tabs> */}

      <Tabs
        value={tabIndex}
        onChange={(e, v) => setTabIndex(v)}
        variant="fullWidth"
        sx={{
          width: "100%",
          marginBottom: "20px",
          backgroundColor: "transparent",       // same as page background
          "& .MuiTab-root": {
            color: "#fff",                       // default text white
            fontWeight: 600,
            textTransform: "none",
            fontSize: "16px",
            borderRadius: "6px",
            transition: "background-color 0.3s ease",
          },
          "& .Mui-selected": {
            color: "#fff",                       // keep selected text white
            backgroundColor: "#0d47a1",          // dark blue highlight for selected tab
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "transparent",      // remove yellow underline, blend in
          },
        }}
      >
        <Tab label="Invoices & Receipts" />
        <Tab label="Data Preview" />
        <Tab label="Validation" />
        <Tab label="Journal Entries" />
        <Tab label="Detailed Ledgers" />
        <Tab label="Trial Balance" />
        <Tab label="Financial Modeling" />
        <Tab label="CFO Chat" />
      </Tabs>


      {tabIndex === 0 && (
        <Card 
          // sx={{ padding: "20px" }}
          sx={{
            padding: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.01)", // subtle translucent layer over page bg
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",       // soft shadow for depth
            backdropFilter: "blur(6px)",                   // glassy effect
            color: "#fff",                                 // text stays white
          }}
        
        >
          <Typography variant="h6" gutterBottom>
            Extracted Invoices (For Verification)
          </Typography>
          {/* <DataGrid
            
            sx={{
            padding: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.01)", // subtle translucent layer over page bg
            // borderRadius: "12px",
            // boxShadow: "0 4px 12px rgba(0,0,0,0.2)",       // soft shadow for depth
            // backdropFilter: "blur(6px)",                   // glassy effect
            color: "#fff",                                 // text stays white
          }}
            rows={invoiceFile.map((inv, idx) => ({ id: idx + 1, ...inv }))}
            columns={columns}
            autoHeight
          /> */}

            <DataGrid
                rows={invoiceFile.map((inv, idx) => ({ id: idx + 1, ...inv }))}
                columns={columns}
                autoHeight
                sx={{
                  padding: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.01)",
                  color: "#fff",

                  // Header row container
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                  },

                  // Header cells (this is where headerName text lives)
                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontWeight: 700,
                  },

                  "& .MuiDataGrid-cell": {
                    color: "#fff",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  },

                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
            />

        </Card>
      )}

      {tabIndex === 1 && (
        <Card sx={{ padding: "20px" }}>
          <Typography variant="h6">Data Preview</Typography>
          <pre>{JSON.stringify(invoiceFile, null, 2)}</pre>
        </Card>
      )}

      {tabIndex === 2 && (
        <Card sx={{ padding: "20px" }}>
          <Typography variant="h6">Validation Results</Typography>
          <pre>{JSON.stringify(bankKPIs, null, 2)}</pre>
        </Card>
      )}

      {/* // for Journal Entries */}
      {/* {tabIndex === 3 && ( // Journal Entries tab
          <Card sx={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Journal Entries (Reconciled Records)
            </Typography>
            <DataGrid
              rows={journalEntries.map((entry, idx) => ({ id: idx + 1, ...entry }))}
              columns={[
                { field: "date", headerName: "Date", flex: 1 },
                { field: "account", headerName: "Account", flex: 2 },
                { field: "debit", headerName: "Debit", flex: 1 },
                { field: "credit", headerName: "Credit", flex: 1 },
                { field: "description", headerName: "Description", flex: 3 },
                { field: "ref", headerName: "Source File", flex: 2 }
              ]}
              autoHeight
              pageSize={5}
            />
          </Card>
        )} */}

       {tabIndex === 3 && ( // Journal Entries tab
          <Card
            sx={{
              padding: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.05)", 
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              backdropFilter: "blur(6px)",
              color: "#fff",
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Journal Entries (Reconciled Records)
            </Typography>

            <DataGrid
              rows={journalEntries.map((entry, idx) => ({ id: idx + 1, ...entry }))}
              columns={[
                { field: "date", headerName: "Date", flex: 1, headerClassName: "custom-header" },
                { field: "account", headerName: "Account", flex: 2, headerClassName: "custom-header" },
                { field: "debit", headerName: "Debit", flex: 1, headerClassName: "custom-header" },
                { field: "credit", headerName: "Credit", flex: 1, headerClassName: "custom-header" },
                { field: "description", headerName: "Description", flex: 3, headerClassName: "custom-header" },
                { field: "ref", headerName: "Source File", flex: 2, headerClassName: "custom-header" }
              ]}
              autoHeight
              pageSize={5}
              sx={{
                backgroundColor: "transparent",
                color: "#fff",

                // Header row container
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "rgba(255,255,255,0.08)", // dark overlay instead of white
                },

                // Header cells
                "& .MuiDataGrid-columnHeader": {
                  color: "#fff",
                  fontWeight: 700,
                },

                // Header text span
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#fff",
                },

                // Body cells
                "& .MuiDataGrid-cell": {
                  color: "#fff",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                },

                // Row hover
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },

                // Selected row
                "& .MuiDataGrid-row.Mui-selected": {
                  backgroundColor: "rgba(13,71,161,0.6)",
                  color: "#fff",
                },
              }}
            />
          </Card>
        )}

        {/* tab for ledger */}
       

        {reconciling && (
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
            {reconcileStep < 3 ? (
              <>
                <CircularProgress color="primary" />
                <Typography variant="h6" sx={{ marginTop: 2 }}>
                  {reconcileStep === 1 && "🔄 Starting reconciliation…"}
                  {reconcileStep === 2 && "📑 Matching invoices with bank transactions…"}
                </Typography>
                <LinearProgress sx={{ width: "100%", marginTop: 2 }} />
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ marginBottom: 2 }}>
                  ✅ Reconciliation complete! Please check the Journal tab for records.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setReconciling(false);   // hide overlay
                    setReconcileStep(0);     // reset steps
                  }}
                >
                  OK
                </Button>
              </>
            )}
          </Card>
        </Box>
      )}

{/* financial model */}
{tabIndex === 6 && (
  <Box 
  // sx={{ p: 2 }}
    sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        mt: 3,
      }}
  >
    <Box
      sx={{
        width: "60%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "12px",
        p: 4,
        boxShadow: 3,
      }}
    >
    {isLoading ? (
      // 2. Loading state
      <Fade in={isLoading} timeout={800}>
        <Box sx={{ mt: 5, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <CircularProgress color="info" size={60} />
          <Typography variant="body1" sx={{ color: "#fff", mt: 2 }}>
            The Financial Modeling Agent is working on your request...
          </Typography>
        </Box>
      </Fade>
    ) : modelOutput ? (
        // 3. Model output (your existing block)
        <Box sx={{ mt: 3, width: "100%" }}>
          {/* Title */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>
            {modelOutput.model_title}
          </Typography>

          {/* Executive Summary */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>
            Executive Summary
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
            {modelOutput.executive_summary}
          </Typography>

          {/* Assumptions */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>
            Assumptions
          </Typography>
          {/* <ul>
            {modelOutput.assumptions?.map((a, idx) => (
              <li key={idx} style={{ color: "white" }}>
                {a.description} {a.value ? `: ${a.value}` : ""}
              </li>
            ))}
          </ul> */}

          <ul>
            {modelOutput.assumptions?.map((assumptionObj, idx) => (
              <li key={idx} style={{ color: "white" }}>
                {Object.entries(assumptionObj).map(([key, val]) => (
                  <div key={key}>
                    <strong>{key}</strong>: {val}
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {/* Strategic Observations */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>
            Strategic Observations
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
            {modelOutput.strategic_observations}
          </Typography>

          {/* Monthly Projections */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>
                  Monthly Projections
                </Typography>
                <Table sx={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(modelOutput.projections.monthly[0]).map((col) => (
                        <TableCell key={col} sx={{ color: "#fff" }}>
                          {col.replace("_", " ")}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modelOutput.projections.monthly.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.keys(row).map((col) => (
                          <TableCell key={col} sx={{ color: "#fff" }}>
                            {row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

          {/* Yearly Projections */}
          {modelOutput.projections?.yearly && (
            <>
              <Typography variant="h6" sx={{ color: "#fff", mb: 2, mt: 4 }}>
                Yearly Projections
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff" }}>
                Total Revenue: {modelOutput.projections.yearly.total_revenue}
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff" }}>
                Total Net Profit: {modelOutput.projections.yearly.total_net_profit}
              </Typography>
            </>
          )}

          {/* Recommendations */}
          <Typography variant="h6" sx={{ color: "#fff", mb: 1, mt: 4 }}>
            Recommendations
          </Typography>
          <ul>
            {modelOutput.recommendations?.map((r, idx) => (
              <li key={idx} style={{ color: "white" }}>
                {typeof r === "string" ? r : r.description}
              </li>
            ))}
          </ul>

           {/* buttons for interactions */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Button
                variant="outlined"
                sx={{ mr: 2 }}
                onClick={() => {
                  setModelOutput(null);
                  // setModelGoal("");
                  // setModelReqs("");
                  // setUsePL(false);
                  // setUseBS(false);
                  // setUseLedger(false);
                  // setIsLoading(false);

                  //setThreadId(uuidv4());  // new session ID
                  }
                }
              >
                Run New Model
              </Button>
              <Button
                variant="outlined"
                sx={{ mr: 2 }}
                onClick={() => window.print()}
              >
                Print Report
              </Button>
              <Button
                variant="contained"
                color="info"
                sx={{ mr: 2 }}
                onClick={() => {
                  //alert("Email functionality coming soon!");
                  setOpenEmailModal(true)
                }}
              >
                Send via Email
              </Button>
          </Box>

        </Box>      
         
    ) : (
        // 1. Input form (your fields + Run Model button)
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          p: 4,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" sx={{ color: "#fff", mb: 2 }}>Financial Modeling Agent</Typography>
          <TextField
            fullWidth
            label="Goal"
            placeholder="e.g. Forecast cash flow for 6 months"
            value={modelGoal}
            onChange={(e) => setModelGoal(e.target.value)}
            // sx={{ mt: 2 }}
            sx={{
              mt: 2,
              backgroundColor: "#fff",
              borderRadius: "6px",
              "& .MuiInputBase-input": {
                color: "#000", // black text inside
              },
            }}
          />
        <FormGroup sx={{ mt: 2, alignSelf: "flex-start" }}>
          <FormControlLabel
            control={<Checkbox checked={usePL} onChange={(e) => setUsePL(e.target.checked)} />}
            label="Use Profit & Loss"
          />
          <FormControlLabel
            control={<Checkbox checked={useBS} onChange={(e) => setUseBS(e.target.checked)} />}
            label="Use Balance Sheet"
          />
          <FormControlLabel
            control={<Checkbox checked={useLedger} onChange={(e) => setUseLedger(e.target.checked)} />}
            label="Use Ledger"
          />
        </FormGroup>
        <TextField
          fullWidth
          label="Specific Requirements"
          placeholder="e.g. Include seasonal adjustments"
          value={modelReqs}
          onChange={(e) => setModelReqs(e.target.value)}
          // sx={{ mt: 2 }}
          sx={{
            mt: 2,
            backgroundColor: "#fff",
            borderRadius: "6px",
            "& .MuiInputBase-input": {
              color: "#000", // black text inside
            },
          }}
        />
        <Button
          variant="contained"
          // sx={{ mt: 2 }}
          sx={{ mt: 3, width: "200px" }}
          onClick={async () => {
            setIsLoading(true);
            setModelOutput(null); // clear previous result

            try {

                    const res = await fetch(
                  `http://127.0.0.1:8002/agent/session/${threadId}/model`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_goal: modelGoal,
                      statements_to_use: [
                        ...(usePL ? ["profit_and_loss"] : []),
                        ...(useBS ? ["balance_sheet"] : []),
                        ...(useLedger ? ["ledger"] : []),
                      ],
                      specific_requirements: modelReqs,
                    }),
                  }
                );
                const data = await res.json();
                console.log("Modeling response:", data);
                setModelOutput(data.state.financial_model)

              }catch (error) {
                console.error("Modeling error:", error);
              } finally {
                setIsLoading(false);
              }
            }
          }
        >
          Run Model
        </Button>
        {/* // input ends here */}
        <Typography variant="body2" sx={{ color: "#aaa", mt: 3 }}>
               Please run the model to see the output here.
        </Typography>
      </Box>
      )}
    </Box>
  </Box>
)}  

{/* chat panel */}
{tabIndex === 7 && (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "80vh",
      // backgroundColor: "#ece5dd"
      background: "linear-gradient(180deg, #0b1a33 0%, #091a2f 100%)", 
      borderRadius: "12px",
      overflow: "hidden",
    }}
  >
    {/* Chat Messages */}
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      {chatHistory.map((entry, idx) => (
        <Box
          key={idx}
          sx={{
            alignSelf: entry.q ? "flex-end" : "flex-start",
            backgroundColor: entry.q ? "#dcf8c6" : "#fff",
            //backgroundColor: entry.q ? "#595c81" : "#fff",
            color: "#000",
            borderRadius: "12px",
            p: 1.5,
            maxWidth: "70%",
            boxShadow: 1,
          }}
        >
          <Typography variant="body2">
            {/* {entry.q || entry.a} */}
            {entry.q ? entry.q : entry.a}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: entry.q ? "right" : "left",
              mt: 0.5,
              color: "gray",
              fontSize: "0.75rem",
            }}
          >
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* Input Bar */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        backgroundColor: "#f0f0f0",
      }}
    >
      <TextField
        fullWidth
        placeholder="Type a message..."
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        sx={{
          backgroundColor: "#fff",
          borderRadius: "20px",
          "& .MuiInputBase-input": { color: "#000" },
        }}
      />
      <Button
        variant="contained"
        sx={{ ml: 2, borderRadius: "50%", minWidth: "50px" }}
        onClick={async () => {
          try {
          const res = await fetch(
            `http://127.0.0.1:8002/agent/session/${threadId}/chat`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                thread_id: threadId,
                message: chatInput,
                chat_history: chatHistory.map((entry) => ({
                  role: entry.q ? "user" : "assistant",
                  content: entry.q || entry.a,
                })),
              }),
            }
          );
          const data = await res.json();
          const refinedReply = data.reply
            .replace(/###/g, "")       // remove headers
            .replace(/\*\*/g, "")      // remove bold markers
            .replace(/\n{2,}/g, "\n")  // collapse extra line breaks
            .trim();

          console.log("This is the data from the chat response:", data);
          setChatHistory((prev) => [
            ...prev,
            {
              q: chatInput, timestamp: new Date().toISOString() },   // user bubble
            //{ a: data.reply, timestamp: new Date().toISOString() }, // CFO bubble
            { a: refinedReply, timestamp: new Date().toISOString() }, // CFO bubble
              // timestamp: new Date().toISOString(), // ✅ store timestamp
            // </Box></Box>},
          ]);
          setChatInput("");
          console.log("Updated chat history:", chatHistory);

        } catch (error) {
          console.error("Error occurred while fetching chat response:", error);
        }
      }
    }
      >
        ➤
      </Button>
    </Box>
  </Box>
)}

    {/* email pop up */}

<Dialog open={openEmailModal} onClose={() => setOpenEmailModal(false)}>
  <DialogTitle>Send Report via Email</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="Recipient Email"
      type="email"
      fullWidth
      value={recipientEmail}
      onChange={(e) => setRecipientEmail(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenEmailModal(false)}>Cancel</Button>
    <Button
      onClick={async () => {
        try {
          const res = await fetch("http://127.0.0.1:8002/agent/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipientEmail,
              subject: "Financial Forecast Report",
              // body: JSON.stringify(modelOutput, null, 2), // or format nicely
              body: "Hello,\n\nPlease find attached the latest financial forecast generated by our modeling agent...",
              forecast: modelOutput
            }),
          });
          if (res.ok) {
            console.log("Value of res",res)
            alert("Email sent successfully!");
          } else {
            alert("Failed to send email.");
          }
        } catch (err) {
          console.error(err);
          alert("Error sending email.");
        } finally {
          setOpenEmailModal(false);
        }
      }}
    >
      Send
    </Button>
  </DialogActions>
</Dialog>



      {/* Footer */}
        {/* <footer
          style={{
            backgroundColor: "rgba(29,78,216,0.9)",
            padding: "15px",
            textAlign: "center",
            color: "white",
          }}
        >
          <Typography variant="body2">
            © 2026 Financial Analysis Dashboard — Powered by Data Engineering and AI Team
          </Typography>
      </footer> */}

      <footer class="foot">
        <div>© 2026 AI Bookkeeper <span class="dot"></span> Powered by Snapnet Team</div>
        <div>Privacy <span class="dot"></span> Terms <span class="dot"></span> Support</div>
      </footer>
    </Box>
  
  );
}

