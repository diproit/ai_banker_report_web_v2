import React from "react";
import "./LoanPastDueReports.css";
import { ROWS_PER_PAGE, getTodayDate, getVisiblePages } from "./loanQueryUtils";

interface ReportSectionProps {
  error: string | null;
  hasResults: boolean;
  columns: string[];
  paginatedData: any[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  displayBranchName: string;
  displayLoanProductName: string;
  displayGrouping: string;
  onPrint: () => void;
  onExport: () => void;
}

const ReportSection: React.FC<ReportSectionProps> = ({
  error,
  hasResults,
  columns,
  paginatedData,
  totalRows,
  currentPage,
  totalPages,
  onPageChange,
  displayBranchName,
  displayLoanProductName,
  displayGrouping,
  onPrint,
  onExport,
}) => {
  const visiblePages = getVisiblePages(currentPage, totalPages);

  if (!error && !hasResults) {
    return null;
  }

  return (
    <div className="loan-pastdue-results-card">
      <div className="report-results">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {hasResults ? (
          <div className="loan-report-card">
            <div className="report-toolbar">
              <div className="report-heading-block">
                <div className="report-title">Loan Past Due Report</div>
                <div className="report-meta">
                  Generated {getTodayDate()} • {totalRows} row{totalRows === 1 ? "" : "s"}
                </div>
                <div className="report-filters">
                  <span className="filter-chip">Branch: {displayBranchName}</span>
                  {displayLoanProductName && (
                    <span className="filter-chip">Product: {displayLoanProductName}</span>
                  )}
                  {displayGrouping && <span className="filter-chip">Grouping: {displayGrouping}</span>}
                </div>
              </div>
              <div className="report-actions">
                <button className="btn-action" type="button" onClick={onPrint}>
                  Print
                </button>
                <button className="btn-action primary" type="button" onClick={onExport}>
                  Export
                </button>
              </div>
            </div>

            <div className="report-table-section">
              <div className="table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td key={col}>{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalRows > ROWS_PER_PAGE && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <div className="pagination-numbers">
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        className={`pagination-number ${currentPage === page ? "active" : ""}`}
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="report-footer">
              <div className="footer-date">{getTodayDate()}</div>
              <div className="footer-page">
                Page {String(currentPage).padStart(2, "0")} of {String(totalPages).padStart(2, "0")}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>No results to display. Adjust filters and generate again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSection;
