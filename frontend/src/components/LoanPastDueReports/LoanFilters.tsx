import React from "react";
import "./LoanPastDueReports.css";
import type { DropdownOption } from "./types";

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

export default LoanFilters;
