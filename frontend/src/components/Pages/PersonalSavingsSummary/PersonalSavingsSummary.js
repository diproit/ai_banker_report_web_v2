import React, { useState, useEffect } from "react";
import { sqlExecutorApi } from "../../../clients/sqlExecutorClient";
import { toast } from "react-toastify";
import "./PersonalSavingsSummary.css";

const PersonalSavingsSummary = () => {
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
    <div className="pss-personal-savings-summary-container">
      <div className="pss-personal-savings-summary-card">
        <h1 className="pss-personal-savings-summary-heading">
          Personal Savings Summary
        </h1>

        {error && <div className="pss-error-message">{error}</div>}

        {/* Branch Name */}
        <div className="pss-form-group">
          <label htmlFor="pss-branch-name">
            Branch Name <span className="pss-required">*</span>
          </label>
          <select
            id="pss-branch-name"
            value={selectedBranch}
            onChange={handleBranchChange}
            className="pss-form-select"
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
        <div className="pss-form-group">
          <label htmlFor="pss-date">
            Date <span className="pss-required">*</span>
          </label>
          <input
            type="date"
            id="pss-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayDate()}
            className="pss-form-input"
          />
        </div>

        {/* Generate Report Button */}
        <div className="pss-form-actions">
          <button
            className="pss-btn-generate-report"
            onClick={handleGenerateReport}
            disabled={isLoading || isLoadingDropdowns}
          >
            {isLoading ? (
              <>
                <span className="pss-button-icon pss-spinning">⟳</span>
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

export default PersonalSavingsSummary;
