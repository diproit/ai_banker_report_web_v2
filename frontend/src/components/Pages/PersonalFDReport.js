// src/components/Pages/PersonalFDReport.js
import React, { useEffect, useMemo, useState } from "react";
import "./PersonalFDReport.css";
import { sqlExecutorApi } from "../../clients/sqlExecutorClient";

const ROWS_PER_PAGE = 10;

const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = Number(String(value).replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const buildPersonalFDQuery = ({
  branchId,
  productId,
  lastTransactionDate,
  openFrom,
  openTo,
}) => {
  const filters = ["pl_account_type.pl_account_category_id = 1"];

  if (branchId !== null && branchId !== undefined && branchId !== 0) {
    filters.push(`gl_branch.id = ${branchId}`);
  }

  if (lastTransactionDate) {
    filters.push(
      `DATE(pl_account.last_transaction_date) = '${lastTransactionDate}'`
    );
  }

  if (openFrom && openTo) {
    filters.push(`pl_account.open_date BETWEEN '${openFrom}' AND '${openTo}'`);
  } else if (openFrom) {
    filters.push(`pl_account.open_date >= '${openFrom}'`);
  } else if (openTo) {
    filters.push(`pl_account.open_date <= '${openTo}'`);
  }

  if (productId) {
    filters.push(`pl_account_type.id = ${productId}`);
  }

  const whereClause = filters.length
    ? `WHERE\n    ${filters.join("\n    AND ")}`
    : "";

  return `
    SELECT
      gl_branch.id AS branch_id,
      gl_branch.name_ln1 AS branch_name,
      pl_account.ref_account_number,
      ci_customer.customer_number,
      ci_customer.full_name_ln1,
      pl_account_type.name_ln1 AS product_name,
      DATE_FORMAT(pl_account.open_date, '%Y-%m-%d') AS open_date,
      DATE_FORMAT(pl_account.last_transaction_date, '%Y-%m-%d') AS last_transaction_date,
      CONCAT(FORMAT(pl_account.interest_rate, 2), '%') AS interest_rate,
      FORMAT(pl_daily_balances.pl_account_balance, 2) AS pl_account_balance
    FROM
      ci_customer
      INNER JOIN pl_account ON ci_customer.id = pl_account.ci_customer_id
      INNER JOIN pl_daily_balances ON pl_account.id = pl_daily_balances.pl_account_id
      INNER JOIN pl_account_type ON pl_account.pl_account_type_id = pl_account_type.id
      INNER JOIN gl_branch ON ci_customer.branch_id = gl_branch.id AND pl_account.branch_id = gl_branch.id
    ${whereClause}
    ORDER BY pl_account.open_date DESC
  `;
};

const getTodayDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const PersonalFDReport = () => {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [instituteName, setInstituteName] = useState("");

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [lastTransactionDate, setLastTransactionDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportData, setReportData] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [drillLevel, setDrillLevel] = useState("branch");
  const [drillBranch, setDrillBranch] = useState(null);
  const [drillProduct, setDrillProduct] = useState(null);

  // Load dropdown data on mount
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setIsLoadingDropdowns(true);
        setDropdownError(null);
        const [branchesRes, productsRes, instituteRes] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getSavingsProducts(),
          sqlExecutorApi.getInstitute(),
        ]);

        setBranches(branchesRes || []);
        setProducts(productsRes || []);
        if (instituteRes?.name) {
          setInstituteName(instituteRes.name);
        }
      } catch (err) {
        console.error("Error loading dropdowns:", err);
        setDropdownError("Failed to load dropdown data");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, []);

  const hasResults = reportData.length > 0;
  const detailColumns = useMemo(
    () => (reportData.length ? Object.keys(reportData[0]) : []),
    [reportData]
  );

  const branchIsAll = selectedBranchId === "" || selectedBranchId === "0";

  const selectedBranchObj = selectedBranchId
    ? branches.find((b) => b.id === parseInt(selectedBranchId, 10))
    : null;
  const selectedProductObj = selectedProductId
    ? products.find((p) => p.id === parseInt(selectedProductId, 10))
    : null;

  const displayBranchName = selectedBranchObj?.name || "All Branches";
  const displayProductName = selectedProductObj?.name || "";
  const hasProductFilter = !!selectedProductId;

  const dateRangeText =
    fromDate && toDate
      ? `${fromDate} to ${toDate}`
      : fromDate
      ? `From ${fromDate}`
      : toDate
      ? `To ${toDate}`
      : "";

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportError(null);
    setReportData([]);
    setCurrentPage(1);
    setDrillBranch(null);
    setDrillProduct(null);
    setDrillLevel(branchIsAll ? "branch" : "product");

    const branchIdNum = selectedBranchId ? parseInt(selectedBranchId, 10) : null;
    const productIdNum = selectedProductId
      ? parseInt(selectedProductId, 10)
      : null;

    try {
      const query = buildPersonalFDQuery({
        branchId: branchIdNum,
        productId: productIdNum,
        lastTransactionDate,
        openFrom: fromDate,
        openTo: toDate,
      });

      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setReportError(response.error || "Failed to fetch Personal FD report");
      }
    } catch (err) {
      console.error("Error generating Personal FD report:", err);
      setReportError(err.message || "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const branchSummary = useMemo(() => {
    if (!reportData.length || !branchIsAll) return [];
    const map = {};
    reportData.forEach((row) => {
      const id = row.branch_id;
      if (id === undefined || id === null) return;
      const name = row.branch_name ?? "Unknown";
      const balance = parseNumber(row.pl_account_balance);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalBalance: 0 };
      }
      map[id].count += 1;
      map[id].totalBalance += balance;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll]);

  const productSummary = useMemo(() => {
    if (!reportData.length) return [];
    const filtered =
      branchIsAll && drillBranch
        ? reportData.filter((row) => row.branch_id === drillBranch.id)
        : reportData;
    const map = {};
    filtered.forEach((row) => {
      const name = row.product_name ?? "Unknown";
      const balance = parseNumber(row.pl_account_balance);
      if (!map[name]) {
        map[name] = { name, count: 0, totalBalance: 0 };
      }
      map[name].count += 1;
      map[name].totalBalance += balance;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll, drillBranch]);

  const detailRows = useMemo(() => {
    if (!reportData.length) return [];
    let rows = reportData;
    if (branchIsAll && drillBranch) {
      rows = rows.filter((row) => row.branch_id === drillBranch.id);
    }
    if (drillProduct) {
      rows = rows.filter((row) => row.product_name === drillProduct.name);
    }
    return rows;
  }, [reportData, branchIsAll, drillBranch, drillProduct]);

  const tableConfig = useMemo(() => {
    if (!hasResults) return { columns: [], rows: [], isSummary: false };

    const formatBalance = (value) =>
      parseNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    if (branchIsAll && drillLevel === "branch") {
      const rows = branchSummary.map((b) => ({
        Branch: b.name,
        Accounts: b.count,
        "Total Balance": formatBalance(b.totalBalance),
        _drillBranch: { id: b.id, name: b.name },
      }));
      return {
        columns: ["Branch", "Accounts", "Total Balance"],
        rows,
        isSummary: true,
      };
    }

    if (drillLevel === "product") {
      const rows = productSummary.map((p) => ({
        Product: p.name,
        Accounts: p.count,
        "Total Balance": formatBalance(p.totalBalance),
        _drillProduct: { name: p.name },
      }));
      return {
        columns: ["Product", "Accounts", "Total Balance"],
        rows,
        isSummary: true,
      };
    }

    return { columns: detailColumns, rows: detailRows, isSummary: false };
  }, [
    hasResults,
    branchIsAll,
    drillLevel,
    branchSummary,
    productSummary,
    detailRows,
    detailColumns,
  ]);

  const totalPages = tableConfig.rows.length
    ? Math.ceil(tableConfig.rows.length / ROWS_PER_PAGE)
    : 0;
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

  const handlePrint = () => {
    if (!hasResults || !tableConfig.columns.length) return;

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
          <title>Personal FD Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
          </style>
        </head>
        <body>
          <div style="font-weight:bold; margin-bottom:4px;">${instituteName || ""}</div>
          <h1>Personal FD Report</h1>
          <h2>
            Branch: ${displayBranchName}
            ${hasProductFilter ? ` | Product: ${displayProductName}` : ""}
            ${dateRangeText ? ` | Date: ${dateRangeText}` : ""}
            ${lastTransactionDate ? ` | Last Txn: ${lastTransactionDate}` : ""}
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
    if (!hasResults || !tableConfig.columns.length) return;

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
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personal-fd-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="personal-fd-container">
      <div className="personal-fd-card">
        <h1 className="personal-fd-heading">Personal FD Report</h1>

        <div className="form-group">
          <label htmlFor="branch-name">Branch Name</label>
          <select
            id="branch-name"
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
          <label htmlFor="fd-product">FD Product</label>
          <select
            id="fd-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns ? "Loading..." : "Select FD Product"}
            </option>
            {products.map((p, index) => (
              <option key={`product-${p.id}-${index}`} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="last-transaction-date">Last Transaction Date</label>
          <input
            id="last-transaction-date"
            type="date"
            value={lastTransactionDate}
            onChange={(e) => setLastTransactionDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>Date Range (Open Date)</label>
          <div className="range-row">
            <label className="small-label" htmlFor="from-date">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="form-input"
            />
            <label className="small-label" htmlFor="to-date">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn-generate-report"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {(reportError || hasResults) && (
        <div className="personal-fd-report-card">
          {reportError && (
            <div className="error-message">
              <strong>Error:</strong> {reportError}
            </div>
          )}

          {hasResults ? (
            <>
              <div className="report-header">
                <div className="report-title-block">
                  {instituteName && (
                    <div className="report-main-heading">{instituteName}</div>
                  )}
                  <div className="report-sub-heading">Personal FD Report</div>
                  <div className="report-meta">
                    Generated {getTodayDate()} - {reportData.length} row
                    {reportData.length === 1 ? "" : "s"}
                  </div>
                  <div className="report-filters">
                    <span className="filter-chip">
                      Branch: {displayBranchName}
                    </span>
                    {hasProductFilter && (
                      <span className="filter-chip">
                        Product: {displayProductName}
                      </span>
                    )}
                    {dateRangeText && (
                      <span className="filter-chip">Date: {dateRangeText}</span>
                    )}
                    {lastTransactionDate && (
                      <span className="filter-chip">
                        Last Txn: {lastTransactionDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    type="button"
                    className="btn-action"
                    onClick={handlePrint}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    className="btn-action primary"
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
                  <button type="button" className="btn-action" onClick={handleDrillUp}>
                    Fold
                  </button>
                )}
              </div>

              <div className="report-table-section">
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

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        className={`pagination-btn ${
                          page === currentPage ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
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
                <div>{getTodayDate()}</div>
                <div>
                  Page {String(currentPage).padStart(2, "0")} of{" "}
                  {String(totalPages).padStart(2, "0")}
                </div>
              </div>
            </>
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

export default PersonalFDReport;
