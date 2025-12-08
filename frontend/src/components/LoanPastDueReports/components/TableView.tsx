import React from "react";
import "../LoanPastDueReports.css";
import { ROWS_PER_PAGE } from "../loanQueryUtils";

interface TableViewProps {
  columns: string[];
  paginatedData: any[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
  visiblePages: number[];
  onPageChange: (page: number) => void;
}

const TableView: React.FC<TableViewProps> = ({
  columns,
  paginatedData,
  totalRows,
  currentPage,
  totalPages,
  visiblePages,
  onPageChange,
}) => (
  <>
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
  </>
);

export default TableView;
