import React from "react";
import "./CustomerReportPrintPreview.css";

const CustomerReportPrintPreview = ({
  instituteName,
  branchName,
  customerType,
  data,
}) => {
  const getPrintDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Determine drill-down mode
  const shouldShowDrillDown = !customerType;
  const isAllBranches = branchName && branchName.toLowerCase() === "all";
  const drillDownMode = shouldShowDrillDown
    ? isAllBranches
      ? "branch-type"
      : "type-only"
    : "flat";

  // Group data based on drill-down mode
  const groupData = () => {
    if (drillDownMode === "type-only") {
      // Group by Customer Type
      const grouped = {};
      data.forEach((item) => {
        const type = item["Customer type"] || "Unknown";
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(item);
      });
      return grouped;
    }

    if (drillDownMode === "branch-type") {
      // Group by Branch -> Customer Type
      const grouped = {};
      data.forEach((item) => {
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

  // For flat mode: Split data into pages of 10 records each
  const recordsPerPage = 10;
  const pages = [];
  if (drillDownMode === "flat") {
    for (let i = 0; i < data.length; i += recordsPerPage) {
      pages.push(data.slice(i, i + recordsPerPage));
    }
  }

  return (
    <div className="print-preview-container">
      {/* Flat mode - paginated table */}
      {drillDownMode === "flat" &&
        pages.map((pageData, pageIndex) => (
          <div key={pageIndex} className="print-page">
            {/* Show heading only on first page */}
            {pageIndex === 0 && (
              <>
                <div className="print-heading-box">
                  <h1 className="print-main-heading">{instituteName}</h1>
                </div>
                <div className="print-subheading-box">
                  <h2 className="print-sub-heading">
                    Customer List for {branchName}
                    {customerType && ` - ${customerType}`}
                  </h2>
                </div>
              </>
            )}

            {/* Table */}
            <div className="print-table-box">
              <table className="print-table">
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
                  {pageData.map((customer, index) => (
                    <tr key={index}>
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
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="print-footer">
              <span className="print-date">{getPrintDate()}</span>
              <span className="print-page-number">Page {pageIndex + 1}</span>
            </div>
          </div>
        ))}

      {/* Type-only mode - grouped by customer type */}
      {drillDownMode === "type-only" && (
        <div className="print-page">
          <div className="print-heading-box">
            <h1 className="print-main-heading">{instituteName}</h1>
          </div>
          <div className="print-subheading-box">
            <h2 className="print-sub-heading">
              Customer List for {branchName} - Grouped by Customer Type
            </h2>
          </div>

          <div className="print-table-box">
            <table className="print-table print-drilldown-table">
              <tbody>
                {Object.keys(groupedData)
                  .sort()
                  .map((type) => {
                    const typeData = groupedData[type];
                    return (
                      <React.Fragment key={type}>
                        {/* Group Header */}
                        <tr className="print-group-header">
                          <td colSpan="9">
                            <strong>{type}</strong> ({typeData.length}{" "}
                            customers)
                          </td>
                        </tr>
                        {/* Column Headers */}
                        <tr className="print-column-header">
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
                        {/* Group Data */}
                        {typeData.map((customer, index) => (
                          <tr key={`${type}-${index}`}>
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
          </div>

          <div className="print-footer">
            <span className="print-date">{getPrintDate()}</span>
            <span className="print-page-number">Page 1</span>
          </div>
        </div>
      )}

      {/* Branch-type mode - grouped by branch and customer type */}
      {drillDownMode === "branch-type" && (
        <div className="print-page">
          <div className="print-heading-box">
            <h1 className="print-main-heading">{instituteName}</h1>
          </div>
          <div className="print-subheading-box">
            <h2 className="print-sub-heading">
              Customer List - Grouped by Branch and Customer Type
            </h2>
          </div>

          <div className="print-table-box">
            <table className="print-table print-drilldown-table">
              <tbody>
                {Object.keys(groupedData)
                  .sort()
                  .map((branch) => {
                    const branchData = groupedData[branch];
                    const branchCount = Object.values(branchData).reduce(
                      (sum, typeData) => sum + typeData.length,
                      0
                    );

                    return (
                      <React.Fragment key={branch}>
                        {/* Branch Header */}
                        <tr className="print-branch-header">
                          <td colSpan="9">
                            <strong>{branch}</strong> ({branchCount} customers)
                          </td>
                        </tr>

                        {/* Customer Type Sub-groups */}
                        {Object.keys(branchData)
                          .sort()
                          .map((type) => {
                            const typeData = branchData[type];
                            return (
                              <React.Fragment key={`${branch}-${type}`}>
                                {/* Type Sub-header */}
                                <tr className="print-type-header">
                                  <td colSpan="9">
                                    <strong>{type}</strong> ({typeData.length}{" "}
                                    customers)
                                  </td>
                                </tr>
                                {/* Column Headers */}
                                <tr className="print-column-header">
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
                                {/* Type Data */}
                                {typeData.map((customer, index) => (
                                  <tr
                                    key={`${branch}-${type}-${index}`}
                                    className="print-nested-row"
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
          </div>

          <div className="print-footer">
            <span className="print-date">{getPrintDate()}</span>
            <span className="print-page-number">Page 1</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerReportPrintPreview;
