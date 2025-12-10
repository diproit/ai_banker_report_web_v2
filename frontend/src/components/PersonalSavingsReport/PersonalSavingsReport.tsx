import React, { useEffect, useMemo, useState } from "react";
import "../LoanPastDueReports/LoanPastDueReports.css";
import { sqlExecutorApi } from "../../services/sqlExecutorService";
import TableView from "../LoanPastDueReports/components/TableView";
import DrilldownTabs, { type DrilldownView } from "../LoanPastDueReports/components/DrilldownTabs";
import { ROWS_PER_PAGE, getTodayDate, getVisiblePages } from "../LoanPastDueReports/loanQueryUtils";
import type { DropdownOption } from "../LoanPastDueReports/types";

type SavingsProductGroup = {
  productId: string | number;
  productName: string;
  rows: any[];
  totals: { accounts: number; balance: number };
};

type SavingsBranchGroup = {
  branchId: string | number;
  branchName: string;
  rows: any[];
  totals: { accounts: number; balance: number };
  productGroups?: SavingsProductGroup[];
};

const parseNumericValue = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface SavingsQueryParams {
  fromDate?: string;
  toDate?: string;
  branchId: number;
  productId?: number | null;
}

const buildSavingsQuery = ({ fromDate, toDate, branchId, productId }: SavingsQueryParams) => {
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

const PersonalSavingsReport: React.FC = () => {
  const [branches, setBranches] = useState<DropdownOption[]>([]);
  const [products, setProducts] = useState<DropdownOption[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [instituteName, setInstituteName] = useState<string>("");
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [branchPages, setBranchPages] = useState<Record<string, number>>({});
  const [expandedBranchProducts, setExpandedBranchProducts] = useState<Record<string, boolean>>({});
  const [branchProductPages, setBranchProductPages] = useState<Record<string, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [productPages, setProductPages] = useState<Record<string, number>>({});
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownView>("table");

  const hasResults = reportData !== null && reportData.length > 0;
  const columns = useMemo(
    () => (reportData && reportData.length > 0 ? Object.keys(reportData[0]) : []),
    [reportData]
  );
  const totalPages = hasResults ? Math.ceil(reportData.length / ROWS_PER_PAGE) : 0;
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = hasResults ? reportData.slice(startIndex, endIndex) : [];

  const selectedBranchObj = selectedBranchId ? branches.find((b) => b.id === parseInt(selectedBranchId, 10)) : null;
  const selectedProductObj = selectedProductId ? products.find((p) => p.id === parseInt(selectedProductId, 10)) : null;
  const displayBranchName = selectedBranchObj?.name || "Selected Branch";
  const displayProductName = selectedProductObj?.name || "";
  const hasProductFilter = Boolean(selectedProductId);
  const isAllBranchesSelected = selectedBranchId === "0";

  const branchGroups = useMemo<SavingsBranchGroup[] | null>(() => {
    if (!reportData || !isAllBranchesSelected) return null;

    const grouped = new Map<string, SavingsBranchGroup>();

    const buildProductGroups = (rows: any[]): SavingsProductGroup[] => {
      const productMap = new Map<string, SavingsProductGroup>();

      rows.forEach((row) => {
        const productIdRaw = row.product_id ?? row.productId ?? row.product ?? row.productid ?? row.pl_account_type_id;
        const productName = row.product_name ?? row.productName ?? "Unknown Product";
        const productId = productIdRaw !== undefined && productIdRaw !== null ? productIdRaw : productName;
        const key = String(productId);

        if (!productMap.has(key)) {
          productMap.set(key, { productId, productName, rows: [], totals: { accounts: 0, balance: 0 } });
        }

        const group = productMap.get(key);
        if (!group) return;

        group.rows.push(row);
        group.totals.accounts += 1;
        group.totals.balance += parseNumericValue(row.account_balance ?? row.pl_account_balance ?? row.balance);
      });

      return Array.from(productMap.values());
    };

    reportData.forEach((row) => {
      const branchIdRaw = row.branch_id ?? row.branchId ?? row.branch ?? row.branchid;
      const branchName = row.branch_name ?? row.branchName ?? "Unknown Branch";
      const branchId = branchIdRaw !== undefined && branchIdRaw !== null ? branchIdRaw : branchName;
      const key = String(branchId);

      if (!grouped.has(key)) {
        grouped.set(key, { branchId, branchName, rows: [], totals: { accounts: 0, balance: 0 } });
      }

      const group = grouped.get(key);
      if (!group) return;

      group.rows.push(row);
      group.totals.accounts += 1;
      group.totals.balance += parseNumericValue(row.account_balance ?? row.pl_account_balance ?? row.balance);
    });

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      productGroups: buildProductGroups(group.rows),
    }));
  }, [reportData, isAllBranchesSelected]);

  const productGroups = useMemo<SavingsProductGroup[] | null>(() => {
    if (!reportData) return null;

    const grouped = new Map<string, SavingsProductGroup>();

    reportData.forEach((row) => {
      const productIdRaw = row.product_id ?? row.productId ?? row.product ?? row.productid ?? row.pl_account_type_id;
      const productName = row.product_name ?? row.productName ?? "Unknown Product";
      const productId = productIdRaw !== undefined && productIdRaw !== null ? productIdRaw : productName;
      const key = String(productId);

      if (!grouped.has(key)) {
        grouped.set(key, { productId, productName, rows: [], totals: { accounts: 0, balance: 0 } });
      }

      const group = grouped.get(key);
      if (!group) return;

      group.rows.push(row);
      group.totals.accounts += 1;
      group.totals.balance += parseNumericValue(row.account_balance ?? row.pl_account_balance ?? row.balance);
    });

    return Array.from(grouped.values());
  }, [reportData]);
  const dateRangeText =
    fromDate && toDate
      ? `${fromDate} to ${toDate}`
      : fromDate
      ? `From ${fromDate}`
      : toDate
      ? `To ${toDate}`
      : "";

  const hasBranchDrilldown = isAllBranchesSelected && branchGroups && branchGroups.length > 0;
  const hasProductDrilldown = productGroups && productGroups.length > 0;

  const toggleBranch = (key: string) => {
    setExpandedBranches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setBranchPage = (key: string, page: number) => {
    setBranchPages((prev) => ({ ...prev, [key]: page }));
  };

  const toggleBranchProduct = (key: string) => {
    setExpandedBranchProducts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setBranchProductPage = (key: string, page: number) => {
    setBranchProductPages((prev) => ({ ...prev, [key]: page }));
  };

  const toggleProduct = (key: string) => {
    setExpandedProducts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setProductPage = (key: string, page: number) => {
    setProductPages((prev) => ({ ...prev, [key]: page }));
  };

  const detailColumns = useMemo(() => {
    const excluded = new Set<string>();

    if (activeDrilldown === "branch" && isAllBranchesSelected) {
      excluded.add("branch_name");
      excluded.add("branch_id");
    }

    if (activeDrilldown === "product") {
      excluded.add("product_name");
      excluded.add("product_id");
    }

    return excluded.size ? columns.filter((col) => !excluded.has(col)) : columns;
  }, [columns, activeDrilldown, isAllBranchesSelected]);

  const formatNumber = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setIsLoadingDropdowns(true);
        const [branchList, productList, institute] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getSavingsProducts(),
          sqlExecutorApi.getInstitute(),
        ]);
        setBranches(branchList || []);
        setProducts(productList || []);
        if (institute?.name) {
          setInstituteName(institute.name);
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

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (isAllBranchesSelected && branchGroups && branchGroups.length > 0) {
      setActiveDrilldown("branch");
    } else if (productGroups && productGroups.length > 0) {
      setActiveDrilldown("product");
    } else {
      setActiveDrilldown("table");
    }
  }, [isAllBranchesSelected, branchGroups, productGroups]);

  const handleGenerate = async () => {
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setReportData(null);

    const branchId = parseInt(selectedBranchId, 10);
    const productId = selectedProductId ? parseInt(selectedProductId, 10) : null;

    try {
      const query = buildSavingsQuery({
        fromDate,
        toDate,
        branchId,
        productId,
      });

      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setReportData(response.data);
        setCurrentPage(1);
      } else {
        setReportData(null);
        setReportError(response.error || "Failed to fetch personal savings report");
      }
    } catch (err) {
      console.error("Error generating savings report:", err);
      setReportData(null);
      setReportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!hasResults || !reportData) return;

    const printableRows = reportData
      .map(
        (row) =>
          `<tr>${columns
            .map((col) => `<td style="padding:6px 8px;border:1px solid #ccc;">${String(row[col] ?? "")}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const printableHeader = columns
      .map((col) => `<th style="padding:8px 8px;border:1px solid #ccc;background:#f1f3f5;text-align:left;">${col}</th>`)
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
          <h2>Branch: ${displayBranchName}${hasProductFilter ? ` | Product: ${displayProductName}` : ""}${
            dateRangeText ? ` | Date: ${dateRangeText}` : ""
          }</h2>
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
    if (!hasResults || !reportData) return;

    const header = columns.join(",");
    const rows = reportData.map((row) =>
      columns
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
    <div className="loan-pastdue-container">
      <div className="loan-pastdue-card">
        <h1 className="loan-pastdue-heading">Personal Savings Report</h1>

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
            <option value="">{isLoadingDropdowns ? "Loading branches..." : "Select Branch"}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id.toString()}>
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

        <div className="form-group">
          <label htmlFor="savings-product">Savings Product</label>
          <select
            id="savings-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">{isLoadingDropdowns ? "Loading..." : "Select Savings Product"}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date Range</label>
          <div className="controls">
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
        </div>

        <div className="form-actions">
          <button className="btn-generate-report" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {(reportError || reportData) && (
        <div className="loan-pastdue-results-card">
          <div className="report-results">
            {reportError && (
              <div className="error-message">
                <strong>Error:</strong> {reportError}
              </div>
            )}

            {hasResults ? (
              <div className="loan-report-card">
                <div className="report-toolbar">
                  <div className="report-heading-block">
                    <div className="report-title">Personal Savings Report</div>
                    {instituteName && <div className="report-institute sub">{instituteName}</div>}
                    <div className="report-meta">
                      Generated {getTodayDate()} - {reportData?.length || 0} row{(reportData?.length || 0) === 1 ? "" : "s"}
                    </div>
                    <div className="report-filters">
                      <span className="filter-chip">Branch: {displayBranchName}</span>
                      {hasProductFilter && <span className="filter-chip">Product: {displayProductName}</span>}
                      {dateRangeText && <span className="filter-chip">Date: {dateRangeText}</span>}
                    </div>
                  </div>
                  <div className="report-actions">
                    <button className="btn-action" type="button" onClick={handlePrint}>
                      Print
                    </button>
                    <button className="btn-action primary" type="button" onClick={handleExport}>
                      Export
                    </button>
                  </div>
                </div>

                <div className="report-table-section">
                  <DrilldownTabs
                    active={activeDrilldown}
                    hasBranch={hasBranchDrilldown}
                    hasProduct={hasProductDrilldown}
                    onChange={setActiveDrilldown}
                  />

                  {activeDrilldown === "branch" && hasBranchDrilldown ? (
                    <div className="branch-drilldown">
                      {branchGroups?.map((group) => {
                        const key = String(group.branchId);
                        const isOpen = expandedBranches[key] ?? false;
                        const branchTotalPages = Math.max(1, Math.ceil(group.rows.length / ROWS_PER_PAGE));
                        const branchPage = Math.min(branchPages[key] ?? 1, branchTotalPages);
                        const branchVisiblePages = getVisiblePages(branchPage, branchTotalPages);
                        const branchRows = group.rows.slice((branchPage - 1) * ROWS_PER_PAGE, branchPage * ROWS_PER_PAGE);

                        return (
                          <div className="branch-panel" key={key}>
                            <div className="branch-header">
                              <button className="branch-toggle" type="button" onClick={() => toggleBranch(key)}>
                                <span className="branch-caret">{isOpen ? "v" : ">"}</span>
                                <span className="branch-name">{group.branchName}</span>
                                <span className="branch-chip">
                                  {group.totals.accounts} account{group.totals.accounts === 1 ? "" : "s"}
                                </span>
                              </button>
                              <div className="branch-metrics">
                                <span>Total Balance {formatNumber(group.totals.balance)}</span>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="branch-body">
                                {group.productGroups && group.productGroups.length > 0 && (
                                  <div className="product-sub-drilldown">
                                    {group.productGroups.map((productGroup) => {
                                      const productKey = `${key}-${productGroup.productId}`;
                                      const productIsOpen = expandedBranchProducts[productKey] ?? false;
                                      const productTotalPages = Math.max(1, Math.ceil(productGroup.rows.length / ROWS_PER_PAGE));
                                      const productPage = Math.min(branchProductPages[productKey] ?? 1, productTotalPages);
                                      const productVisiblePages = getVisiblePages(productPage, productTotalPages);
                                      const productRows = productGroup.rows.slice(
                                        (productPage - 1) * ROWS_PER_PAGE,
                                        productPage * ROWS_PER_PAGE
                                      );

                                      return (
                                        <div className="branch-panel nested" key={productKey}>
                                          <div className="branch-header">
                                            <button
                                              className="branch-toggle"
                                              type="button"
                                              onClick={() => toggleBranchProduct(productKey)}
                                            >
                                              <span className="branch-caret">{productIsOpen ? "v" : ">"}</span>
                                              <span className="branch-name">{productGroup.productName}</span>
                                              <span className="branch-chip">
                                                {productGroup.totals.accounts} account
                                                {productGroup.totals.accounts === 1 ? "" : "s"}
                                              </span>
                                            </button>
                                            <div className="branch-metrics">
                                              <span>Total Balance {formatNumber(productGroup.totals.balance)}</span>
                                            </div>
                                          </div>

                                          {productIsOpen && (
                                            <div className="branch-body">
                                              {productGroup.rows.length > ROWS_PER_PAGE && (
                                                <div className="branch-pagination">
                                                  <button
                                                    className="pagination-btn"
                                                    onClick={() =>
                                                      setBranchProductPage(productKey, Math.max(1, productPage - 1))
                                                    }
                                                    disabled={productPage === 1}
                                                  >
                                                    Previous
                                                  </button>
                                                  <div className="pagination-numbers">
                                                    {productVisiblePages.map((page) => (
                                                      <button
                                                        key={`${productKey}-page-${page}`}
                                                        className={`pagination-number ${productPage === page ? "active" : ""}`}
                                                        onClick={() => setBranchProductPage(productKey, page)}
                                                      >
                                                        {page}
                                                      </button>
                                                    ))}
                                                  </div>
                                                  <button
                                                    className="pagination-btn"
                                                    onClick={() =>
                                                      setBranchProductPage(productKey, Math.min(productTotalPages, productPage + 1))
                                                    }
                                                    disabled={productPage === productTotalPages}
                                                  >
                                                    Next
                                                  </button>
                                                </div>
                                              )}

                                              <div className="table-wrap">
                                                <table className="report-table">
                                                  <thead>
                                                    <tr>
                                                      {detailColumns.map((col) => (
                                                        <th key={col}>{col}</th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {productRows.map((row, idx) => (
                                                      <tr key={`${productKey}-${idx}`}>
                                                        {detailColumns.map((col) => (
                                                          <td key={col}>{String(row[col] ?? "")}</td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {group.rows.length > ROWS_PER_PAGE && (
                                  <div className="branch-pagination">
                                    <button
                                      className="pagination-btn"
                                      onClick={() => setBranchPage(key, Math.max(1, branchPage - 1))}
                                      disabled={branchPage === 1}
                                    >
                                      Previous
                                    </button>
                                    <div className="pagination-numbers">
                                      {branchVisiblePages.map((page) => (
                                        <button
                                          key={`${key}-page-${page}`}
                                          className={`pagination-number ${branchPage === page ? "active" : ""}`}
                                          onClick={() => setBranchPage(key, page)}
                                        >
                                          {page}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      className="pagination-btn"
                                      onClick={() => setBranchPage(key, Math.min(branchTotalPages, branchPage + 1))}
                                      disabled={branchPage === branchTotalPages}
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}

                                <div className="table-wrap">
                                  <table className="report-table">
                                    <thead>
                                      <tr>
                                        {detailColumns.map((col) => (
                                          <th key={col}>{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {branchRows.map((row, idx) => (
                                        <tr key={`${key}-${idx}`}>
                                          {detailColumns.map((col) => (
                                            <td key={col}>{String(row[col] ?? "")}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : activeDrilldown === "product" && hasProductDrilldown ? (
                    <div className="branch-drilldown">
                      {productGroups?.map((group) => {
                        const key = String(group.productId);
                        const isOpen = expandedProducts[key] ?? false;
                        const productTotalPages = Math.max(1, Math.ceil(group.rows.length / ROWS_PER_PAGE));
                        const productPage = Math.min(productPages[key] ?? 1, productTotalPages);
                        const productVisiblePages = getVisiblePages(productPage, productTotalPages);
                        const productRows = group.rows.slice((productPage - 1) * ROWS_PER_PAGE, productPage * ROWS_PER_PAGE);

                        return (
                          <div className="branch-panel" key={key}>
                            <div className="branch-header">
                              <button className="branch-toggle" type="button" onClick={() => toggleProduct(key)}>
                                <span className="branch-caret">{isOpen ? "v" : ">"}</span>
                                <span className="branch-name">{group.productName}</span>
                                <span className="branch-chip">
                                  {group.totals.accounts} account{group.totals.accounts === 1 ? "" : "s"}
                                </span>
                              </button>
                              <div className="branch-metrics">
                                <span>Total Balance {formatNumber(group.totals.balance)}</span>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="branch-body">
                                {group.rows.length > ROWS_PER_PAGE && (
                                  <div className="branch-pagination">
                                    <button
                                      className="pagination-btn"
                                      onClick={() => setProductPage(key, Math.max(1, productPage - 1))}
                                      disabled={productPage === 1}
                                    >
                                      Previous
                                    </button>
                                    <div className="pagination-numbers">
                                      {productVisiblePages.map((page) => (
                                        <button
                                          key={`${key}-page-${page}`}
                                          className={`pagination-number ${productPage === page ? "active" : ""}`}
                                          onClick={() => setProductPage(key, page)}
                                        >
                                          {page}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      className="pagination-btn"
                                      onClick={() => setProductPage(key, Math.min(productTotalPages, productPage + 1))}
                                      disabled={productPage === productTotalPages}
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}

                                <div className="table-wrap">
                                  <table className="report-table">
                                    <thead>
                                      <tr>
                                        {detailColumns.map((col) => (
                                          <th key={col}>{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {productRows.map((row, idx) => (
                                        <tr key={`${key}-${idx}`}>
                                          {detailColumns.map((col) => (
                                            <td key={col}>{String(row[col] ?? "")}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <TableView
                      columns={columns}
                      paginatedData={paginatedData}
                      totalRows={reportData?.length || 0}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      visiblePages={visiblePages}
                      onPageChange={setCurrentPage}
                    />
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
      )}
    </div>
  );
};

export default PersonalSavingsReport;
