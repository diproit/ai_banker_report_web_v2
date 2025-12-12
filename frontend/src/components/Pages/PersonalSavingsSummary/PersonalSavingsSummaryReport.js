import React, { useState, useEffect } from "react";
import "./PersonalSavingsSummaryReport.css";

const PersonalSavingsSummaryReport = ({
  branchName,
  selectedDate,
  data,
  instituteName = "Institute Name",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterProductName, setFilterProductName] = useState("all");
  const rowsPerPage = 10;

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
    setFilterProductName("all");
  }, [data]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterProductName]);

  // Get unique product names from data
  const uniqueProductNames = Array.from(
    new Set(data.map((item) => item["Product Name"]).filter(Boolean))
  ).sort();

  // Filter data based on selected filters
  const filteredData = data.filter((item) => {
    const productMatch =
      filterProductName === "all" || item["Product Name"] === filterProductName;
    return productMatch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Get today's date in dd/mm/yyyy format
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get today's date in YYYY-MM-DD format for printing
  const getPrintDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
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

  const handlePageClick = (page) => {
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

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // Handle print action
  const handlePrint = () => {
    window.print();
  };

  // Handle export action
  const handleExport = () => {
    const headers = Object.keys(filteredData[0] || {});
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `personal_savings_summary_${getTodayDate().replace(/\//g, "_")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="psss-savings-summary-report-card">
      <h1 className="psss-report-main-heading">{instituteName}</h1>
      <h2 className="psss-report-sub-heading">
        Personal Savings Summary for {branchName}
        {selectedDate && ` - As of ${selectedDate}`}
      </h2>

      {/* Filter Section */}
      <div className="psss-filter-section">
        <div className="psss-filter-group">
          <label htmlFor="filter-product">Filter by Product Name:</label>
          <select
            id="filter-product"
            value={filterProductName}
            onChange={(e) => setFilterProductName(e.target.value)}
            className="psss-filter-select"
          >
            <option value="all">All Products</option>
            {uniqueProductNames.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="psss-report-actions">
        <button className="psss-btn-print" onClick={handlePrint}>
          Print
        </button>
        <button className="psss-btn-export" onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Screen view - paginated data */}
      <div className="psss-report-table-section psss-screen-only">
        <table className="psss-report-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Number of Accounts</th>
              <th>Interest Policy</th>
              <th>Total Balance</th>
              <th>Min Interest Rate</th>
              <th>Branch Name</th>
              <th>Max Interest Rate</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((record, index) => (
              <tr key={index}>
                <td>{record["Product Name"]}</td>
                <td>{record["Number of Accounts"]}</td>
                <td>{record["Interest Policy"]}</td>
                <td>
                  {record["Total Balance"]
                    ? parseFloat(record["Total Balance"]).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : "0.00"}
                </td>
                <td>{record["Min Interest Rate"]}</td>
                <td>{record["Branch Name"]}</td>
                <td>{record["Max Interest Rate"]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <p className="psss-no-data-message">No data available</p>
        )}
      </div>

      {/* Print view - all data */}
      <div className="psss-report-table-section psss-print-only">
        <table className="psss-report-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Number of Accounts</th>
              <th>Interest Policy</th>
              <th>Total Balance</th>
              <th>Min Interest Rate</th>
              <th>Branch Name</th>
              <th>Max Interest Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((record, index) => (
              <tr key={index}>
                <td>{record["Product Name"]}</td>
                <td>{record["Number of Accounts"]}</td>
                <td>{record["Interest Policy"]}</td>
                <td>
                  {record["Total Balance"]
                    ? parseFloat(record["Total Balance"]).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : "0.00"}
                </td>
                <td>{record["Min Interest Rate"]}</td>
                <td>{record["Branch Name"]}</td>
                <td>{record["Max Interest Rate"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="psss-pagination">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="psss-pagination-btn"
          >
            Previous
          </button>

          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`psss-pagination-btn ${
                currentPage === page ? "active" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="psss-pagination-btn"
          >
            Next
          </button>

          <span className="psss-pagination-info">
            Page {currentPage} of {totalPages} (Total: {filteredData.length}{" "}
            records)
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="psss-report-footer">
        <p>Printed On: {getTodayDate()}</p>
      </div>

      {/* Print-only footer */}
      <div className="psss-print-only-footer">{getPrintDate()}</div>
    </div>
  );
};

export default PersonalSavingsSummaryReport;
