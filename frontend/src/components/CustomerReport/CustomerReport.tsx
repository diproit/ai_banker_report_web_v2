import React, { useState, useEffect } from "react";
import "./CustomerReport.css";

interface Customer {
  "Ref member number": string;
  "Customer type": string;
  Name: string;
  Address: string;
  Phone: string;
  Mobile: string;
  "Date of Birth": string;
  Sex: string;
  "Branch Name": string;
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
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterCustomerType, setFilterCustomerType] = useState<string>("all");
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

  // Handle print action
  const handlePrint = () => {
    console.log("=== Print Report ===");
    console.log("Branch:", branchName);
    console.log("Customer Type:", customerType || "All");
    console.log("Filter - Branch:", filterBranch);
    console.log("Filter - Customer Type:", filterCustomerType);
    console.log("Total Records:", filteredData.length);
    console.log("====================");
  };

  // Handle export action
  const handleExport = () => {
    console.log("=== Export Report ===");
    console.log("Branch:", branchName);
    console.log("Customer Type:", customerType || "All");
    console.log("Filter - Branch:", filterBranch);
    console.log("Filter - Customer Type:", filterCustomerType);
    console.log("Total Records:", filteredData.length);
    console.log("Data:", filteredData);
    console.log("=====================");
  };

  return (
    <div className="customer-report-card">
      <h1 className="report-main-heading">{instituteName}</h1>
      <h2 className="report-sub-heading">
        Customer List for {branchName}
        {customerType && ` - ${customerType}`}
      </h2>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="filter-branch">Filter by Branch:</label>
          <select
            id="filter-branch"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Branches</option>
            {uniqueBranches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-customer-type">Filter by Customer Type:</label>
          <select
            id="filter-customer-type"
            value={filterCustomerType}
            onChange={(e) => setFilterCustomerType(e.target.value)}
            className="filter-select"
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
      <div className="report-actions">
        <button className="btn-print" onClick={handlePrint}>
          Print
        </button>
        <button className="btn-export" onClick={handleExport}>
          Export
        </button>
      </div>

      <div className="report-table-section">
        <table className="report-table">
          <thead>
            <tr>
              <th>Ref member number</th>
              <th>Customer type</th>
              <th>Name</th>
              <th>Address</th>
              <th className="align-right">Phone</th>
              <th className="align-right">Mobile</th>
              <th className="align-right">Date of Birth</th>
              <th>Sex</th>
              <th>Branch Name</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((customer, index) => {
                // Format date as YYYY/MM/DD
                let formattedDate = "";
                if (customer["Date of Birth"]) {
                  const date = new Date(customer["Date of Birth"]);
                  if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    formattedDate = `${year}/${month}/${day}`;
                  }
                }

                return (
                  <tr key={index}>
                    <td>{customer["Ref member number"]}</td>
                    <td>{customer["Customer type"]}</td>
                    <td>{customer["Name"]}</td>
                    <td>{customer["Address"]}</td>
                    <td className="align-right">{customer["Phone"]}</td>
                    <td className="align-right">{customer["Mobile"]}</td>
                    <td className="align-right">{formattedDate}</td>
                    <td>{customer["Sex"]}</td>
                    <td>{customer["Branch Name"]}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="no-data">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredData.length > rowsPerPage && (
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
