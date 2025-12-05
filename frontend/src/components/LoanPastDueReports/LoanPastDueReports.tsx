import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDueReports.css";
import { sqlExecutorApi } from "../../services/sqlExecutorService";

interface DropdownOption {
  id: number;
  name: string;
}

const ROWS_PER_PAGE = 10;

interface QueryParams {
  branchId: number;
  loanProductId: number | null;
  passdueFrom: number;
  passdueTo: number;
  capitalFromNum: number;
  capitalToNum: number;
  installmentFromNum: number;
  installmentToNum: number;
  hasPassdueRange: boolean;
  hasCapitalRange: boolean;
  hasInstallmentRange: boolean;
}

const buildFiltersList = (params: QueryParams) => {
  const filters = ["pl_account_type.pl_account_category_id = 2"];

  if (params.branchId !== 0) {
    filters.push(`gl_branch.id = ${params.branchId}`);
  }

  if (params.loanProductId) {
    filters.push(`pl_account_type.id = ${params.loanProductId}`);
  }

  if (params.hasPassdueRange) {
    filters.push(`pl_account.past_due_days BETWEEN ${params.passdueFrom} AND ${params.passdueTo}`);
  }

  if (params.hasCapitalRange) {
    filters.push(`pl_account.capital BETWEEN ${params.capitalFromNum} AND ${params.capitalToNum}`);
  }

  if (params.hasInstallmentRange) {
    filters.push(
      `(pl_account.past_due_amount / pl_account.capital_installment) BETWEEN ${params.installmentFromNum} AND ${params.installmentToNum}`
    );
  }

  return filters;
};

const buildQuery = (filters: string[], branchId: number) => {
  const whereClause = filters.length ? `WHERE\n          ${filters.join("\n          AND ")}` : "";
  // const groupClause = branchId === 0 ? "GROUP BY\n          gl_branch.id, pl_account_type.id" : "";

  return `
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
      `;
};

const getVisiblePages = (currentPage: number, totalPages: number) => {
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

interface LoanFiltersProps {
  branches: DropdownOption[];
  loanProducts: DropdownOption[];
  selectedBranchId: string;
  selectedLoanProductId: string;
  installmentFrom: string;
  installmentTo: string;
  passdueDaysFrom: string;
  passdueDaysTo: string;
  capitalFrom: string;
  capitalTo: string;
  isLoadingDropdowns: boolean;
  error: string | null;
  onBranchChange: (value: string) => void;
  onLoanProductChange: (value: string) => void;
  onInstallmentFromChange: (value: string) => void;
  onInstallmentToChange: (value: string) => void;
  onPassdueDaysFromChange: (value: string) => void;
  onPassdueDaysToChange: (value: string) => void;
  onCapitalFromChange: (value: string) => void;
  onCapitalToChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const LoanFilters: React.FC<LoanFiltersProps> = ({
  branches,
  loanProducts,
  selectedBranchId,
  selectedLoanProductId,
  installmentFrom,
  installmentTo,
  passdueDaysFrom,
  passdueDaysTo,
  capitalFrom,
  capitalTo,
  isLoadingDropdowns,
  error,
  onBranchChange,
  onLoanProductChange,
  onInstallmentFromChange,
  onInstallmentToChange,
  onPassdueDaysFromChange,
  onPassdueDaysToChange,
  onCapitalFromChange,
  onCapitalToChange,
  onGenerate,
  isGenerating,
}) => (
  <div className="loan-pastdue-card">
    <h1 className="loan-pastdue-heading">Loan Past Due Reports</h1>

    <div className="form-group">
      <label htmlFor="branch-name">
        Branch Name <span className="required">*</span>
      </label>
      <select
        id="branch-name"
        value={selectedBranchId}
        onChange={(e) => onBranchChange(e.target.value)}
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
        onChange={(e) => onLoanProductChange(e.target.value)}
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
            onChange={(e) => onInstallmentFromChange(e.target.value)}
            className="form-input"
            placeholder="0"
          />
          <label className="small-label">To</label>
          <input
            type="number"
            min="0"
            step="1"
            value={installmentTo}
            onChange={(e) => onInstallmentToChange(e.target.value)}
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
            onChange={(e) => onPassdueDaysFromChange(e.target.value)}
            className="form-input"
            placeholder="0"
          />
          <label className="small-label">To</label>
          <input
            type="number"
            min="0"
            step="1"
            value={passdueDaysTo}
            onChange={(e) => onPassdueDaysToChange(e.target.value)}
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
            onChange={(e) => onCapitalFromChange(e.target.value)}
            className="form-input"
            placeholder="0.00"
          />
          <label className="small-label">To</label>
          <input
            type="number"
            min="0"
            step="1.00"
            value={capitalTo}
            onChange={(e) => onCapitalToChange(e.target.value)}
            className="form-input"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>

    <div className="form-actions">
      <button className="btn-generate-report" onClick={onGenerate} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Report"}
      </button>
    </div>
  </div>
);

interface ReportSectionProps {
  error: string | null;
  hasResults: boolean;
  columns: string[];
  paginatedData: any[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  displayBranchName: string;
  displayLoanProductName: string;
}

const ReportSection: React.FC<ReportSectionProps> = ({
  error,
  hasResults,
  columns,
  paginatedData,
  totalRows,
  currentPage,
  totalPages,
  onPageChange,
  displayBranchName,
  displayLoanProductName,
}) => {
  const visiblePages = getVisiblePages(currentPage, totalPages);

  if (!error && !hasResults) {
    return null;
  }

  return (
    <div className="loan-pastdue-results-card">
      <div className="report-results">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {hasResults ? (
          <div className="loan-report-card">
            <h1 className="report-main-heading">Loan Past Due Report</h1>
            <h2 className="report-sub-heading">
              Branch: {displayBranchName}
              {displayLoanProductName ? ` | Product: ${displayLoanProductName}` : ""}
            </h2>

            <div className="report-table-section">
              <div className="table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td key={col}>{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalRows > ROWS_PER_PAGE && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <div className="pagination-numbers">
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        className={`pagination-number ${currentPage === page ? "active" : ""}`}
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="report-footer">
              <div className="footer-date">{getTodayDate()}</div>
              <div className="footer-page">
                Page {String(currentPage).padStart(2, "0")} of {String(totalPages).padStart(2, "0")}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>No results to display. Adjust filters and generate again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const hasResults = loanReportData !== null && loanReportData.length > 0;
  const columns = useMemo(
    () => (loanReportData && loanReportData.length > 0 ? Object.keys(loanReportData[0]) : []),
    [loanReportData]
  );
  const totalPages = hasResults ? Math.ceil(loanReportData.length / ROWS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = hasResults ? loanReportData.slice(startIndex, endIndex) : [];
  const selectedBranchObj = selectedBranchId
    ? branches.find((b) => b.id === parseInt(selectedBranchId, 10))
    : null;
  const selectedLoanProductObj = selectedLoanProductId
    ? loanProducts.find((p) => p.id === parseInt(selectedLoanProductId, 10))
    : null;
  const displayBranchName =
    selectedBranchId === "0" ? "All Branches" : selectedBranchObj?.name || "Selected Branch";
  const displayLoanProductName = selectedLoanProductObj?.name || "";

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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

  const handleGenerateReport = async () => {
    if (!selectedBranchId) {
      alert("Please select a Branch Name");
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setLoanReportData(null);

    const branchId = parseInt(selectedBranchId, 10);
    const loanProductId = selectedLoanProductId ? parseInt(selectedLoanProductId, 10) : null;

    const passdueFrom = passdueDaysFrom ? parseInt(passdueDaysFrom, 10) : 0;
    const passdueTo = passdueDaysTo ? parseInt(passdueDaysTo, 10) : 1000000000;
    const capitalFromNum = capitalFrom ? parseInt(capitalFrom, 10) : 0;
    const capitalToNum = capitalTo ? parseInt(capitalTo, 10) : 1000000000;
    const installmentFromNum = installmentFrom ? parseFloat(installmentFrom) : 0;
    const installmentToNum = installmentTo ? parseFloat(installmentTo) : 1000000000;

    const filterParams: QueryParams = {
      branchId,
      loanProductId,
      passdueFrom,
      passdueTo,
      capitalFromNum,
      capitalToNum,
      installmentFromNum,
      installmentToNum,
      hasPassdueRange: Boolean(passdueDaysFrom && passdueDaysTo),
      hasCapitalRange: Boolean(capitalFrom && capitalTo),
      hasInstallmentRange: Boolean(installmentFrom && installmentTo),
    };

    try {
      const filters = buildFiltersList(filterParams);
      const query = buildQuery(filters, branchId);

      const response = await sqlExecutorApi.executeQuery(query);
      console.log("response LOAN", response);

      if (response.success && response.data) {
        setLoanReportData(response.data);
        setCurrentPage(1);
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

  return (
    <div className="loan-pastdue-container">
      <LoanFilters
        branches={branches}
        loanProducts={loanProducts}
        selectedBranchId={selectedBranchId}
        selectedLoanProductId={selectedLoanProductId}
        installmentFrom={installmentFrom}
        installmentTo={installmentTo}
        passdueDaysFrom={passdueDaysFrom}
        passdueDaysTo={passdueDaysTo}
        capitalFrom={capitalFrom}
        capitalTo={capitalTo}
        isLoadingDropdowns={isLoadingDropdowns}
        error={error}
        onBranchChange={setSelectedBranchId}
        onLoanProductChange={setSelectedLoanProductId}
        onInstallmentFromChange={setInstallmentFrom}
        onInstallmentToChange={setInstallmentTo}
        onPassdueDaysFromChange={setPassdueDaysFrom}
        onPassdueDaysToChange={setPassdueDaysTo}
        onCapitalFromChange={setCapitalFrom}
        onCapitalToChange={setCapitalTo}
        onGenerate={handleGenerateReport}
        isGenerating={isGenerating}
      />

      {(reportError || loanReportData) && (
        <ReportSection
          error={reportError}
          hasResults={hasResults}
          columns={columns}
          paginatedData={paginatedData}
          totalRows={loanReportData?.length || 0}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          displayBranchName={displayBranchName}
          displayLoanProductName={displayLoanProductName}
        />
      )}
    </div>
  );
};

export default LoanPastDueReports;
