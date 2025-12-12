import React, { useState, useEffect, useRef } from "react";
import { sqlExecutorApi } from "../../../clients/sqlExecutorClient";
import { toast } from "react-toastify";
import "./LoanPastDueSummary.css";
import LoanPastDueSummaryReport from "./LoanPastDueSummaryReport";

const LoanPastDueSummary = () => {
  const [branchId, setBranchId] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [branchName, setBranchName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dropdown data
  const [branches, setBranches] = useState([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  // Report data
  const [reportData, setReportData] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const printPreviewRef = useRef(null);

  // Get today's date in YYYY-MM-DD format for max attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Load dropdown data on component mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setIsLoadingDropdowns(true);
        const branchesData = await sqlExecutorApi.getBranches();
        setBranches(branchesData);

        // Load institute name
        const instituteData = await sqlExecutorApi.getInstitute();
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

  const handleBranchChange = (e) => {
    const value = e.target.value;
    setSelectedBranch(value);

    if (value) {
      const branch = branches.find((b) => b.id === parseInt(value));
      setBranchId(parseInt(value));
      setBranchName(branch ? branch.name : "");
    } else {
      setBranchId(null);
      setBranchName("");
    }
  };

  const handleGenerateReport = async () => {
    if (branchId === null) {
      toast.error("Please select a Branch Name");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a Date");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build SQL query
      const query = `
        SELECT 
          t.name_ln1 AS 'Product Name',
          COUNT(a.id) AS 'Number of Accounts',
          t.interest_policy AS 'Interest Policy',
          SUM(d.pl_account_balance) AS 'Total Balance',
          t.interest_rate_min AS 'Min Interest Rate',
          b.name_ln1 AS 'Branch Name',
          t.interest_rate_max AS 'Max Interest Rate'
        FROM 
          pl_account a
          INNER JOIN pl_account_type t ON a.pl_account_type_id = t.id
          INNER JOIN pl_daily_balances d ON a.id = d.pl_account_id
          INNER JOIN gl_branch b ON a.branch_id = b.id
        WHERE 
          t.pl_account_category_id = 2
          AND DATE(a.last_transaction_date) <= '${selectedDate}'
          AND b.id = ${branchId}
        GROUP BY 
          t.name_ln1, b.id
        ORDER BY 
          t.name_ln1
      `;

      console.log("Loan Past Due Summary Query:", query);

      // Execute query
      const response = await sqlExecutorApi.executeQuery(query);
      console.log("Loan Past Due Summary Response:", response);

      if (response.success && response.data && response.data.length > 0) {
        setReportData(response.data);
        toast.success(
          `Report generated successfully with ${response.data.length} records`
        );

        // Scroll to print preview
        setTimeout(() => {
          if (printPreviewRef.current) {
            printPreviewRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        setReportData([]);
        toast.info("No data found for the selected criteria");
      }
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message);
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pds-loan-pastdue-summary-container">
      <div className="pds-loan-pastdue-summary-card">
        <h1 className="pds-loan-pastdue-summary-heading">
          Loan Past Due Summary
        </h1>

        {error && <div className="pds-error-message">{error}</div>}

        {/* Branch Name */}
        <div className="pds-form-group">
          <label htmlFor="pds-branch-name">
            Branch Name <span className="pds-required">*</span>
          </label>
          <select
            id="pds-branch-name"
            value={selectedBranch}
            onChange={handleBranchChange}
            className="pds-form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">
              {isLoadingDropdowns ? "Loading branches..." : "Select Branch"}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="pds-form-group">
          <label htmlFor="pds-date">
            Date <span className="pds-required">*</span>
          </label>
          <input
            type="date"
            id="pds-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayDate()}
            className="pds-form-input"
          />
        </div>

        {/* Generate Report Button */}
        <div className="pds-form-actions">
          <button
            className="pds-btn-generate-report"
            onClick={handleGenerateReport}
            disabled={isLoading || isLoadingDropdowns}
          >
            {isLoading ? (
              <>
                <span className="pds-button-icon pds-spinning">⟳</span>
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>
      </div>

      {/* Report Display */}
      {reportData.length > 0 && (
        <div ref={printPreviewRef}>
          <LoanPastDueSummaryReport
            instituteName={instituteName}
            branchName={branchName}
            selectedDate={selectedDate}
            data={reportData}
          />
        </div>
      )}
    </div>
  );
};

export default LoanPastDueSummary;
