import React, { useState } from "react";
import "./CustomerReport.css";

interface Customer {
  id: number;
  customerName: string;
  accountNumber: string;
  balance: number;
  status: string;
  lastTransaction: string;
}

interface CustomerReportProps {
  branchName: string;
  customerType: string;
  data: Customer[];
  instituteName?: string;
}

const CustomerReport: React.FC<CustomerReportProps> = ({
  branchName,
  customerType,
  data,
  instituteName = "Institute Name",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Get today's date in dd/mm/yyyy format
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate which page numbers to display (max 5)
  const getVisiblePages = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="customer-report-card">
      <h1 className="report-main-heading">{instituteName}</h1>
      <h2 className="report-sub-heading">
        Customer List for {branchName}
        {customerType && ` - ${customerType}`}
      </h2>

      <div className="report-table-section">
        <table className="report-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Account Number</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Last Transaction</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customerName}</td>
                  <td>{customer.accountNumber}</td>
                  <td>${customer.balance.toLocaleString()}</td>
                  <td>
                    <span
                      className={`status-badge status-${customer.status.toLowerCase()}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td>{customer.lastTransaction}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="no-data">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {data.length > rowsPerPage && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <div className="pagination-numbers">
              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  className={`pagination-number ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => handlePageClick(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="pagination-btn"
              onClick={handleNextPage}
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
          Page {String(currentPage).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
};

export default CustomerReport;
