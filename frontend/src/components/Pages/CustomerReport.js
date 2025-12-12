import React, { useState, useEffect } from "react";
import "./CustomerReport.css";

const CustomerReport = ({
  branchName,
  customerType,
  data,
  instituteName = "Institute Name",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});
  const rowsPerPage = 10;

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedGroups({});
  }, [data]);

  // Determine drill-down scenario
  const shouldShowDrillDown = !customerType; // No customer type selected
  const isAllBranches = branchName && branchName.toLowerCase() === "all";
  const drillDownMode = shouldShowDrillDown
    ? isAllBranches
      ? "branch-type"
      : "type-only"
    : "flat";

  // Use data directly without additional filtering
  const filteredData = data;

  // Group data for drill-down views
  const groupData = () => {
    if (drillDownMode === "flat") {
      return null; // No grouping needed
    }

    if (drillDownMode === "type-only") {
      // Group by Customer Type only
      const grouped = {};
      filteredData.forEach((item) => {
        const type = item["Customer type"] || "Unknown";
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(item);
      });
      return grouped;
    }

    if (drillDownMode === "branch-type") {
      // Group by Branch, then by Customer Type
      const grouped = {};
      filteredData.forEach((item) => {
        const branch = item["Branch Name"] || "Unknown";
        const type = item["Customer type"] || "Unknown";

        if (!grouped[branch]) {
          grouped[branch] = {};
        }
        if (!grouped[branch][type]) {
          grouped[branch][type] = [];
        }
        grouped[branch][type].push(item);
      });
      return grouped;
    }

    return null;
  };

  const groupedData = groupData();

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Expand all groups (for printing)
  const expandAllGroups = () => {
    if (!groupedData) return;

    const allKeys = {};
    if (drillDownMode === "type-only") {
      Object.keys(groupedData).forEach((key) => {
        allKeys[key] = true;
      });
    } else if (drillDownMode === "branch-type") {
      Object.keys(groupedData).forEach((branch) => {
        allKeys[branch] = true;
        Object.keys(groupedData[branch]).forEach((type) => {
          allKeys[`${branch}-${type}`] = true;
        });
      });
    }
    setExpandedGroups(allKeys);
  };

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
    // Create a hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    const getPrintDate = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Build HTML content with styles
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Report - Print Preview</title>
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

            /* Drill-down hierarchy styles */
            .print-group-header {
              background-color: #e8e8e8 !important;
              font-weight: 700;
              font-size: 12px;
            }

            .print-branch-header {
              background-color: #d0d0d0 !important;
              font-weight: 700;
              font-size: 13px;
            }

            .print-type-header {
              background-color: #e8e8e8 !important;
              font-weight: 600;
              font-size: 11px;
            }

            .print-type-header td {
              padding-left: 20px !important;
            }

            .print-column-header {
              background-color: #f5f5f5 !important;
              font-weight: 600;
            }

            .print-column-header th {
              border-bottom: 2px solid #333 !important;
              font-size: 10px;
              padding: 8px 6px;
            }

            .print-nested-row td:first-child {
              padding-left: 15px;
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
              .print-table thead,
              .print-group-header,
              .print-branch-header,
              .print-type-header,
              .print-column-header {
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

    // Generate content based on drill-down mode
    if (drillDownMode === "flat") {
      // Flat mode - paginated table
      const recordsPerPage = 8;
      const pages = [];
      for (let i = 0; i < filteredData.length; i += recordsPerPage) {
        pages.push(filteredData.slice(i, i + recordsPerPage));
      }

      pages.forEach((pageData, pageIndex) => {
        htmlContent += '<div class="print-page">';

        // Show heading on every page
        htmlContent += `
          <div class="print-heading-box">
            <h1 class="print-main-heading">${instituteName}</h1>
          </div>
          <div class="print-subheading-box">
            <h2 class="print-sub-heading">Customer List for ${branchName}${
          customerType ? ` - ${customerType}` : ""
        }</h2>
          </div>
        `;

        htmlContent += `
          <div class="print-table-box">
            <table class="print-table">
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
        `;

        pageData.forEach((customer) => {
          const dob = customer["Date of Birth"]
            ? new Date(customer["Date of Birth"]).toLocaleDateString()
            : "";

          htmlContent += `
            <tr>
              <td>${customer["Ref member number"] || ""}</td>
              <td>${customer["Customer type"] || ""}</td>
              <td>${customer["Name"] || ""}</td>
              <td>${customer["Address"] || ""}</td>
              <td>${customer["Phone"] || ""}</td>
              <td>${customer["Mobile"] || ""}</td>
              <td>${dob}</td>
              <td>${customer["Sex"] || ""}</td>
              <td>${customer["Branch Name"] || ""}</td>
            </tr>
          `;
        });

        htmlContent += `
              </tbody>
            </table>
          </div>
          <div class="print-footer">
            <span class="print-date">${getPrintDate()}</span>
            <span class="print-page-number">Page ${String(
              pageIndex + 1
            ).padStart(2, "0")}</span>
          </div>
        </div>
        `;
      });
    } else if (drillDownMode === "type-only") {
      // Type-only mode - grouped by customer type with pagination
      const recordsPerPage = 8;
      const allRecords = [];

      // Flatten data with group info
      Object.keys(groupedData)
        .sort()
        .forEach((type) => {
          groupedData[type].forEach((customer) => {
            allRecords.push({ ...customer, _groupType: type });
          });
        });

      // Split into pages
      const totalPages = Math.ceil(allRecords.length / recordsPerPage);
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const startIdx = pageNum * recordsPerPage;
        const endIdx = Math.min(startIdx + recordsPerPage, allRecords.length);
        const pageRecords = allRecords.slice(startIdx, endIdx);

        htmlContent += '<div class="print-page">';
        htmlContent += `
          <div class="print-heading-box">
            <h1 class="print-main-heading">${instituteName}</h1>
          </div>
          <div class="print-subheading-box">
            <h2 class="print-sub-heading">Customer List for ${branchName}</h2>
          </div>
          <div class="print-table-box">
            <table class="print-table">
              <tbody>
        `;

        let currentGroup = null;
        pageRecords.forEach((customer) => {
          const groupType = customer._groupType;

          // Show group header if it's a new group on this page
          if (groupType !== currentGroup) {
            currentGroup = groupType;
            const groupCount = groupedData[groupType].length;
            htmlContent += `
              <tr class="print-group-header">
                <td colspan="9"><strong>${groupType}</strong> (${groupCount} customers)</td>
              </tr>
              <tr class="print-column-header">
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
            `;
          }

          const dob = customer["Date of Birth"]
            ? new Date(customer["Date of Birth"]).toLocaleDateString()
            : "";

          htmlContent += `
            <tr>
              <td>${customer["Ref member number"] || ""}</td>
              <td>${customer["Customer type"] || ""}</td>
              <td>${customer["Name"] || ""}</td>
              <td>${customer["Address"] || ""}</td>
              <td>${customer["Phone"] || ""}</td>
              <td>${customer["Mobile"] || ""}</td>
              <td>${dob}</td>
              <td>${customer["Sex"] || ""}</td>
              <td>${customer["Branch Name"] || ""}</td>
            </tr>
          `;
        });

        htmlContent += `
              </tbody>
            </table>
          </div>
          <div class="print-footer">
            <span class="print-date">${getPrintDate()}</span>
            <span class="print-page-number">Page ${String(pageNum + 1).padStart(
              2,
              "0"
            )}</span>
          </div>
        </div>
        `;
      }
    } else if (drillDownMode === "branch-type") {
      // Branch-type mode - grouped by branch and customer type with pagination
      const recordsPerPage = 8;
      const allRecords = [];

      // Flatten data with group info
      Object.keys(groupedData)
        .sort()
        .forEach((branch) => {
          Object.keys(groupedData[branch])
            .sort()
            .forEach((type) => {
              groupedData[branch][type].forEach((customer) => {
                allRecords.push({
                  ...customer,
                  _groupBranch: branch,
                  _groupType: type,
                });
              });
            });
        });

      // Split into pages
      const totalPages = Math.ceil(allRecords.length / recordsPerPage);
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const startIdx = pageNum * recordsPerPage;
        const endIdx = Math.min(startIdx + recordsPerPage, allRecords.length);
        const pageRecords = allRecords.slice(startIdx, endIdx);

        htmlContent += '<div class="print-page">';
        htmlContent += `
          <div class="print-heading-box">
            <h1 class="print-main-heading">${instituteName}</h1>
          </div>
          <div class="print-subheading-box">
            <h2 class="print-sub-heading">Customer List</h2>
          </div>
          <div class="print-table-box">
            <table class="print-table">
              <tbody>
        `;

        let currentBranch = null;
        let currentType = null;

        pageRecords.forEach((customer) => {
          const groupBranch = customer._groupBranch;
          const groupType = customer._groupType;

          // Show branch header if it's a new branch on this page
          if (groupBranch !== currentBranch) {
            currentBranch = groupBranch;
            currentType = null; // Reset type when branch changes
            const branchCount = Object.values(groupedData[groupBranch]).reduce(
              (sum, typeData) => sum + typeData.length,
              0
            );
            htmlContent += `
              <tr class="print-branch-header">
                <td colspan="9"><strong>${groupBranch}</strong> (${branchCount} customers)</td>
              </tr>
            `;
          }

          // Show type header if it's a new type on this page
          if (groupType !== currentType) {
            currentType = groupType;
            const typeCount = groupedData[groupBranch][groupType].length;
            htmlContent += `
              <tr class="print-type-header">
                <td colspan="9"><strong>${groupType}</strong> (${typeCount} customers)</td>
              </tr>
              <tr class="print-column-header">
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
            `;
          }

          const dob = customer["Date of Birth"]
            ? new Date(customer["Date of Birth"]).toLocaleDateString()
            : "";

          htmlContent += `
            <tr class="print-nested-row">
              <td>${customer["Ref member number"] || ""}</td>
              <td>${customer["Customer type"] || ""}</td>
              <td>${customer["Name"] || ""}</td>
              <td>${customer["Address"] || ""}</td>
              <td>${customer["Phone"] || ""}</td>
              <td>${customer["Mobile"] || ""}</td>
              <td>${dob}</td>
              <td>${customer["Sex"] || ""}</td>
              <td>${customer["Branch Name"] || ""}</td>
            </tr>
          `;
        });

        htmlContent += `
              </tbody>
            </table>
          </div>
          <div class="print-footer">
            <span class="print-date">${getPrintDate()}</span>
            <span class="print-page-number">Page ${String(pageNum + 1).padStart(
              2,
              "0"
            )}</span>
          </div>
        </div>
        `;
      }
    }

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

      {/* Action Buttons */}
      <div className="cr-report-actions">
        <button className="cr-btn-print" onClick={handlePrint}>
          Print
        </button>
        <button className="cr-btn-export" onClick={handleExport}>
          Export
        </button>
        {drillDownMode !== "flat" && (
          <button className="cr-btn-expand-all" onClick={expandAllGroups}>
            Expand All
          </button>
        )}
      </div>

      {/* Screen view - Drill-down table for type-only mode */}
      {drillDownMode === "type-only" && (
        <div className="cr-report-table-section cr-screen-only">
          <table className="cr-report-table cr-drilldown-table">
            <tbody>
              {Object.keys(groupedData)
                .sort()
                .map((type) => {
                  const typeData = groupedData[type];
                  const isExpanded = expandedGroups[type];
                  const displayData = isExpanded
                    ? typeData
                    : typeData.slice(0, 0); // Show no rows when collapsed

                  return (
                    <React.Fragment key={type}>
                      {/* Group Header */}
                      <tr
                        className="cr-group-header"
                        onClick={() => toggleGroup(type)}
                      >
                        <td colSpan="9">
                          <span className="cr-group-toggle">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span className="cr-group-title">
                            {type} ({typeData.length} customers)
                          </span>
                        </td>
                      </tr>
                      {/* Column Headers - shown when expanded */}
                      {isExpanded && (
                        <tr className="cr-drilldown-column-header">
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
                      )}
                      {/* Group Rows */}
                      {displayData.map((customer, index) => (
                        <tr key={`${type}-${index}`} className="cr-group-row">
                          <td>{customer["Ref member number"]}</td>
                          <td>{customer["Customer type"]}</td>
                          <td>{customer["Name"]}</td>
                          <td>{customer["Address"]}</td>
                          <td>{customer["Phone"]}</td>
                          <td>{customer["Mobile"]}</td>
                          <td>
                            {customer["Date of Birth"]
                              ? new Date(
                                  customer["Date of Birth"]
                                ).toLocaleDateString()
                              : ""}
                          </td>
                          <td>{customer["Sex"]}</td>
                          <td>{customer["Branch Name"]}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <p className="cr-no-data-message">No data available</p>
          )}
        </div>
      )}

      {/* Screen view - Drill-down table for branch-type mode */}
      {drillDownMode === "branch-type" && (
        <div className="cr-report-table-section cr-screen-only">
          <table className="cr-report-table cr-drilldown-table">
            <tbody>
              {Object.keys(groupedData)
                .sort()
                .map((branch) => {
                  const branchData = groupedData[branch];
                  const isBranchExpanded = expandedGroups[branch];
                  const branchCount = Object.values(branchData).reduce(
                    (sum, typeData) => sum + typeData.length,
                    0
                  );

                  return (
                    <React.Fragment key={branch}>
                      {/* Branch Header */}
                      <tr
                        className="cr-group-header cr-branch-header"
                        onClick={() => toggleGroup(branch)}
                      >
                        <td colSpan="9">
                          <span className="cr-group-toggle">
                            {isBranchExpanded ? "▼" : "▶"}
                          </span>
                          <span className="cr-group-title">
                            {branch} ({branchCount} customers)
                          </span>
                        </td>
                      </tr>

                      {/* Customer Type Sub-groups */}
                      {isBranchExpanded &&
                        Object.keys(branchData)
                          .sort()
                          .map((type) => {
                            const typeData = branchData[type];
                            const typeKey = `${branch}-${type}`;
                            const isTypeExpanded = expandedGroups[typeKey];
                            const displayData = isTypeExpanded
                              ? typeData
                              : typeData.slice(0, 0);

                            return (
                              <React.Fragment key={typeKey}>
                                {/* Type Sub-header */}
                                <tr
                                  className="cr-group-header cr-type-header"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroup(typeKey);
                                  }}
                                >
                                  <td colSpan="9">
                                    <span className="cr-group-toggle cr-sub-toggle">
                                      {isTypeExpanded ? "▼" : "▶"}
                                    </span>
                                    <span className="cr-group-title cr-sub-title">
                                      {type} ({typeData.length} customers)
                                    </span>
                                  </td>
                                </tr>
                                {/* Column Headers - shown when type is expanded */}
                                {isTypeExpanded && (
                                  <tr className="cr-drilldown-column-header">
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
                                )}
                                {/* Type Rows */}
                                {displayData.map((customer, index) => (
                                  <tr
                                    key={`${typeKey}-${index}`}
                                    className="cr-group-row cr-nested-row"
                                  >
                                    <td>{customer["Ref member number"]}</td>
                                    <td>{customer["Customer type"]}</td>
                                    <td>{customer["Name"]}</td>
                                    <td>{customer["Address"]}</td>
                                    <td>{customer["Phone"]}</td>
                                    <td>{customer["Mobile"]}</td>
                                    <td>
                                      {customer["Date of Birth"]
                                        ? new Date(
                                            customer["Date of Birth"]
                                          ).toLocaleDateString()
                                        : ""}
                                    </td>
                                    <td>{customer["Sex"]}</td>
                                    <td>{customer["Branch Name"]}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <p className="cr-no-data-message">No data available</p>
          )}
        </div>
      )}

      {/* Screen view - Flat table */}
      {drillDownMode === "flat" && (
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
      )}

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

      {/* Pagination - Only show for flat mode */}
      {drillDownMode === "flat" && totalPages > 1 && (
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

      {/* Summary info for drill-down mode */}
      {drillDownMode !== "flat" && (
        <div className="cr-summary-info">
          <p>Total: {filteredData.length} records</p>
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
