// src/components/PersonalSavingsReport/PersonalSavingsReport.js
import React, { useEffect, useMemo, useState } from "react";
import "./PersonalSavingsReport.css";
import { sqlExecutorApi } from "../../clients/sqlExecutorClient";

const buildSavingsQuery = ({ fromDate, toDate, branchId, productId }) => {
  const filters = ["pl_account_type.pl_account_category_id = 1"];

  if (fromDate && toDate) {
    filters.push(`pl_account.open_date BETWEEN '${fromDate}' AND '${toDate}'`);
  } else if (fromDate) {
    filters.push(`pl_account.open_date >= '${fromDate}'`);
  } else if (toDate) {
    filters.push(`pl_account.open_date <= '${toDate}'`);
  }

  if (branchId !== 0) {
    filters.push(`gl_branch.id = ${branchId}`);
  }

  if (productId && productId !== 0) {
    filters.push(`pl_account_type.id = ${productId}`);
  }

  const whereClause = filters.length ? `WHERE\n    ${filters.join("\n    AND ")}` : "";

  return `
    SELECT
      gl_branch.id AS branch_id,
      gl_branch.name_ln1 AS branch_name,
      pl_account.ref_account_number AS account_number,
      pl_account_type.id AS product_id,
      ci_customer.customer_number,
      ci_customer.full_name_ln1,
      pl_account_type.name_ln1 AS product_name,
      DATE_FORMAT(pl_account.open_date, '%Y-%m-%d') AS open_date,
      CONCAT(FORMAT(pl_account.interest_rate, 2), '%') AS interest_rate,
      FORMAT(pl_daily_balances.pl_account_balance, 2) AS account_balance
    FROM
      ci_customer
      INNER JOIN pl_account ON ci_customer.id = pl_account.ci_customer_id
      INNER JOIN pl_daily_balances ON pl_account.id = pl_daily_balances.pl_account_id
      INNER JOIN pl_account_type ON pl_account.pl_account_type_id = pl_account_type.id
      INNER JOIN gl_branch ON pl_account.branch_id = gl_branch.id
    ${whereClause}
    ORDER BY pl_account.open_date DESC
  `;
};

// Simple helpers
const ROWS_PER_PAGE = 10;

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

const PersonalSavingsReport = () => {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [instituteName, setInstituteName] = useState("");

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [drillLevel, setDrillLevel] = useState("detail");
  const [drillBranch, setDrillBranch] = useState(null);
  const [drillProduct, setDrillProduct] = useState(null);

  // Load dropdowns on mount
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
        if (instituteRes && instituteRes.name) {
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

  const hasResults = reportData && reportData.length > 0;
  const detailColumns = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  }, [reportData]);

  const branchIsAll = selectedBranchId === "0";

  const selectedBranchObj = selectedBranchId
    ? branches.find((b) => b.id === parseInt(selectedBranchId, 10))
    : null;
  const selectedProductObj = selectedProductId
    ? products.find((p) => p.id === parseInt(selectedProductId, 10))
    : null;

  const displayBranchName = selectedBranchObj?.name || "Selected Branch";
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
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setReportData(null);
    setCurrentPage(1);

    const branchIdNum = parseInt(selectedBranchId, 10);
    const productIdNum = selectedProductId ? parseInt(selectedProductId, 10) : null;

    try {
      const query = buildSavingsQuery({
        fromDate,
        toDate,
        branchId: branchIdNum,
        productId: productIdNum,
      });

      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setReportData(response.data);
        setDrillProduct(null);
        if (branchIdNum === 0) {
          setDrillBranch(null);
          setDrillLevel("branch");
        } else {
          setDrillBranch({
            id: branchIdNum,
            name: displayBranchName,
          });
          setDrillLevel("product");
        }
      } else {
        setReportData(null);
        setReportError(response.error || "Failed to fetch personal savings report");
      }
    } catch (err) {
      console.error("Error generating savings report:", err);
      setReportData(null);
      setReportError(err.message || "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const branchSummary = useMemo(() => {
    if (!reportData || !branchIsAll) return [];
    const map = {};
    reportData.forEach((row) => {
      const id = row.branch_id ?? row.branchId;
      if (id === undefined || id === null) return;
      const name = row.branch_name ?? row.branchName ?? "Unknown";
      const balance = parseNumber(row.account_balance ?? row.balance);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalBalance: 0 };
      }
      map[id].count += 1;
      map[id].totalBalance += balance;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll]);

  const productSummary = useMemo(() => {
    if (!reportData) return [];
    const filteredRows =
      branchIsAll && drillBranch
        ? reportData.filter((row) => (row.branch_id ?? row.branchId) === drillBranch.id)
        : !branchIsAll
        ? reportData
        : [];

    const map = {};
    filteredRows.forEach((row) => {
      const id = row.product_id ?? row.productId;
      if (id === undefined || id === null) return;
      const name = row.product_name ?? row.productName ?? "Unknown";
      const balance = parseNumber(row.account_balance ?? row.balance);
      if (!map[id]) {
        map[id] = { id, name, count: 0, totalBalance: 0 };
      }
      map[id].count += 1;
      map[id].totalBalance += balance;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, branchIsAll, drillBranch]);

  const detailRows = useMemo(() => {
    if (!reportData) return [];
    let rows = reportData;
    if (branchIsAll && drillBranch) {
      rows = rows.filter((row) => (row.branch_id ?? row.branchId) === drillBranch.id);
    }
    if (drillProduct) {
      rows = rows.filter((row) => (row.product_id ?? row.productId) === drillProduct.id);
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
      const source = productSummary;
      const rows = source.map((p) => ({
        Product: p.name,
        Accounts: p.count,
        "Total Balance": formatBalance(p.totalBalance),
        _drillProduct: { id: p.id, name: p.name },
      }));
      return {
        columns: ["Product", "Accounts", "Total Balance"],
        rows,
        isSummary: true,
      };
    }

    const rows = detailRows;
    return {
      columns: detailColumns,
      rows,
      isSummary: false,
    };
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

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
              `<td style="padding:6px;border:1px solid #ccc;">${String(row[col] ?? "")}</td>`
          )
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const content = `
      <html>
        <head>
          <title>Personal Savings Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
          </style>
        </head>
        <body>
          <div style="font-weight:bold; margin-bottom:4px;">${instituteName || ""}</div>
          <h1>Personal Savings Report</h1>
          <h2>
            Branch: ${displayBranchName}
            ${hasProductFilter ? ` | Product: ${displayProductName}` : ""}
            ${dateRangeText ? ` | Date: ${dateRangeText}` : ""}
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
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personal-savings-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="personal-savings-container">
      {/* Filter Card */}
      <div className="personal-savings-card">
        <h1 className="personal-savings-heading">Personal Savings Report</h1>

        <div className="form-group">
          <label htmlFor="branch-name">
            Branch Name <span className="required">*</span>
          </label>
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
          <label htmlFor="savings-product">Savings Product</label>
          <select
            id="savings-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns ? "Loading..." : "Select Savings Product"}
            </option>
            {products.map((p, index) => (
              <option key={`product-${p.id}-${index}`} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date Range</label>
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

      {/* Results Card */}
      {(reportError || hasResults) && (
        <div className="personal-savings-report-card">
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
                  <div className="report-sub-heading">Personal Savings Report</div>
                  <div className="report-meta">
                    Generated {getTodayDate()} - {tableConfig.rows.length} row
                    {tableConfig.rows.length === 1 ? "" : "s"}
                  </div>
                  <div className="report-filters">
                    <span className="filter-chip">Branch: {displayBranchName}</span>
                    {hasProductFilter && (
                      <span className="filter-chip">
                        Product: {displayProductName}
                      </span>
                    )}
                    {dateRangeText && (
                      <span className="filter-chip">Date: {dateRangeText}</span>
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
            {drillLevel === "product" && ` Products${drillBranch ? ` (${drillBranch.name})` : ""}`}
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
                  {pages.map((p) => (
                    <button
                      key={p}
                      className={`pagination-btn ${
                        p === currentPage ? "active" : ""
                      }`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
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

export default PersonalSavingsReport;
