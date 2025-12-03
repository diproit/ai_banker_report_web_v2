import React, { useState, useEffect } from "react";
import CustomerReport from "../CustomerReport";
import { sqlExecutorApi } from "../../services/sqlExecutorService";
import { toast } from "react-toastify";
import "./CustomerList.css";

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

interface DropdownOption {
  id: number;
  name: string;
}

const CustomerList: React.FC = () => {
  const [branchId, setBranchId] = useState<number | null>(null);
  const [customerTypeId, setCustomerTypeId] = useState<number | null>(null);
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
    if (!branchId) {
      toast.error("Please select a Branch Name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build SQL query based on selected filters
      let query = `
SELECT
    c.customer_number              AS \`Ref member number\`,
    ct.type_ln1                   AS \`Customer type\`,
    c.full_name_ln1               AS \`Name\`,
    c.address_ln1                 AS \`Address\`,
    c.home_phone                  AS \`Phone\`,
    c.mobile_1                    AS \`Mobile\`,
    c.date_of_birth               AS \`Date of Birth\`,
    c.gender                      AS \`Sex\`,
    b.name_ln1                    AS \`Branch Name\`
FROM
    ci_customer AS c
    LEFT JOIN gl_branch AS b
        ON c.branch_id = b.id
    LEFT JOIN ci_customer_type AS ct
        ON c.customer_type_id = ct.id
WHERE
    c.branch_id = ${branchId}`;

      // Add customer type filter if selected
      if (customerTypeId) {
        query += `
    AND c.customer_type_id = ${customerTypeId}`;
      }

      query += `
GROUP BY
    b.name_ln1,
    ct.type_ln1`;

      // Console log the query being sent
      console.log("=== SQL Query Being Sent ===");
      console.log(query);
      console.log("=== Parameters ===");
      console.log("Branch ID:", branchId);
      console.log("Customer Type ID:", customerTypeId || "NULL (not selected)");
      console.log("==========================");

      // Execute the query
      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setSelectedBranch(branchName);
        setSelectedType(customerType);
        // Pass through the data as-is from the SQL query
        setReportData(response.data as Customer[]);
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
            value={branchId || ""}
            onChange={(e) => {
              const selectedBranchId = e.target.value
                ? Number(e.target.value)
                : null;
              const selectedBranchObj = branches.find(
                (b) => b.id === selectedBranchId
              );
              setBranchId(selectedBranchId);
              setBranchName(selectedBranchObj?.name || "");
            }}
            className="form-select"
            disabled={isLoading || isLoadingDropdowns}
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="customer-type">Customer Type</label>
          <select
            id="customer-type"
            value={customerTypeId || ""}
            onChange={(e) => {
              const selectedTypeId = e.target.value
                ? Number(e.target.value)
                : null;
              const selectedTypeObj = customerTypes.find(
                (t) => t.id === selectedTypeId
              );
              setCustomerTypeId(selectedTypeId);
              setCustomerType(selectedTypeObj?.name || "");
            }}
            className="form-select"
            disabled={isLoading || isLoadingDropdowns}
          >
            <option value="">Select Customer Type</option>
            {customerTypes.map((type) => (
              <option key={type.id} value={type.id}>
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
