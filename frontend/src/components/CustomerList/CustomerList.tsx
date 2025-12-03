import React, { useState } from "react";
import CustomerReport from "../CustomerReport";
import "./CustomerList.css";

// Dummy data - replace with API call in the future
const DUMMY_DATA = [
  {
    id: 1,
    customerName: "John Smith",
    accountNumber: "ACC001234",
    balance: 15000,
    status: "Active",
    lastTransaction: "01/12/2025",
  },
  {
    id: 2,
    customerName: "Sarah Johnson",
    accountNumber: "ACC001235",
    balance: 28500,
    status: "Active",
    lastTransaction: "02/12/2025",
  },
  {
    id: 3,
    customerName: "Michael Brown",
    accountNumber: "ACC001236",
    balance: 42000,
    status: "Active",
    lastTransaction: "29/11/2025",
  },
  {
    id: 4,
    customerName: "Emily Davis",
    accountNumber: "ACC001237",
    balance: 19750,
    status: "Pending",
    lastTransaction: "30/11/2025",
  },
  {
    id: 5,
    customerName: "David Wilson",
    accountNumber: "ACC001238",
    balance: 5000,
    status: "Inactive",
    lastTransaction: "15/11/2025",
  },
  {
    id: 6,
    customerName: "Lisa Anderson",
    accountNumber: "ACC001239",
    balance: 63200,
    status: "Active",
    lastTransaction: "03/12/2025",
  },
  {
    id: 7,
    customerName: "James Taylor",
    accountNumber: "ACC001240",
    balance: 31500,
    status: "Active",
    lastTransaction: "01/12/2025",
  },
  {
    id: 8,
    customerName: "Mary Martinez",
    accountNumber: "ACC001241",
    balance: 12800,
    status: "Active",
    lastTransaction: "02/12/2025",
  },
  {
    id: 9,
    customerName: "Robert Garcia",
    accountNumber: "ACC001242",
    balance: 48900,
    status: "Pending",
    lastTransaction: "28/11/2025",
  },
  {
    id: 10,
    customerName: "Jennifer Lopez",
    accountNumber: "ACC001243",
    balance: 22300,
    status: "Active",
    lastTransaction: "03/12/2025",
  },
  {
    id: 11,
    customerName: "William Clark",
    accountNumber: "ACC001244",
    balance: 37600,
    status: "Active",
    lastTransaction: "30/11/2025",
  },
  {
    id: 12,
    customerName: "Patricia Lee",
    accountNumber: "ACC001245",
    balance: 54100,
    status: "Active",
    lastTransaction: "02/12/2025",
  },
];

interface Customer {
  id: number;
  customerName: string;
  accountNumber: string;
  balance: number;
  status: string;
  lastTransaction: string;
}

const CustomerList: React.FC = () => {
  const [branchName, setBranchName] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [reportData, setReportData] = useState<Customer[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const handleGenerateReport = async () => {
    if (!branchName) {
      alert("Please select a Branch Name");
      return;
    }

    // TODO: Replace with actual API call
    // Example:
    // const response = await fetch('/api/customer-report', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ branchName, customerType })
    // });
    // const data = await response.json();
    // setReportData(data);

    // For now, use dummy data
    console.log("Generating report for:", { branchName, customerType });
    setSelectedBranch(branchName);
    setSelectedType(customerType);
    setReportData(DUMMY_DATA);
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
            <option value="Branch 1">Branch 1</option>
            <option value="Branch 2">Branch 2</option>
            <option value="Branch 3">Branch 3</option>
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
            <option value="Retail">Retail</option>
            <option value="Corporate">Corporate</option>
            <option value="Premium">Premium</option>
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

      {reportData && (
        <CustomerReport
          branchName={selectedBranch}
          customerType={selectedType}
          data={reportData}
        />
      )}
    </div>
  );
};

export default CustomerList;
