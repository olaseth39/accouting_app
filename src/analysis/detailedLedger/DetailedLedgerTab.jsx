import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import LedgerDetails from "./LedgerDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/** @import { LedgerTableData } from "../../lib/types"*/
/** @import { LedgerSummaryData } from "../../lib/types"*/
/**
 * @typedef {Object} LedgerSections
 * @property {LedgerTableData[]} cash_bank
 * @property {LedgerTableData[]} revenue
 * @property {LedgerTableData[]} service_revenue
 *
 */

/**
 * @typedef {Object} Props
 * @property {LedgerSections | null} ledgerSections
 */

/**
 * @param {Props} props
 */
export default function DetailedLedgerTab({ ledgerSections }) {
  if (!ledgerSections)
    return (
      <p className="banner-text">
        No ledger entries found. Ensure journal entries are generated first.
      </p>
    );

  return (
    <section>
      <h3>Detailed Ledgers</h3>
      <section className="accordion-group">
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              "& .MuiAccordionSummary-expandIconWrapper .MuiSvgIcon-root": {
                color: "var(--text-muted)",
              },
            }}
          >
            Cash / Bank
          </AccordionSummary>
          <AccordionDetails>
            <LedgerDetails tableData={ledgerSections.cash_bank} />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              "& .MuiAccordionSummary-expandIconWrapper .MuiSvgIcon-root": {
                color: "var(--text-muted)",
              },
            }}
          >
            {"Revenue (Unmatched Payments)"}
          </AccordionSummary>
          <AccordionDetails>
            <LedgerDetails tableData={ledgerSections.revenue} />
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              "& .MuiAccordionSummary-expandIconWrapper .MuiSvgIcon-root": {
                color: "var(--text-muted)",
              },
            }}
          >
            {"Service Revenue"}
          </AccordionSummary>
          <AccordionDetails>
            <LedgerDetails tableData={ledgerSections.service_revenue} />
          </AccordionDetails>
        </Accordion>
      </section>
    </section>
  );
}
