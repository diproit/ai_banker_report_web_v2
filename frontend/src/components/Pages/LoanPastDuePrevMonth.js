// src/components/Pages/LoanPastDuePrevMonth.js
import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDuePrevMonth.css";
import { sqlExecutorApi } from "../../clients/sqlExecutorClient";

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

const buildPrevMonthQuery = ({
  branchId,
  loanProductId,
  passdueInstallmentFrom,
  passdueInstallmentTo,
  passdueDaysFrom,
  passdueDaysTo,
  capitalFrom,
  capitalTo,
}) => {
  const filters = ["pl_account_type.pl_account_category_id = 2"];

  // Branch filter (skip when branchId is 0 to represent ALL)
  if (branchId !== 0) {
    filters.push(`gl_branch.id = ${branchId}`);
  }

  if (loanProductId !== null && loanProductId !== undefined) {
    filters.push(`pl_account_type.id = ${loanProductId}`);
  }

  if (passdueInstallmentFrom > 0 || passdueInstallmentTo < 1000000000) {
    filters.push(
      `pl_month_tb.passdue_installment BETWEEN ${passdueInstallmentFrom} AND ${passdueInstallmentTo}`
    );
  }

  if (passdueDaysFrom > 0 || passdueDaysTo < 1000000000) {
    filters.push(
      `pl_month_tb.passdue_days BETWEEN ${passdueDaysFrom} AND ${passdueDaysTo}`
    );
  }

  if (capitalFrom > 0 || capitalTo < 1000000000) {
    filters.push(`pl_account.capital BETWEEN ${capitalFrom} AND ${capitalTo}`);
  }

  const whereClause =
    filters.length > 0 ? `WHERE\n  ${filters.join("\n  AND ")}` : "";

  return `
    SELECT
      gl_branch.id AS branch_id,
      gl_branch.name_ln1 AS branch_name,
      pl_account_type.id AS product_id,
      pl_account_type.name_ln1 AS product_name,
      pl_account.ref_account_number,
      ci_customer.customer_number,
      ci_customer.full_name_ln1,
      ci_customer.address_ln1,
      ci_customer.mobile_1,
      DATE_FORMAT(pl_account.open_date, '%Y-%m-%d') AS open_date,
      CONCAT(FORMAT(pl_account.interest_rate, 2), '%') AS interest_rate,
      pl_account.period,
      pl_account.capital,
      pl_account.total_installment,
      pl_month_tb.closing_balance,
      pl_month_tb.interest_rate AS month_interest_rate,
      pl_month_tb.passdue_amount,
      pl_month_tb.passdue_installment,
      pl_month_tb.passdue_days
    FROM
      gl_branch
      INNER JOIN pl_account ON gl_branch.id = pl_account.branch_id
      INNER JOIN pl_account_type ON pl_account.pl_account_type_id = pl_account_type.id
      INNER JOIN pl_month_tb ON pl_account.id = pl_month_tb.pl_account_id
      INNER JOIN ci_customer ON gl_branch.id = ci_customer.branch_id
        AND pl_account.ci_customer_id = ci_customer.id
    ${whereClause}
    ORDER BY pl_month_tb.passdue_days DESC, pl_month_tb.passdue_installment DESC
  `;
};

const LoanPastDuePrevMonth = () => {
  const [branches, setBranches] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedLoanProductId, setSelectedLoanProductId] = useState("");
  const [passdueInstFrom, setPassdueInstFrom] = useState("");
  const [passdueInstTo, setPassdueInstTo] = useState("");
  const [passdueDaysFrom, setPassdueDaysFrom] = useState("");
  const [passdueDaysTo, setPassdueDaysTo] = useState("");
  const [capitalFrom, setCapitalFrom] = useState("");
  const [capitalTo, setCapitalTo] = useState("");

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hasResults = reportData && reportData.length > 0;
  const detailColumns = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  }, [reportData]);

  const [drillLevel, setDrillLevel] = useState("detail");
  const [drillBranch, setDrillBranch] = useState(null);
  const [drillProduct, setDrillProduct] = useState(null);

  const branchIsAll = selectedBranchId === "0";
  const selectedBranchObj = selectedBranchId
    ? branches.find((b) => b.id === parseInt(selectedBranchId, 10))
    : null;
  const selectedLoanProductObj = selectedLoanProductId
    ? loanProducts.find((p) => p.id === parseInt(selectedLoanProductId, 10))
    : null;
  const displayBranchName = branchIsAll
    ? "ALL"
    : selectedBranchObj?.name || "Selected Branch";
  const displayLoanProductName = selectedLoanProductObj?.name || "";

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setIsLoadingDropdowns(true);
        setDropdownError(null);

        const [branchesRes, loanProductsRes] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getLoanProducts(),
        ]);

        setBranches(branchesRes || []);
        setLoanProducts(loanProductsRes || []);
      } catch (err) {
        console.error("Error loading dropdown data:", err);
        setDropdownError("Failed to load dropdown data");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setReportData(null);
    setCurrentPage(1);
    setDrillBranch(null);
    setDrillProduct(null);
    setDrillLevel("detail");

    const branchId = parseInt(selectedBranchId, 10);
    const loanProductId = selectedLoanProductId
      ? parseInt(selectedLoanProductId, 10)
      : null;

    const passdueInstFromNum = passdueInstFrom
      ? parseFloat(passdueInstFrom)
      : 0;
    const passdueInstToNum = passdueInstTo
      ? parseFloat(passdueInstTo)
      : 1000000000;
    const passdueDaysFromNum = passdueDaysFrom
      ? parseInt(passdueDaysFrom, 10)
      : 0;
    const passdueDaysToNum = passdueDaysTo
      ? parseInt(passdueDaysTo, 10)
      : 1000000000;
    const capitalFromNum = capitalFrom ? parseFloat(capitalFrom) : 0;
    const capitalToNum = capitalTo ? parseFloat(capitalTo) : 1000000000;

    try {
      const query = buildPrevMonthQuery({
        branchId,
        loanProductId,
        passdueInstallmentFrom: passdueInstFromNum,
        passdueInstallmentTo: passdueInstToNum,
        passdueDaysFrom: passdueDaysFromNum,
        passdueDaysTo: passdueDaysToNum,
        capitalFrom: capitalFromNum,
        capitalTo: capitalToNum,
      });

      const response = await sqlExecutorApi.executeQuery(query);
      if (response.success && response.data) {
        setReportData(response.data);
        if (branchId === 0) {
          setDrillLevel("branch");
        } else {
          setDrillBranch({ id: branchId, name: displayBranchName });
          setDrillLevel("product");
        }
      } else {
        setReportData(null);
        setReportError(
          response.error || "Failed to fetch loan pastdue for previous month"
        );
      }
    } catch (err) {
      console.error("Error generating report:", err);
      setReportData(null);
      setReportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!hasResults || !tableConfig.rows.length) return;

    const headerHtml = tableConfig.columns
      .map(
        (col) =>
          `<th style="padding:8px;border:1px solid #ccc;background:#f1f3f5;text-align:left;">${col}</th>`
      )
      .join("");

    const bodyHtml = tableConfig.rows
      .map((row) => {
        const cells = tableConfig.columns
          .map(
            (col) =>
              `<td style="padding:6px;border:1px solid #ccc;">${String(
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
          <title>Loan Pastdue - Previous Month</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Loan Pastdue - Previous Month</h1>
          <h2>
            Branch: ${displayBranchName}
            ${displayLoanProductName ? ` | Product: ${displayLoanProductName}` : ""}
          </h2>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
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
    link.download = "loan-pastdue-prev-month.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const branchSummary = useMemo(() => {
    if (!reportData || !branchIsAll) return [];
    const map = {};
    reportData.forEach((row) => {
      const id = row.branch_id ?? row.branchId;
      if (id === undefined || id === null) return;
      const name = row.branch_name ?? row.branchName ?? "Unknown";
      const pastDue = parseNumber(row.passdue_amount ?? row.pastdue_amount);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalPastDue: 0 };
      }
      map[id].count += 1;
      map[id].totalPastDue += pastDue;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll]);

  const productSummary = useMemo(() => {
    if (!reportData) return [];
    const filtered =
      branchIsAll && drillBranch
        ? reportData.filter(
            (row) => (row.branch_id ?? row.branchId) === drillBranch.id
          )
        : !branchIsAll
        ? reportData
        : [];

    const map = {};
    filtered.forEach((row) => {
      const id = row.product_id ?? row.productId;
      if (id === undefined || id === null) return;
      const name = row.product_name ?? row.productName ?? "Unknown";
      const pastDue = parseNumber(row.passdue_amount ?? row.pastdue_amount);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalPastDue: 0 };
      }
      map[id].count += 1;
      map[id].totalPastDue += pastDue;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll, drillBranch]);

  const detailRows = useMemo(() => {
    if (!reportData) return [];
    let rows = reportData;
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
  }, [reportData, branchIsAll, drillBranch, drillProduct]);

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

    return { columns: detailColumns, rows: detailRows, isSummary: false };
  }, [hasResults, branchIsAll, drillLevel, branchSummary, productSummary, detailRows, detailColumns]);

  const totalPages = tableConfig.rows.length
    ? Math.ceil(tableConfig.rows.length / ROWS_PER_PAGE)
    : 0;
  const pages = getVisiblePages(currentPage, totalPages);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = tableConfig.rows.slice(startIndex, endIndex);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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

  return (
    <div className="prevmonth-container">
      <div className="prevmonth-card">
        <h1 className="prevmonth-heading">Loan pastdue for previous month</h1>

        <div className="form-group">
          <label htmlFor="prevmonth-branch-name">
            Branch Name <span className="required">*</span>
          </label>
          <select
            id="prevmonth-branch-name"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns ? "Loading branches..." : "Select Branch"}
            </option>
            {branches.map((b, index) => (
              <option key={`branch-${b.id}-${index}`} value={b.id.toString()}>
                {b.name}
              </option>
            ))}
          </select>
          {dropdownError && (
            <div className="error-message">
              <strong>Error:</strong> {dropdownError}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="prevmonth-loan-product">Loan Product</label>
          <select
            id="prevmonth-loan-product"
            value={selectedLoanProductId}
            onChange={(e) => setSelectedLoanProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns ? "Loading..." : "Select Loan Product"}
            </option>
            {loanProducts.map((p, index) => (
              <option key={`loan-${p.id}-${index}`} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group range-filter-group">
          <div className="range-filter-label">Pastdue Installment</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="prevmonth-installment-from">
              From
            </label>
            <input
              id="prevmonth-installment-from"
              type="number"
              min="0"
              step="1"
              value={passdueInstFrom}
              onChange={(e) => setPassdueInstFrom(e.target.value)}
              className="form-input"
              placeholder="0"
            />
            <label className="small-label" htmlFor="prevmonth-installment-to">
              To
            </label>
            <input
              id="prevmonth-installment-to"
              type="number"
              min="0"
              step="1"
              value={passdueInstTo}
              onChange={(e) => setPassdueInstTo(e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-group range-filter-group">
          <div className="range-filter-label">Pastdue Days</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="prevmonth-days-from">
              From
            </label>
            <input
              id="prevmonth-days-from"
              type="number"
              min="0"
              step="1"
              value={passdueDaysFrom}
              onChange={(e) => setPassdueDaysFrom(e.target.value)}
              className="form-input"
              placeholder="0"
            />
            <label className="small-label" htmlFor="prevmonth-days-to">
              To
            </label>
            <input
              id="prevmonth-days-to"
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

        <div className="form-group range-filter-group">
          <div className="range-filter-label">Capital (Amount)</div>
          <div className="range-filter-controls">
            <label className="small-label" htmlFor="prevmonth-capital-from">
              From
            </label>
            <input
              id="prevmonth-capital-from"
              type="number"
              min="0"
              step="1.00"
              value={capitalFrom}
              onChange={(e) => setCapitalFrom(e.target.value)}
              className="form-input"
              placeholder="0.00"
            />
            <label className="small-label" htmlFor="prevmonth-capital-to">
              To
            </label>
            <input
              id="prevmonth-capital-to"
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

      {(reportError || hasResults) && (
        <div className="prevmonth-results-card">
          {reportError && (
            <div className="error-message">
              <strong>Error:</strong> {reportError}
            </div>
          )}

          {hasResults ? (
            <div className="prevmonth-report-card">
              <div className="report-toolbar">
                <div className="report-heading-block">
                  <div className="report-title">
                    Loan pastdue for previous month
                  </div>
                  <div className="report-meta">
                    Generated {getTodayDate()} - {tableConfig.rows.length} row
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
                    Fold Up
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
                              <td key={col}>{String(row[col] ?? "")}</td>
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
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

export default LoanPastDuePrevMonth;
