import React, { useState } from "react";
import "./CustomerList.css";

const CustomerList: React.FC = () => {
  const [branchName, setBranchName] = useState("");
  const [customerType, setCustomerType] = useState("");

  const handleGenerateReport = () => {
    if (!branchName) {
      alert("Please select a Branch Name");
      return;
    }
    console.log("Generating report for:", { branchName, customerType });
    // Add your report generation logic here
  };

  return (
    <div className="customer-list-container">
      <div className="customer-list-card">
        <h1 className="customer-list-heading">Customer List</h1>

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
          <label htmlFor="customer-type">Customer Type</label>
          <select
            id="customer-type"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="form-select"
          >
            <option value="">Select Customer Type</option>
            <option value="retail">Retail</option>
            <option value="corporate">Corporate</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            className="btn-generate-report"
            onClick={handleGenerateReport}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
