import React from "react";
import "./LoanPastDuePrintPreview.css";

const LoanPastDuePrintPreview = ({
  instituteName,
  branchName,
  selectedDate,
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
                  Loan Past Due Summary for {branchName}
                  {selectedDate && ` - As of ${selectedDate}`}
                </h2>
              </div>
            </>
          )}

          {/* Table */}
          <div className="print-table-box">
            <table className="print-table">
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
                {pageData.map((record, index) => (
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

export default LoanPastDuePrintPreview;
