import React from "react";
import "../LoanPastDueReports.css";
import { ROWS_PER_PAGE, getVisiblePages } from "../loanQueryUtils";
import type { BranchDrilldownGroup } from "../types";

interface BranchDrilldownProps {
  branchGroups: BranchDrilldownGroup[];
  detailColumns: string[];
  expandedBranches: Record<string, boolean>;
  branchPages: Record<string, number>;
  onToggleBranch: (key: string) => void;
  onBranchPageChange: (key: string, page: number) => void;
  expandedBranchProducts: Record<string, boolean>;
  branchProductPages: Record<string, number>;
  onToggleBranchProduct: (key: string) => void;
  onBranchProductPageChange: (key: string, page: number) => void;
  formatNumber: (value: number) => string;
}

const BranchDrilldown: React.FC<BranchDrilldownProps> = ({
  branchGroups,
  detailColumns,
  expandedBranches,
  branchPages,
  onToggleBranch,
  onBranchPageChange,
  expandedBranchProducts,
  branchProductPages,
  onToggleBranchProduct,
  onBranchProductPageChange,
  formatNumber,
}) => (
  <div className="branch-drilldown">
    {branchGroups.map((group) => {
      const key = String(group.branchId);
      const isOpen = expandedBranches[key] ?? false;
      const branchTotalPages = Math.max(1, Math.ceil(group.rows.length / ROWS_PER_PAGE));
      const branchPage = Math.min(branchPages[key] ?? 1, branchTotalPages);
      const branchVisiblePages = getVisiblePages(branchPage, branchTotalPages);
      const branchRows = group.rows.slice((branchPage - 1) * ROWS_PER_PAGE, branchPage * ROWS_PER_PAGE);

      return (
        <div className="branch-panel" key={key}>
          <div className="branch-header">
            <button className="branch-toggle" type="button" onClick={() => onToggleBranch(key)}>
              <span className="branch-caret">{isOpen ? "v" : ">"}</span>
              <span className="branch-name">{group.branchName}</span>
              <span className="branch-chip">
                {group.totals.accounts} account{group.totals.accounts === 1 ? "" : "s"}
              </span>
            </button>
            <div className="branch-metrics">
              <span>Capital {formatNumber(group.totals.capital)}</span>
              <span>Balance {formatNumber(group.totals.balance)}</span>
              <span>Interest {formatNumber(group.totals.interest)}</span>
              <span>Past Due {formatNumber(group.totals.pastDueAmount)}</span>
              <span>Inst. Due {formatNumber(group.totals.capitalInstallment)}</span>
              <span>PD/Install {formatNumber(group.totals.passdueInstallment)}</span>
              <span>Avg PD Days {formatNumber(group.totals.avgPastDueDays)}</span>
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
                            onClick={() => onToggleBranchProduct(productKey)}
                          >
                            <span className="branch-caret">{productIsOpen ? "v" : ">"}</span>
                            <span className="branch-name">{productGroup.productName}</span>
                            <span className="branch-chip">
                              {productGroup.totals.accounts} account{productGroup.totals.accounts === 1 ? "" : "s"}
                            </span>
                          </button>
                          <div className="branch-metrics">
                            <span>Capital {formatNumber(productGroup.totals.capital)}</span>
                            <span>Balance {formatNumber(productGroup.totals.balance)}</span>
                            <span>Interest {formatNumber(productGroup.totals.interest)}</span>
                            <span>Past Due {formatNumber(productGroup.totals.pastDueAmount)}</span>
                            <span>Inst. Due {formatNumber(productGroup.totals.capitalInstallment)}</span>
                            <span>PD/Install {formatNumber(productGroup.totals.passdueInstallment)}</span>
                            <span>Avg PD Days {formatNumber(productGroup.totals.avgPastDueDays)}</span>
                          </div>
                        </div>

                        {productIsOpen && (
                          <div className="branch-body">
                            {productGroup.rows.length > ROWS_PER_PAGE && (
                              <div className="branch-pagination">
                                <button
                                  className="pagination-btn"
                                  onClick={() => onBranchProductPageChange(productKey, Math.max(1, productPage - 1))}
                                  disabled={productPage === 1}
                                >
                                  Previous
                                </button>
                                <div className="pagination-numbers">
                                  {productVisiblePages.map((page) => (
                                    <button
                                      key={`${productKey}-page-${page}`}
                                      className={`pagination-number ${productPage === page ? "active" : ""}`}
                                      onClick={() => onBranchProductPageChange(productKey, page)}
                                    >
                                      {page}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  className="pagination-btn"
                                  onClick={() => onBranchProductPageChange(productKey, Math.min(productTotalPages, productPage + 1))}
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
                    onClick={() => onBranchPageChange(key, Math.max(1, branchPage - 1))}
                    disabled={branchPage === 1}
                  >
                    Previous
                  </button>
                  <div className="pagination-numbers">
                    {branchVisiblePages.map((page) => (
                      <button
                        key={`${key}-page-${page}`}
                        className={`pagination-number ${branchPage === page ? "active" : ""}`}
                        onClick={() => onBranchPageChange(key, page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => onBranchPageChange(key, Math.min(branchTotalPages, branchPage + 1))}
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
);

export default BranchDrilldown;
