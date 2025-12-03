import React, { useState } from "react";
import "./LoanPastDueReports.css";

const LoanPastDueReports: React.FC = () => {
  const [branchName, setBranchName] = useState("");
  const [loanProduct, setLoanProduct] = useState("");

  const [installmentFrom, setInstallmentFrom] = useState("");
  const [installmentTo, setInstallmentTo] = useState("");

  const [passdueDaysFrom, setPassdueDaysFrom] = useState("");
  const [passdueDaysTo, setPassdueDaysTo] = useState("");

  const [capitalFrom, setCapitalFrom] = useState("");
  const [capitalTo, setCapitalTo] = useState("");

  const handleGenerateReport = () => {
    if (!branchName) {
      alert("Please select a Branch Name");
      return;
    }

    console.log("Generating Loan Past Due Report with:", {
      branchName,
      loanProduct,
      installmentFrom,
      installmentTo,
      passdueDaysFrom,
      passdueDaysTo,
      capitalFrom,
      capitalTo,
    });

    // TODO: integrate with service to request report data
  };

  return (
    <div className="loan-pastdue-container">
      <div className="loan-pastdue-card">
        <h1 className="loan-pastdue-heading">Loan Past Due Reports</h1>

        <div className="form-group">
          <label htmlFor="branch-name">
            Branch Name <span className="required">*</span>
          </label>
          <select
            id="branch-name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="form-select"
          >
            <option value="">Select Branch</option>
            <option value="branch1">Branch 1</option>
            <option value="branch2">Branch 2</option>
            <option value="branch3">Branch 3</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="loan-product">Loan Product</label>
          <select
            id="loan-product"
            value={loanProduct}
            onChange={(e) => setLoanProduct(e.target.value)}
            className="form-select"
          >
            <option value="">Select Loan Product</option>
            <option value="home">Home Loan</option>
            <option value="auto">Auto Loan</option>
            <option value="personal">Personal Loan</option>
          </select>
        </div>

        <div className="form-group">
          <label>Pastdue Installment</label>
          <div className="controls">
            <div className="range-row">
              <label className="small-label">From</label>
              <input
                type="date"
                value={installmentFrom}
                onChange={(e) => setInstallmentFrom(e.target.value)}
                className="form-input"
              />
              <label className="small-label">To</label>
              <input
                type="date"
                value={installmentTo}
                onChange={(e) => setInstallmentTo(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Passdue Days</label>
          <div className="controls">
            <div className="range-row">
              <label className="small-label">From</label>
              <input
                type="date"
                value={passdueDaysFrom}
                onChange={(e) => setPassdueDaysFrom(e.target.value)}
                className="form-input"
              />
              <label className="small-label">To</label>
              <input
                type="date"
                value={passdueDaysTo}
                onChange={(e) => setPassdueDaysTo(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Capital (Amount)</label>
          <div className="controls">
            <div className="range-row">
              <label className="small-label">From</label>
              <input
                type="number"
                min="0"
                step="1.00"
                value={capitalFrom}
                onChange={(e) => setCapitalFrom(e.target.value)}
                className="form-input"
                placeholder="0.00"
              />
              <label className="small-label">To</label>
              <input
                type="number"
                min="0"
                step="1.00"
                value={capitalTo}
                onChange={(e) => setCapitalTo(e.target.value)}
                className="form-input"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-generate-report" onClick={handleGenerateReport}>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanPastDueReports;
