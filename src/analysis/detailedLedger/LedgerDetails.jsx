import { DataGrid } from "@mui/x-data-grid";
import { formatToNairaCurrency } from "../../lib/utils";

/** @import { LedgerTableData } from "../../lib/types"*/
/**
 * @typedef {Object} TableData
 * @property {string} date
 * @property {string} description
 * @property {number} debit
 * @property {number} credit
 * @property {string} ref
 */

/**
 * @typedef {Object} LedgerDetailsProps
 * @property {LedgerTableData[]} tableData
 */

/**
 * A reusable component for displaying a title and button.
 * @param {LedgerDetailsProps} props
 * @returns JSX Element
 */
export default function LedgerDetails({ tableData }) {
  // console.log(tableData);
  const total_debit = tableData.reduce((total, value) => {
    return total + value.debit;
  }, 0);
  const total_credit = tableData.reduce((total, value) => {
    return total + value.credit;
  }, 0);
  const net = total_debit - total_credit;
  const formattedTotalDebit = formatToNairaCurrency(total_debit || 0);
  const formattedTotalCredit = formatToNairaCurrency(total_credit || 0);
  const formattedNet = formatToNairaCurrency(net || 0);
  const formattedTableData = tableData.map((data) => {
    return {
      date: data.date,
      description: data.description,
      debit: data.debit,
      credit: data.credit,
      ref: data.ref,
    };
  });
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <DataGrid
        rows={formattedTableData.map((entry, idx) => ({
          id: idx + 1,
          ...entry,
        }))}
        columns={[
          {
            field: "date",
            headerName: "Date",
            flex: 1,
            headerClassName: "custom-header",
          },
          {
            field: "description",
            headerName: "Desription",
            flex: 3,
            headerClassName: "custom-header",
          },
          {
            field: "debit",
            headerName: "Debit",
            flex: 1,
            headerClassName: "custom-header",
          },
          {
            field: "credit",
            headerName: "Credit",
            flex: 1,
            headerClassName: "custom-header",
          },
          {
            field: "ref",
            headerName: "Source File",
            flex: 1,
            headerClassName: "custom-header",
          },
        ]}
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
      <div style={{ display: "flex", gap: "8px", color: "var(--text)" }}>
        <div>
          <span>{`Total Credit: `}</span>
          <span>{formattedTotalDebit}</span>
        </div>
        <span>|</span>
        <div>
          <span>{`Total Debit: `}</span> <span>{formattedTotalCredit}</span>
        </div>
        <span>|</span>
        <div>
          <span>{`Net: `}</span>
          <span>{formattedNet}</span>
        </div>
      </div>
    </div>
  );
}
