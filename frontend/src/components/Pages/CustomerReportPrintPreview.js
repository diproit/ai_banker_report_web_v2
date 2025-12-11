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

  // Split data into pages of 10 records each
  const recordsPerPage = 10;
  const pages = [];
  for (let i = 0; i < data.length; i += recordsPerPage) {
    pages.push(data.slice(i, i + recordsPerPage));
  }

  return (
    <div className="print-preview-container">
      {pages.map((pageData, pageIndex) => (
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
    </div>
  );
};

export default CustomerReportPrintPreview;
