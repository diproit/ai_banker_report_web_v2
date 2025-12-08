import React from "react";
import "../LoanPastDueReports.css";
import { ROWS_PER_PAGE, getVisiblePages } from "../loanQueryUtils";
import type { ProductDrilldownGroup } from "../types";

interface ProductDrilldownProps {
  productGroups: ProductDrilldownGroup[];
  detailColumns: string[];
  expandedProducts: Record<string, boolean>;
  productPages: Record<string, number>;
  onToggleProduct: (key: string) => void;
  onProductPageChange: (key: string, page: number) => void;
  formatNumber: (value: number) => string;
}

const ProductDrilldown: React.FC<ProductDrilldownProps> = ({
  productGroups,
  detailColumns,
  expandedProducts,
  productPages,
  onToggleProduct,
  onProductPageChange,
  formatNumber,
}) => (
  <div className="product-drilldown">
    {productGroups.map((group) => {
      const key = String(group.productId);
      const isOpen = expandedProducts[key] ?? false;
      const productTotalPages = Math.max(1, Math.ceil(group.rows.length / ROWS_PER_PAGE));
      const productPage = Math.min(productPages[key] ?? 1, productTotalPages);
      const productVisiblePages = getVisiblePages(productPage, productTotalPages);
      const productRows = group.rows.slice((productPage - 1) * ROWS_PER_PAGE, productPage * ROWS_PER_PAGE);

      return (
        <div className="branch-panel" key={key}>
          <div className="branch-header">
            <button className="branch-toggle" type="button" onClick={() => onToggleProduct(key)}>
              <span className="branch-caret">{isOpen ? "v" : ">"}</span>
              <span className="branch-name">{group.productName}</span>
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
              {group.rows.length > ROWS_PER_PAGE && (
                <div className="branch-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => onProductPageChange(key, Math.max(1, productPage - 1))}
                    disabled={productPage === 1}
                  >
                    Previous
                  </button>
                  <div className="pagination-numbers">
                    {productVisiblePages.map((page) => (
                      <button
                        key={`${key}-page-${page}`}
                        className={`pagination-number ${productPage === page ? "active" : ""}`}
                        onClick={() => onProductPageChange(key, page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => onProductPageChange(key, Math.min(productTotalPages, productPage + 1))}
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
);

export default ProductDrilldown;
