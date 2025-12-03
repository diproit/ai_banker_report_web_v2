import React, { useState, useEffect } from "react";
import CustomerReport from "../CustomerReport";
import { sqlExecutorApi } from "../../services/sqlExecutorService";
import "./CustomerList.css";

interface Customer {
  id: number;
  customerName: string;
  accountNumber: string;
  balance: number;
  status: string;
  lastTransaction: string;
}

interface DropdownOption {
  id: number;
  name: string;
}

const CustomerList: React.FC = () => {
  const [branchName, setBranchName] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [reportData, setReportData] = useState<Customer[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [branches, setBranches] = useState<DropdownOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<DropdownOption[]>([]);
  const [instituteName, setInstituteName] = useState<string>("Institute Name");
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  // Load dropdown data on component mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setIsLoadingDropdowns(true);
        const [branchesData, typesData, instituteData] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getCustomerTypes(),
          sqlExecutorApi.getInstitute(),
        ]);
        setBranches(branchesData);
        setCustomerTypes(typesData);
        if (instituteData) {
          setInstituteName(instituteData.name);
        }
      } catch (err) {
        console.error("Error loading dropdown data:", err);
        setError("Failed to load dropdown options");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdownData();
  }, []);

  const handleGenerateReport = async () => {
    if (!branchName) {
      alert("Please select a Branch Name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build SQL query based on selected filters
      let query = `
        SELECT 
          c.id,
          c.customer_number,
          c.full_name_ln1 as customerName,
          ct.type_ln1 as customerType,
          b.name_ln1 as branchName,
          c.mobile_1 as mobile,
          c.e_mail as email,
          CASE 
            WHEN c.status = 1 THEN 'Active'
            WHEN c.status = 0 THEN 'Inactive'
            ELSE 'Pending'
          END as status,
          DATE_FORMAT(c.member_date, '%d/%m/%Y') as memberDate
        FROM ci_customer c
        LEFT JOIN ci_customer_type ct ON c.customer_type_id = ct.id
        LEFT JOIN gl_branch b ON c.branch_id = b.id
        WHERE b.name_ln1 = '${branchName}'
      `;

      // Add customer type filter if selected
      if (customerType) {
        query += ` AND ct.type_ln1 = '${customerType}'`;
      }

      query += ` ORDER BY c.full_name_ln1`;

      // Execute the query
      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setSelectedBranch(branchName);
        setSelectedType(customerType);
        // Map the response data to match Customer interface
        const mappedData = response.data.map((item: any, index: number) => ({
          id: item.id || index + 1,
          customerName: item.customerName || "",
          accountNumber: item.customer_number || "",
          balance: 0, // Not available in current query
          status: item.status || "Pending",
          lastTransaction: item.memberDate || "",
        }));
        setReportData(mappedData as Customer[]);
      } else {
        setError(response.error || "Failed to fetch data");
        setReportData(null);
      }
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
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
            disabled={isLoading || isLoadingDropdowns}
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="customer-type">Customer Type</label>
          <select
            id="customer-type"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="form-select"
            disabled={isLoading || isLoadingDropdowns}
          >
            <option value="">Select Customer Type</option>
            {customerTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button
            className="btn-generate-report"
            onClick={handleGenerateReport}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {reportData && (
        <CustomerReport
          branchName={selectedBranch}
          customerType={selectedType}
          data={reportData}
          instituteName={instituteName}
        />
      )}
    </div>
  );
};

export default CustomerList;
