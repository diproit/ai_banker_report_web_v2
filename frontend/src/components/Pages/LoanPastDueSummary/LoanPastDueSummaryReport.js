import React, { useState, useEffect } from "react";
import "./LoanPastDueSummaryReport.css";

const LoanPastDueSummaryReport = ({
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
    // Create a hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    // Prepare print data
    const recordsPerPage = 10;
    const pages = [];
    for (let i = 0; i < filteredData.length; i += recordsPerPage) {
      pages.push(filteredData.slice(i, i + recordsPerPage));
    }

    const getPrintDate = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Build HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loan Past Due Summary - Print Preview</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 landscape;
              margin: 1cm;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }

            .print-preview-container {
              width: 100%;
              background: white;
            }

            .print-page {
              width: 100%;
              min-height: 100vh;
              page-break-after: always;
              padding: 20px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }

            .print-page:last-child {
              page-break-after: auto;
            }

            .print-heading-box {
              padding: 15px 0;
              margin-bottom: 10px;
              text-align: center;
            }

            .print-main-heading {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
              color: #000;
            }

            .print-subheading-box {
              padding: 10px 0;
              margin-bottom: 15px;
              text-align: center;
            }

            .print-sub-heading {
              font-size: 16px;
              font-weight: 600;
              margin: 0;
              color: #000;
            }

            .print-table-box {
              flex: 1;
              margin-bottom: 15px;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              color: #333;
            }

            .print-table thead {
              background-color: #f5f5f5;
              border-bottom: 2px solid #333;
            }

            .print-table th {
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 11px;
              border: 1px solid #666;
              color: #333;
              letter-spacing: 0.3px;
            }

            .print-table td {
              padding: 9px 8px;
              border: 1px solid #999;
              text-align: left;
              color: #333;
            }

            .print-table tbody tr:nth-child(even) {
              background-color: #fafafa;
            }

            .print-table tbody tr:nth-child(odd) {
              background-color: white;
            }

            .print-footer {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 12px;
              color: #000;
            }

            .print-date,
            .print-page-number {
              font-weight: 500;
            }

            @media print {
              .print-page {
                min-height: auto;
                padding: 15px;
              }

              .print-heading-box,
              .print-subheading-box,
              .print-table thead {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }

              .print-table tbody tr:nth-child(even) {
                background-color: #fafafa !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-preview-container">
    `;

    pages.forEach((pageData, pageIndex) => {
      htmlContent += '<div class="print-page">';

      // Show heading only on first page
      if (pageIndex === 0) {
        htmlContent += `
          <div class="print-heading-box">
            <h1 class="print-main-heading">${instituteName}</h1>
          </div>
          <div class="print-subheading-box">
            <h2 class="print-sub-heading">Loan Past Due Summary for ${branchName}${
          selectedDate ? ` - As of ${selectedDate}` : ""
        }</h2>
          </div>
        `;
      }

      // Table
      htmlContent += `
        <div class="print-table-box">
          <table class="print-table">
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
      `;

      pageData.forEach((record) => {
        const totalBalance = record["Total Balance"]
          ? parseFloat(record["Total Balance"]).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0.00";

        htmlContent += `
          <tr>
            <td>${record["Product Name"] || ""}</td>
            <td>${record["Number of Accounts"] || ""}</td>
            <td>${record["Interest Policy"] || ""}</td>
            <td>${totalBalance}</td>
            <td>${record["Min Interest Rate"] || ""}</td>
            <td>${record["Branch Name"] || ""}</td>
            <td>${record["Max Interest Rate"] || ""}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </div>
        <div class="print-footer">
          <span class="print-date">${getPrintDate()}</span>
          <span class="print-page-number">Page ${pageIndex + 1}</span>
        </div>
      </div>
      `;
    });

    htmlContent += "</div></body></html>";

    // Write HTML to iframe
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
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
      `loan_pastdue_summary_${getTodayDate().replace(/\//g, "_")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="lpds-loan-summary-report-card">
      <h1 className="lpds-report-main-heading">{instituteName}</h1>
      <h2 className="lpds-report-sub-heading">
        Loan Past Due Summary for {branchName}
        {selectedDate && ` - As of ${selectedDate}`}
      </h2>

      {/* Filter Section */}
      <div className="lpds-filter-section">
        <div className="lpds-filter-group">
          <label htmlFor="filter-product">Filter by Product Name:</label>
          <select
            id="filter-product"
            value={filterProductName}
            onChange={(e) => setFilterProductName(e.target.value)}
            className="lpds-filter-select"
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
      <div className="lpds-report-actions">
        <button className="lpds-btn-print" onClick={handlePrint}>
          Print
        </button>
        <button className="lpds-btn-export" onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Screen view - paginated data */}
      <div className="lpds-report-table-section lpds-screen-only">
        <table className="lpds-report-table">
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
          <p className="lpds-no-data-message">No data available</p>
        )}
      </div>

      {/* Print view - all data */}
      <div className="lpds-report-table-section lpds-print-only">
        <table className="lpds-report-table">
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
        <div className="lpds-pagination">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="lpds-pagination-btn"
          >
            Previous
          </button>

          {getVisiblePages().map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`lpds-pagination-btn ${
                currentPage === page ? "active" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="lpds-pagination-btn"
          >
            Next
          </button>

          <span className="lpds-pagination-info">
            Page {currentPage} of {totalPages} (Total: {filteredData.length}{" "}
            records)
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="lpds-report-footer">
        <p>Printed On: {getTodayDate()}</p>
      </div>

      {/* Print-only footer */}
      <div className="lpds-print-only-footer">{getPrintDate()}</div>
    </div>
  );
};

export default LoanPastDueSummaryReport;
