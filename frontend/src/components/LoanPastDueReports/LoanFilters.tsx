import React from "react";
import "./LoanPastDueReports.css";
import type { DropdownOption, GroupingOption } from "./types";

interface RangeFieldProps {
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  min?: string;
  step?: string;
  fromPlaceholder?: string;
  toPlaceholder?: string;
}

const RangeField: React.FC<RangeFieldProps> = ({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  min = "0",
  step = "1",
  fromPlaceholder = "0",
  toPlaceholder = "0",
}) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="controls">
      <div className="range-row">
        <label className="small-label">From</label>
        <input
          type="number"
          min={min}
          step={step}
          value={fromValue}
          onChange={(e) => onFromChange(e.target.value)}
          className="form-input"
          placeholder={fromPlaceholder}
        />
        <label className="small-label">To</label>
        <input
          type="number"
          min={min}
          step={step}
          value={toValue}
          onChange={(e) => onToChange(e.target.value)}
          className="form-input"
          placeholder={toPlaceholder}
        />
      </div>
    </div>
  </div>
);

interface GroupingSelectorProps {
  selectedGroupings: GroupingOption[];
  isDisabled: boolean;
  onChange: (value: GroupingOption[]) => void;
}

const GROUPING_OPTIONS: { value: GroupingOption; label: string }[] = [
  { value: "branch", label: "With Branch" },
  { value: "product", label: "With Product" },
];

const GroupingSelector: React.FC<GroupingSelectorProps> = ({ selectedGroupings, isDisabled, onChange }) => {
  const toggleGrouping = (value: GroupingOption, checked: boolean) => {
    const next = checked ? [...selectedGroupings, value] : selectedGroupings.filter((g) => g !== value);
    onChange(next);
  };

  return (
    <div className="form-group">
      <label>Grouping</label>
      <div className="controls">
        <div className="range-row">
          {GROUPING_OPTIONS.map((option) => (
            <label key={option.value} className="small-label">
              <input
                type="checkbox"
                checked={selectedGroupings.includes(option.value)}
                onChange={(e) => toggleGrouping(option.value, e.target.checked)}
                disabled={isDisabled}
              />{" "}
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

interface LoanFiltersProps {
  branches: DropdownOption[];
  loanProducts: DropdownOption[];
  selectedBranchId: string;
  selectedLoanProductId: string;
  selectedGroupings: GroupingOption[];
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
  onGroupingChange: (value: GroupingOption[]) => void;
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
  selectedGroupings,
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
  onGroupingChange,
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

    <RangeField
      label="Pastdue Installment"
      fromValue={installmentFrom}
      toValue={installmentTo}
      onFromChange={onInstallmentFromChange}
      onToChange={onInstallmentToChange}
    />

    <RangeField
      label="Passdue Days"
      fromValue={passdueDaysFrom}
      toValue={passdueDaysTo}
      onFromChange={onPassdueDaysFromChange}
      onToChange={onPassdueDaysToChange}
    />

    <RangeField
      label="Capital (Amount)"
      fromValue={capitalFrom}
      toValue={capitalTo}
      onFromChange={onCapitalFromChange}
      onToChange={onCapitalToChange}
      step="1.00"
      fromPlaceholder="0.00"
      toPlaceholder="0.00"
    />

    <GroupingSelector
      selectedGroupings={selectedGroupings}
      isDisabled={isLoadingDropdowns}
      onChange={onGroupingChange}
    />

    <div className="form-actions">
      <button className="btn-generate-report" onClick={onGenerate} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Report"}
      </button>
    </div>
  </div>
);

export default LoanFilters;
