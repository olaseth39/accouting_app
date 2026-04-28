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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DataContext, DataProvider } from "./DataContext";
import { useLocation } from "react-router-dom";


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
          <button class="btn-ghost">Docs</button>
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

