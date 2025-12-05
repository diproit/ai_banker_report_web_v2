import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDueReports.css";
import { sqlExecutorApi } from "../../services/sqlExecutorService";

interface DropdownOption {
  id: number;
  name: string;
}

const LoanPastDueReports: React.FC = () => {
  // store selected ids (strings from select inputs)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedLoanProductId, setSelectedLoanProductId] = useState<string>("");

  const [loanProducts, setLoanProducts] = useState<DropdownOption[]>([]);

  const [installmentFrom, setInstallmentFrom] = useState("");
  const [installmentTo, setInstallmentTo] = useState("");

  const [passdueDaysFrom, setPassdueDaysFrom] = useState("");
  const [passdueDaysTo, setPassdueDaysTo] = useState("");

  const [capitalFrom, setCapitalFrom] = useState("");
  const [capitalTo, setCapitalTo] = useState("");

  // Dropdown data
  const [branches, setBranches] = useState<DropdownOption[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loanReportData, setLoanReportData] = useState<any[] | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const hasResults = loanReportData !== null && loanReportData.length > 0;
  const columns = useMemo(
    () => (loanReportData && loanReportData.length > 0 ? Object.keys(loanReportData[0]) : []),
    [loanReportData]
  );

  const resetFilters = () => {
    setSelectedBranchId("");
    setSelectedLoanProductId("");
    setInstallmentFrom("");
    setInstallmentTo("");
    setPassdueDaysFrom("");
    setPassdueDaysTo("");
    setCapitalFrom("");
    setCapitalTo("");
    setLoanReportData(null);
    setReportError(null);
  };

  const handleGenerateReport = async () => {
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setLoanReportData(null);

    const branchId = parseInt(selectedBranchId, 10);
    const loanProductId = selectedLoanProductId
      ? parseInt(selectedLoanProductId, 10)
      : null;

    const passdueFrom = passdueDaysFrom ? parseInt(passdueDaysFrom, 10) : 0;
    const passdueTo = passdueDaysTo ? parseInt(passdueDaysTo, 10) : 1000000000;
    const capitalFromNum = capitalFrom ? parseInt(capitalFrom, 10) : 0;
    const capitalToNum = capitalTo ? parseInt(capitalTo, 10) : 1000000000;
    const installmentFromNum = installmentFrom ? parseFloat(installmentFrom) : 0;
    const installmentToNum = installmentTo ? parseFloat(installmentTo) : 1000000000;

    // find names from loaded lists (optional)
    const branchObj = branches.find((b) => b.id === branchId) || null;
    const loanProductObj = loanProductId
      ? loanProducts.find((p) => p.id === loanProductId) || null
      : null;

    const branchNameStr = branchObj ? branchObj.name : null;
    const loanProductNameStr = loanProductObj ? loanProductObj.name : null;

    console.log("Generating Loan Past Due Report with:", {
      branchId,
      branchName: branchNameStr,
      loanProductId,
      loanProductName: loanProductNameStr,
      passdueFrom,
      passdueTo,
      capitalFromNum,
      capitalToNum,
      installmentFromNum,
      installmentToNum,
    });

    try {
      const filters: string[] = [
        "pl_account_type.pl_account_category_id = 2",
      ];

      // Branch filter is optional: branchId === 0 removes the filter
      if (branchId !== 0) {
        filters.push(`gl_branch.id = ${branchId}`);
      }

      if (loanProductId) {
        filters.push(`pl_account_type.id = ${loanProductId}`);
      }

      if (passdueDaysFrom && passdueDaysTo) {
        console.log("Passdue from & to");
        filters.push(`pl_account.past_due_days BETWEEN ${passdueFrom} AND ${passdueTo}`);
      }

      if (capitalFrom && capitalTo) {
        console.log("Capital from & to");
        filters.push(`pl_account.capital BETWEEN ${capitalFromNum} AND ${capitalToNum}`);
      }

      if (installmentFrom && installmentTo) {
        console.log("Installment from & to");
        filters.push(`(pl_account.past_due_amount / pl_account.capital_installment) BETWEEN ${installmentFromNum} AND ${installmentToNum}`);
      }

      const whereClause = filters.length ? `WHERE\n          ${filters.join("\n          AND ")}` : "";
      const groupClause =
        branchId === 0 ? "GROUP BY\n          gl_branch.id, pl_account_type.id" : "";

      const query = `
      SELECT
        pl_account.ref_account_number,
        ci_customer.customer_number,
        ci_customer.full_name_ln1,
        ci_customer.address_ln1,
        ci_customer.mobile_1,
        DATE_FORMAT(pl_account.open_date, '%d-%m-%Y') AS open_date,
        DATE_FORMAT(pl_account.last_transaction_date, '%d-%m-%Y') AS last_transaction_date,
        CONCAT(FORMAT(pl_account.interest_rate, 2), '%') AS interest_rate,
        pl_account.period,
        FORMAT(pl_account.capital, 2) AS capital,
        FORMAT(pl_account.balance, 2) AS balance,
        FORMAT(pl_account.interest, 2) AS interest,
        FORMAT(pl_account.past_due_amount, 2) AS past_due_amount,
        FORMAT(pl_account.capital_installment, 2) AS capital_installment,
        FORMAT(ROUND(pl_account.past_due_amount / pl_account.capital_installment, 2), 2) AS passdue_installment,
        pl_account.past_due_days
      FROM
          ci_customer
      INNER JOIN pl_account
          ON ci_customer.id = pl_account.ci_customer_id
      INNER JOIN pl_account_type
          ON pl_account.pl_account_type_id = pl_account_type.id
      INNER JOIN gl_branch
          ON ci_customer.branch_id = gl_branch.id 
        AND pl_account.branch_id = gl_branch.id
      ${whereClause}
      ${groupClause}
      `;

      const response = await sqlExecutorApi.executeQuery(query);
      console.log("response LOAN",response);

      if (response.success && response.data) {
        setLoanReportData(response.data);
        console.log("Loan report rows:", response.data.length, response.data);
      } else {
        setLoanReportData(null);
        setReportError(response.error || "Failed to fetch loan report");
      }
    } catch (err) {
      console.error("Error generating loan report:", err);
      setLoanReportData(null);
      setReportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Load branch dropdown data on component mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoadingDropdowns(true);
        const [branchesData, loanProductsData] = await Promise.all([
          sqlExecutorApi.getBranches(),
          sqlExecutorApi.getLoanProducts(),
        ]);
        setBranches(branchesData || []);
        setLoanProducts(loanProductsData || []);
      } catch (err) {
        console.error("Error loading branches:", err);
        setError("Failed to load branches");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadBranches();
  }, []);

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
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">{isLoadingDropdowns ? "Loading branches..." : "Select Branch"}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id.toString()}>
                {branch.name}
              </option>
            ))}
          </select>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="loan-product">Loan Product</label>
          <select
            id="loan-product"
            value={selectedLoanProductId}
            onChange={(e) => setSelectedLoanProductId(e.target.value)}
            className="form-select"
            disabled={isLoadingDropdowns}
          >
            <option value="">{isLoadingDropdowns ? "Loading..." : "Select Loan Product"}</option>
            {loanProducts.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Pastdue Installment</label>
          <div className="controls">
            <div className="range-row">
              <label className="small-label">From</label>
              <input
                type="number"
                min="0"
                step="1"
                value={installmentFrom}
                onChange={(e) => setInstallmentFrom(e.target.value)}
                className="form-input"
                placeholder="0"
              />
              <label className="small-label">To</label>
              <input
                type="number"
                min="0"
                step="1"
                value={installmentTo}
                onChange={(e) => setInstallmentTo(e.target.value)}
                className="form-input"
                placeholder="0"
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
                type="number"
                min="0"
                step="1"
                value={passdueDaysFrom}
                onChange={(e) => setPassdueDaysFrom(e.target.value)}
                className="form-input"
                placeholder="0"
              />
              <label className="small-label">To</label>
              <input
                type="number"
                min="0"
                step="1"
                value={passdueDaysTo}
                onChange={(e) => setPassdueDaysTo(e.target.value)}
                className="form-input"
                placeholder="0"
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
          <button
            className="btn-generate-report"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {(reportError || loanReportData) && (
        <div className="loan-pastdue-results-card">
          <div className="report-results">
            {reportError && (
              <div className="error-message">
                <strong>Error:</strong> {reportError}
              </div>
            )}

            {hasResults ? (
              <div className="report-table">
                <h3>Results ({loanReportData.length})</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loanReportData.map((row, idx) => (
                        <tr key={idx}>
                          {columns.map((col) => (
                            <td key={col}>{String(row[col] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No results to display. Adjust filters and generate again.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanPastDueReports;
