import React, { useState, useEffect } from "react";
import CustomerReport from "./CustomerReport";
import { sqlExecutorApi } from "../../clients/sqlExecutorClient";
import { toast } from "react-toastify";
import "./CustomerList.css";

const CustomerList = () => {
  const [branchId, setBranchId] = useState(null);
  const [customerTypeId, setCustomerTypeId] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [reportData, setReportData] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dropdown data
  const [branches, setBranches] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [instituteName, setInstituteName] = useState("Institute Name");
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
        toast.error("Failed to load dropdown options");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdownData();
  }, []);

  const handleGenerateReport = async () => {
    if (branchId === null) {
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
        ON c.customer_type_id = ct.id`;

      // Build WHERE clause dynamically
      const whereConditions = [];

      // Add branch filter only if not "All"
      if (branchName.toLowerCase() !== "all") {
        whereConditions.push(`c.branch_id = ${branchId}`);
      }

      // Add customer type filter if selected
      if (customerTypeId) {
        whereConditions.push(`c.customer_type_id = ${customerTypeId}`);
      }

      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        query += `
WHERE
    ${whereConditions.join("\n    AND ")}`;
      }

      // Add ORDER BY based on selected filters
      if (branchName.toLowerCase() === "all" && !customerTypeId) {
        // All branches, no customer type - order by branch id
        query += `
ORDER BY
    b.id`;
      } else if (branchName.toLowerCase() !== "all" || customerTypeId) {
        // Branch selected OR customer type selected OR both - order by customer type id
        query += `
ORDER BY
    ct.id`;
      }

      // Console log the query being sent
      console.log("=== SQL Query Being Sent ===");
      console.log(query);
      console.log("=== Parameters ===");
      console.log("Branch ID:", branchId);
      console.log("Branch Name:", branchName);
      console.log("Customer Type ID:", customerTypeId || "NULL (not selected)");
      console.log("==========================");

      // Execute the query
      const response = await sqlExecutorApi.executeQuery(query);

      if (response.success && response.data) {
        setSelectedBranch(branchName);
        setSelectedType(customerType);
        // Pass through the data as-is from the SQL query
        setReportData(response.data);
        toast.success("Report generated successfully!");
      } else {
        setError(response.error || "Failed to fetch data");
        setReportData(null);
        toast.error(response.error || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message || "An error occurred");
      setReportData(null);
      toast.error(err.message || "An error occurred");
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
            value={branchId ?? ""}
            onChange={(e) => {
              console.log(
                "Raw e.target.value:",
                e.target.value,
                "Type:",
                typeof e.target.value
              );

              const selectedBranchId = e.target.value
                ? Number(e.target.value)
                : null;

              console.log(
                "selectedBranchId after conversion:",
                selectedBranchId
              );
              console.log("All branches:", branches);

              const selectedBranchObj = branches.find(
                (b) => b.id === selectedBranchId
              );

              console.log("Found branch object:", selectedBranchObj);

              setBranchId(selectedBranchId);
              setBranchName(selectedBranchObj?.name || "");

              console.log(
                "Set branchId to:",
                selectedBranchId,
                "branchName to:",
                selectedBranchObj?.name || ""
              );
            }}
            className="form-select"
            disabled={isLoading || isLoadingDropdowns}
          >
            <option value="">Select Branch</option>
            {branches.map((branch, index) => (
              <option key={`branch-${branch.id}-${index}`} value={branch.id}>
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
            {customerTypes.map((type, index) => (
              <option key={`type-${type.id}-${index}`} value={type.id}>
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
