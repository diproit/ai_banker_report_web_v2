import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDueReports.css";
import { ROWS_PER_PAGE, getTodayDate, getVisiblePages } from "./loanQueryUtils";
import type { BranchDrilldownGroup, ProductDrilldownGroup } from "./types";
import DrilldownTabs, { type DrilldownView } from "./components/DrilldownTabs";
import BranchDrilldown from "./components/BranchDrilldown";
import ProductDrilldown from "./components/ProductDrilldown";
import TableView from "./components/TableView";

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
  isAllBranches: boolean;
  branchGroups: BranchDrilldownGroup[] | null;
  productGroups: ProductDrilldownGroup[] | null;
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
  isAllBranches,
  branchGroups,
  productGroups,
}) => {
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [branchPages, setBranchPages] = useState<Record<string, number>>({});
  const [expandedBranchProducts, setExpandedBranchProducts] = useState<Record<string, boolean>>({});
  const [branchProductPages, setBranchProductPages] = useState<Record<string, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [productPages, setProductPages] = useState<Record<string, number>>({});
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownView>("table");

  useEffect(() => {
    if (isAllBranches && branchGroups && branchGroups.length > 0) {
      setActiveDrilldown("branch");
    } else if (productGroups && productGroups.length > 0) {
      setActiveDrilldown("product");
    } else {
      setActiveDrilldown("table");
    }
  }, [branchGroups, productGroups, isAllBranches]);

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

  const hasBranchDrilldown = isAllBranches && branchGroups && branchGroups.length > 0;
  const hasProductDrilldown = productGroups && productGroups.length > 0;

  const detailColumns = useMemo(() => {
    const excluded = new Set<string>();

    if (activeDrilldown === "branch" && isAllBranches) {
      excluded.add("branch_name");
      excluded.add("branch_id");
    }

    if (activeDrilldown === "product") {
      excluded.add("product_name");
      excluded.add("product_id");
    }

    return excluded.size ? columns.filter((col) => !excluded.has(col)) : columns;
  }, [columns, activeDrilldown, isAllBranches]);

  const formatNumber = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

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
                <div className="report-meta">Generated {getTodayDate()} - {totalRows} row{totalRows === 1 ? "" : "s"}</div>
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
              <DrilldownTabs
                active={activeDrilldown}
                hasBranch={hasBranchDrilldown}
                hasProduct={hasProductDrilldown}
                onChange={setActiveDrilldown}
              />

              {activeDrilldown === "branch" && hasBranchDrilldown ? (
                <BranchDrilldown
                  branchGroups={branchGroups ?? []}
                  detailColumns={detailColumns}
                  expandedBranches={expandedBranches}
                  branchPages={branchPages}
                  onToggleBranch={toggleBranch}
                  onBranchPageChange={setBranchPage}
                  expandedBranchProducts={expandedBranchProducts}
                  branchProductPages={branchProductPages}
                  onToggleBranchProduct={toggleBranchProduct}
                  onBranchProductPageChange={setBranchProductPage}
                  formatNumber={formatNumber}
                />
              ) : activeDrilldown === "product" && hasProductDrilldown ? (
                <ProductDrilldown
                  productGroups={productGroups ?? []}
                  detailColumns={detailColumns}
                  expandedProducts={expandedProducts}
                  productPages={productPages}
                  onToggleProduct={toggleProduct}
                  onProductPageChange={setProductPage}
                  formatNumber={formatNumber}
                />
              ) : (
                <TableView
                  columns={columns}
                  paginatedData={paginatedData}
                  totalRows={totalRows}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  visiblePages={visiblePages}
                  onPageChange={onPageChange}
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
  );
};

export default ReportSection;
