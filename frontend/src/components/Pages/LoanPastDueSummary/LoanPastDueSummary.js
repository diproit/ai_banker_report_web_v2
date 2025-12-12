import React, { useState, useEffect } from "react";
import { sqlExecutorApi } from "../../../clients/sqlExecutorClient";
import { toast } from "react-toastify";
import "./LoanPastDueSummary.css";

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
      // TODO: Build SQL query and fetch data
      console.log("Generating report for:", {
        branchId,
        branchName,
        selectedDate,
      });

      toast.success("Report generation functionality coming soon!");
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
    </div>
  );
};

export default LoanPastDueSummary;
