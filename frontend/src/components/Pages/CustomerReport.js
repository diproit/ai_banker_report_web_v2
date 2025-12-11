import React, { useState, useEffect } from "react";
import "./CustomerReport.css";

const CustomerReport = ({
  branchName,
  customerType,
  data,
  instituteName = "Institute Name",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterCustomerType, setFilterCustomerType] = useState("all");
  const rowsPerPage = 10;

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
    setFilterBranch("all");
    setFilterCustomerType("all");
  }, [data]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBranch, filterCustomerType]);

  // Get unique branches and customer types from data
  const uniqueBranches = Array.from(
    new Set(data.map((item) => item["Branch Name"]).filter(Boolean))
  ).sort();

  const uniqueCustomerTypes = Array.from(
    new Set(data.map((item) => item["Customer type"]).filter(Boolean))
  ).sort();

  // Filter data based on selected filters
  const filteredData = data.filter((item) => {
    const branchMatch =
      filterBranch === "all" || item["Branch Name"] === filterBranch;
    const typeMatch =
      filterCustomerType === "all" ||
      item["Customer type"] === filterCustomerType;
    return branchMatch && typeMatch;
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

    // Adjust start if we're near the end
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
    // Convert data to CSV
    const headers = Object.keys(filteredData[0] || {});
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `customer_list_${getTodayDate().replace(/\//g, "_")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="cr-customer-report-card">
      <h1 className="cr-report-main-heading">{instituteName}</h1>
      <h2 className="cr-report-sub-heading">
        Customer List for {branchName}
        {customerType && ` - ${customerType}`}
      </h2>

      {/* Filter Section */}
      <div className="cr-filter-section">
        <div className="cr-filter-group">
          <label htmlFor="filter-branch">Filter by Branch:</label>
          <select
            id="filter-branch"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="cr-filter-select"
          >
            <option value="all">All Branches</option>
            {uniqueBranches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="cr-filter-group">
          <label htmlFor="filter-customer-type">Filter by Customer Type:</label>
          <select
            id="filter-customer-type"
            value={filterCustomerType}
            onChange={(e) => setFilterCustomerType(e.target.value)}
            className="cr-filter-select"
          >
            <option value="all">All Types</option>
            {uniqueCustomerTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="cr-report-actions">
        <button className="cr-btn-print" onClick={handlePrint}>
          Print
        </button>
        <button className="cr-btn-export" onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Screen view - paginated data */}
      <div className="cr-report-table-section cr-screen-only">
        <table className="cr-report-table">
          <thead>
            <tr>
              <th>Ref member number</th>
              <th>Customer type</th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Mobile</th>
              <th>Date of Birth</th>
              <th>Sex</th>
              <th>Branch Name</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((customer, index) => (
              <tr key={index}>
                <td>{customer["Ref member number"]}</td>
                <td>{customer["Customer type"]}</td>
                <td>{customer["Name"]}</td>
                <td>{customer["Address"]}</td>
                <td>{customer["Phone"]}</td>
                <td>{customer["Mobile"]}</td>
                <td>
                  {customer["Date of Birth"]
                    ? new Date(customer["Date of Birth"]).toLocaleDateString()
                    : ""}
                </td>
                <td>{customer["Sex"]}</td>
                <td>{customer["Branch Name"]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <p className="cr-no-data-message">No data available</p>
        )}
      </div>

      {/* Print view - all data */}
      <div className="cr-report-table-section cr-print-only">
        <table className="cr-report-table">
          <thead>
            <tr>
              <th>Ref member number</th>
              <th>Customer type</th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Mobile</th>
              <th>Date of Birth</th>
              <th>Sex</th>
              <th>Branch Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((customer, index) => (
              <tr key={index}>
                <td>{customer["Ref member number"]}</td>
                <td>{customer["Customer type"]}</td>
                <td>{customer["Name"]}</td>
                <td>{customer["Address"]}</td>
                <td>{customer["Phone"]}</td>
                <td>{customer["Mobile"]}</td>
                <td>
                  {customer["Date of Birth"]
                    ? new Date(customer["Date of Birth"]).toLocaleDateString()
                    : ""}
                </td>
                <td>{customer["Sex"]}</td>
                <td>{customer["Branch Name"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cr-pagination">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="cr-pagination-btn"
          >
            Previous
          </button>

          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`cr-pagination-btn ${
                currentPage === page ? "active" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="cr-pagination-btn"
          >
            Next
          </button>

          <span className="cr-pagination-info">
            Page {currentPage} of {totalPages} (Total: {filteredData.length}{" "}
            records)
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="cr-report-footer">
        <p>Printed On: {getTodayDate()}</p>
      </div>

      {/* Print-only footer */}
      <div className="cr-print-only-footer">{getPrintDate()}</div>
    </div>
  );
};

export default CustomerReport;
