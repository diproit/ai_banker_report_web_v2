// src/components/LoanPastDueReports/LoanPastDueReports.js
import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDueReports.css";
// Adjust this import path to match your project structure:
// - If you use services:  "../../services/sqlExecutorService"
// - If you use the client we saw earlier: "../../clients/sqlExecutorClient"
import { sqlExecutorApi } from "../../clients/sqlExecutorClient";

// -----------------------------
// Helpers (flat table version)
// -----------------------------

const ROWS_PER_PAGE = 20;

const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = Number(String(value).replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const getVisiblePages = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const getTodayDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Build a simple flat Loan Past Due query using ranges & filters
const buildLoanPastDueQuery = ({
  branchId,
  loanProductId,
  passdueFrom,
  passdueTo,
  capitalFromNum,
  capitalToNum,
  installmentFromNum,
  installmentToNum,
}) => {
  const filters = [];

  // Branch filter (skip if ALL = 0)
  if (branchId !== 0) {
    filters.push(`gl_branch.id = ${branchId}`);
  }

  // Only loans (category = 2)
  filters.push(`pl_account_type.pl_account_category_id = 2`);

  // Optional loan product filter
  if (loanProductId !== null && loanProductId !== undefined) {
    filters.push(`pl_account_type.id = ${loanProductId}`);
  }

  // Pastdue days range
  if (passdueFrom > 0 || passdueTo < 1000000000) {
    filters.push(
      `pl_account.past_due_days BETWEEN ${passdueFrom} AND ${passdueTo}`
    );
  }

  // Capital (amount) range
  if (capitalFromNum > 0 || capitalToNum < 1000000000) {
    filters.push(
      `pl_account.capital BETWEEN ${capitalFromNum} AND ${capitalToNum}`
    );
  }

  // Pastdue installment range (past_due_amount / capital_installment)
  if (installmentFromNum > 0 || installmentToNum < 1000000000) {
    filters.push(
      `(pl_account.capital_installment > 0 AND (pl_account.past_due_amount / pl_account.capital_installment) BETWEEN ${installmentFromNum} AND ${installmentToNum})`
    );
  }

  const whereClause =
    filters.length > 0 ? `WHERE\n  ${filters.join("\n  AND ")}` : "";

  // You can tweak/select more fields as needed.
  return `
    SELECT
      gl_branch.id AS branch_id,
      gl_branch.name_ln1 AS branch_name,
      pl_account_type.id AS product_id,
      pl_account.ref_account_number AS account_number,
      ci_customer.customer_number,
      ci_customer.full_name_ln1,
      ci_customer.mobile_1,
      pl_account.past_due_days,
      pl_account.past_due_amount,
      pl_account.capital,
      pl_account.balance,
      pl_account.interest,
      pl_account.capital_installment,
      ROUND(pl_account.past_due_amount / pl_account.capital_installment, 2) AS passdue_installment,
      pl_account_type.name_ln1 AS product_name,
      DATE_FORMAT(pl_account.last_transaction_date, '%Y-%m-%d') AS last_transaction_date,
      DATE_FORMAT(pl_account.open_date, '%Y-%m-%d') AS open_date
    FROM
      ci_customer
      INNER JOIN pl_account ON ci_customer.id = pl_account.ci_customer_id
      INNER JOIN pl_account_type ON pl_account.pl_account_type_id = pl_account_type.id
      INNER JOIN gl_branch ON pl_account.branch_id = gl_branch.id
    ${whereClause}
    ORDER BY pl_account.past_due_days DESC, pl_account.past_due_amount DESC
  `;
};

const LoanPastDueReports = () => {
  // Dropdown & filter state
  const [branches, setBranches] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedLoanProductId, setSelectedLoanProductId] = useState("");

  const [installmentFrom, setInstallmentFrom] = useState("");
  const [installmentTo, setInstallmentTo] = useState("");

  const [passdueDaysFrom, setPassdueDaysFrom] = useState("");
  const [passdueDaysTo, setPassdueDaysTo] = useState("");

  const [capitalFrom, setCapitalFrom] = useState("");
  const [capitalTo, setCapitalTo] = useState("");

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);

  // Report state
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [loanReportData, setLoanReportData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [drillLevel, setDrillLevel] = useState("detail");
  const [drillBranch, setDrillBranch] = useState(null);
  const [drillProduct, setDrillProduct] = useState(null);

  // Derived
  const hasResults = loanReportData && loanReportData.length > 0;

  const detailColumns = useMemo(() => {
    if (!loanReportData || loanReportData.length === 0) return [];
    return Object.keys(loanReportData[0]);
  }, [loanReportData]);

  const selectedBranchObj = selectedBranchId
    ? branches.find((b) => b.id === parseInt(selectedBranchId, 10))
    : null;
  const selectedLoanProductObj = selectedLoanProductId
    ? loanProducts.find((p) => p.id === parseInt(selectedLoanProductId, 10))
    : null;

  const branchIsAll = selectedBranchId === "0";

  const displayBranchName = branchIsAll
    ? "ALL"
    : selectedBranchObj?.name || "Selected Branch";
  const displayLoanProductName = selectedLoanProductObj?.name || "";

  const branchSummary = useMemo(() => {
    if (!loanReportData || !branchIsAll) return [];
    const map = {};
    loanReportData.forEach((row) => {
      const id = row.branch_id ?? row.branchId;
      if (id === undefined || id === null) return;
      const name = row.branch_name ?? row.branchName ?? "Unknown";
      const pastDue = parseNumber(row.past_due_amount ?? row.pastDueAmount);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalPastDue: 0 };
      }
      map[id].count += 1;
      map[id].totalPastDue += pastDue;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [loanReportData, branchIsAll]);

  const productSummary = useMemo(() => {
    if (!loanReportData) return [];
    const filteredRows =
      branchIsAll && drillBranch
        ? loanReportData.filter(
            (row) => (row.branch_id ?? row.branchId) === drillBranch.id
          )
        : !branchIsAll
        ? loanReportData
        : [];

    const map = {};
    filteredRows.forEach((row) => {
      const id = row.product_id ?? row.productId;
      if (id === undefined || id === null) return;
      const name = row.product_name ?? row.productName ?? "Unknown";
      const pastDue = parseNumber(row.past_due_amount ?? row.pastDueAmount);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalPastDue: 0 };
      }
      map[id].count += 1;
      map[id].totalPastDue += pastDue;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [loanReportData, branchIsAll, drillBranch]);

  const detailRows = useMemo(() => {
    if (!loanReportData) return [];
    let rows = loanReportData;
    if (branchIsAll && drillBranch) {
      rows = rows.filter(
        (row) => (row.branch_id ?? row.branchId) === drillBranch.id
      );
    }
    if (drillProduct) {
      rows = rows.filter(
        (row) => (row.product_id ?? row.productId) === drillProduct.id
      );
    }
    return rows;
  }, [loanReportData, branchIsAll, drillBranch, drillProduct]);

  const tableConfig = useMemo(() => {
    if (!hasResults) return { columns: [], rows: [], isSummary: false };

    const formatCurrency = (value) =>
      parseNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    if (branchIsAll && drillLevel === "branch") {
      const rows = branchSummary.map((b) => ({
        Branch: b.name,
        Accounts: b.count,
        "Total Past Due": formatCurrency(b.totalPastDue),
        _drillBranch: { id: b.id, name: b.name },
      }));
      return {
        columns: ["Branch", "Accounts", "Total Past Due"],
        rows,
        isSummary: true,
      };
    }

    if (drillLevel === "product") {
      const rows = productSummary.map((p) => ({
        Product: p.name,
        Accounts: p.count,
        "Total Past Due": formatCurrency(p.totalPastDue),
        _drillProduct: { id: p.id, name: p.name },
      }));
      return {
        columns: ["Product", "Accounts", "Total Past Due"],
        rows,
        isSummary: true,
      };
    }

    const rows = detailRows;
    return { columns: detailColumns, rows, isSummary: false };
  }, [hasResults, branchIsAll, drillLevel, branchSummary, productSummary, detailRows, detailColumns]);

  const totalPages = tableConfig.rows.length
    ? Math.ceil(tableConfig.rows.length / ROWS_PER_PAGE)
    : 0;
  const pages = getVisiblePages(currentPage, totalPages);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = tableConfig.rows.slice(startIndex, endIndex);

  const baseLevel = branchIsAll ? "branch" : "product";
  const canDrillUp = drillLevel !== baseLevel;

  const handleBranchDrill = (branch) => {
    setDrillBranch(branch);
    setDrillLevel("product");
    setDrillProduct(null);
    setCurrentPage(1);
  };

  const handleProductDrill = (product) => {
    setDrillProduct(product);
    setDrillLevel("detail");
    setCurrentPage(1);
  };

  const handleDrillUp = () => {
    if (drillLevel === "detail") {
      setDrillLevel("product");
      setDrillProduct(null);
    } else if (drillLevel === "product" && branchIsAll) {
      setDrillLevel("branch");
      setDrillBranch(null);
    }
    setCurrentPage(1);
  };

  // ----------------------------------
  // Load dropdowns on mount
  // ----------------------------------
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setIsLoadingDropdowns(true);
        setDropdownError(null);

        const [branchesData, loanProductsData] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getLoanProducts(),
        ]);

        setBranches(branchesData || []);
        setLoanProducts(loanProductsData || []);
      } catch (err) {
        console.error("Error loading dropdowns:", err);
        setDropdownError("Failed to load dropdown data");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, []);

  // ----------------------------------
  // Generate Report
  // ----------------------------------
  const handleGenerateReport = async () => {
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setLoanReportData(null);
    setCurrentPage(1);
    setDrillProduct(null);
    setDrillBranch(null);
    setDrillLevel("detail");

    const branchId = parseInt(selectedBranchId, 10);
    const loanProductId = selectedLoanProductId
      ? parseInt(selectedLoanProductId, 10)
      : null;

    const passdueFrom = passdueDaysFrom
      ? parseInt(passdueDaysFrom, 10)
      : 0;
    const passdueTo = passdueDaysTo
      ? parseInt(passdueDaysTo, 10)
      : 1000000000;

    const capitalFromNum = capitalFrom
      ? parseFloat(capitalFrom)
      : 0;
    const capitalToNum = capitalTo
      ? parseFloat(capitalTo)
      : 1000000000;

    const installmentFromNum = installmentFrom
      ? parseFloat(installmentFrom)
      : 0;
    const installmentToNum = installmentTo
      ? parseFloat(installmentTo)
      : 1000000000;

    try {
      const query = buildLoanPastDueQuery({
        branchId,
        loanProductId,
        passdueFrom,
        passdueTo,
        capitalFromNum,
        capitalToNum,
        installmentFromNum,
        installmentToNum,
      });

      const response = await sqlExecutorApi.executeQuery(query);
      console.log("Loan Past Due response:", response);

      if (response.success && response.data) {
        setLoanReportData(response.data);
        if (branchId === 0) {
          setDrillLevel("branch");
        } else {
          setDrillBranch({ id: branchId, name: displayBranchName });
          setDrillLevel("product");
        }
      } else {
        setLoanReportData(null);
        setReportError(
          response.error || "Failed to fetch loan past-due report"
        );
      }
    } catch (err) {
      console.error("Error generating loan report:", err);
      setLoanReportData(null);
      setReportError(
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ----------------------------------
  // Print & Export
  // ----------------------------------
  const handlePrint = () => {
    if (!hasResults || !tableConfig.rows.length) return;

    const printableHeader = tableConfig.columns
      .map(
        (col) =>
          `<th style="padding:8px 8px;border:1px solid #ccc;background:#f1f3f5;text-align:left;">${col}</th>`
      )
      .join("");

    const printableRows = tableConfig.rows
      .map((row) => {
        const cells = tableConfig.columns
          .map(
            (col) =>
              `<td style="padding:6px 8px;border:1px solid #ccc;">${String(
                row[col] ?? ""
              )}</td>`
          )
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const content = `
      <html>
        <head>
          <title>Loan Past Due Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Loan Past Due Report</h1>
          <h2>
            Branch: ${displayBranchName}
            ${displayLoanProductName ? ` | Product: ${displayLoanProductName}` : ""}
          </h2>
          <table>
            <thead><tr>${printableHeader}</tr></thead>
            <tbody>${printableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleExport = () => {
    if (!hasResults || !tableConfig.rows.length) return;

    const header = tableConfig.columns.join(",");
    const rows = tableConfig.rows.map((row) =>
      tableConfig.columns
        .map((col) => {
          const cell = String(row[col] ?? "");
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    );

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "loan-past-due-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Keep page index valid when results change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <div className="loan-pastdue-container">
      {/* Filter Card */}
      <div className="loan-pastdue-card">
        <h1 className="loan-pastdue-heading">Loan Past Due Reports</h1>

        {/* Branch */}
        <div className="form-group">
          <label htmlFor="loan-pastdue-branch-name">
            Branch Name <span className="required">*</span>
          </label>
          <select
            id="loan-pastdue-branch-name"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns
                ? "Loading branches..."
                : "Select Branch"}
            </option>
            {branches.map((branch) => (
              <option
                key={branch.id}
                value={branch.id.toString()}
              >
                {branch.name}
              </option>
            ))}
          </select>

          {dropdownError && (
            <div className="error-message">
              <strong>Error:</strong> {dropdownError}
            </div>
          )}
        </div>

        {/* Loan Product */}
        <div className="form-group">
          <label htmlFor="loan-pastdue-loan-product">Loan Product</label>
          <select
            id="loan-pastdue-loan-product"
            value={selectedLoanProductId}
            onChange={(e) => setSelectedLoanProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns
                ? "Loading..."
                : "Select Loan Product"}
            </option>
            {loanProducts.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pastdue Installment range */}
        <div className="form-group range-filter-group">
          <div className="range-filter-label">Pastdue Installment</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="loan-pastdue-installment-from">
              From
            </label>
            <input
              id="loan-pastdue-installment-from"
              type="number"
              min="0"
              step="1"
              value={installmentFrom}
              onChange={(e) => setInstallmentFrom(e.target.value)}
              className="form-input"
              placeholder="0"
            />
            <label className="small-label" htmlFor="loan-pastdue-installment-to">
              To
            </label>
            <input
              id="loan-pastdue-installment-to"
              type="number"
              min="0"
              step="1"
              value={installmentTo}
              onChange={(e) => setInstallmentTo(e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>
        </div>

        {/* Passdue Days range */}
        <div className="form-group range-filter-group">
          <div className="range-filter-label">Passdue Days</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="loan-pastdue-days-from">
              From
            </label>
            <input
              id="loan-pastdue-days-from"
              type="number"
              min="0"
              step="1"
              value={passdueDaysFrom}
              onChange={(e) => setPassdueDaysFrom(e.target.value)}
              className="form-input"
              placeholder="0"
            />
            <label className="small-label" htmlFor="loan-pastdue-days-to">
              To
            </label>
            <input
              id="loan-pastdue-days-to"
              type="number"
              min="0"
              step="1"
              value={passdueDaysTo}
              onChange={(e) => setPassdueDaysTo(e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>
        </div>

        {/* Capital range */}
        <div className="form-group range-filter-group">
          <div className="range-filter-label">Capital (Amount)</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="loan-pastdue-capital-from">
              From
            </label>
            <input
              id="loan-pastdue-capital-from"
              type="number"
              min="0"
              step="1.00"
              value={capitalFrom}
              onChange={(e) => setCapitalFrom(e.target.value)}
              className="form-input"
              placeholder="0.00"
            />
            <label className="small-label" htmlFor="loan-pastdue-capital-to">
              To
            </label>
            <input
              id="loan-pastdue-capital-to"
              type="number"
              min="0"
              step="1.00"
              value={capitalTo}
              onChange={(e) => setCapitalTo(e.target.value)}
              className="form-input"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Generate button */}
        <div className="form-actions">
          <button
            className="btn-generate-report"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Results Card */}
      {(reportError || hasResults) && (
        <div className="loan-pastdue-results-card">
          {reportError && (
            <div className="error-message">
              <strong>Error:</strong> {reportError}
            </div>
          )}

          {hasResults ? (
            <div className="loan-report-card">
              <div className="report-toolbar">
                <div className="report-heading-block">
                  <div className="report-title">Loan Past Due Report</div>
                  <div className="report-meta">
                    Generated {getTodayDate()} -{" "}
                    {tableConfig.rows.length} row
                    {tableConfig.rows.length === 1 ? "" : "s"}
                  </div>
                  <div className="report-filters">
                    <span className="filter-chip">
                      Branch: {displayBranchName}
                    </span>
                    {displayLoanProductName && (
                      <span className="filter-chip">
                        Product: {displayLoanProductName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    className="btn-action"
                    type="button"
                    onClick={handlePrint}
                  >
                    Print
                  </button>
                  <button
                    className="btn-action primary"
                    type="button"
                    onClick={handleExport}
                  >
                    Export
                  </button>
                </div>
              </div>

              <div className="drill-controls">
                <div className="drill-path">
                  <span className="filter-chip">
                    View:
                    {branchIsAll && drillLevel === "branch" && " Branches"}
                    {drillLevel === "product" &&
                      ` Products${drillBranch ? ` (${drillBranch.name})` : ""}`}
                    {drillLevel === "detail" && " Details"}
                  </span>
                  {branchIsAll && drillBranch && (
                    <span className="filter-chip">Branch: {drillBranch.name}</span>
                  )}
                  {drillProduct && (
                    <span className="filter-chip">Product: {drillProduct.name}</span>
                  )}
                </div>
                {canDrillUp && (
                  <button
                    className="btn-action"
                    type="button"
                    onClick={handleDrillUp}
                  >
                    Fold
                  </button>
                )}
              </div>

              <div className="report-table-section">
                <div className="table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        {tableConfig.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, idx) => {
                        const isClickable = !!row._drillBranch || !!row._drillProduct;
                        const handleRowClick = () => {
                          if (row._drillBranch) {
                            handleBranchDrill(row._drillBranch);
                          } else if (row._drillProduct) {
                            handleProductDrill(row._drillProduct);
                          }
                        };
                        return (
                          <tr
                            key={idx}
                            className={isClickable ? "clickable-row" : ""}
                            onClick={isClickable ? handleRowClick : undefined}
                          >
                            {tableConfig.columns.map((col) => (
                              <td key={col}>
                                {String(row[col] ?? "")}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                  >
                    Previous
                  </button>
                  <div className="pagination-numbers">
                    {pages.map((p) => (
                      <button
                        key={p}
                        className={`pagination-number ${
                          p === currentPage ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              )}

              <div className="report-footer">
                <div className="footer-date">{getTodayDate()}</div>
                <div className="footer-page">
                  Page {String(currentPage).padStart(2, "0")} of{" "}
                  {String(totalPages).padStart(2, "0")}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              No results to display. Adjust filters and generate again.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanPastDueReports;
