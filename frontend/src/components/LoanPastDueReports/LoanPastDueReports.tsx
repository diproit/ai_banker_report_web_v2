import React, { useEffect, useMemo, useState } from "react";
import "./LoanPastDueReports.css";
import { sqlExecutorApi } from "../../services/sqlExecutorService";
import { buildFiltersList, buildQuery, ROWS_PER_PAGE } from "./loanQueryUtils";
import LoanFilters from "./LoanFilters";
import ReportSection from "./LoanReportSection";
import type {
  BranchDrilldownGroup,
  DropdownOption,
  GroupingOption,
  ProductDrilldownGroup,
  QueryParams,
} from "./types";

const parseNumericValue = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

type TotalsAccumulator = BranchDrilldownGroup["totals"] & { pastDueDaysSum: number };

const createTotals = (): TotalsAccumulator => ({
  accounts: 0,
  capital: 0,
  balance: 0,
  interest: 0,
  pastDueAmount: 0,
  capitalInstallment: 0,
  passdueInstallment: 0,
  avgPastDueDays: 0,
  pastDueDaysSum: 0,
});

const LoanPastDueReports: React.FC = () => {
  // store selected ids (strings from select inputs)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedLoanProductId, setSelectedLoanProductId] = useState<string>("");
  const [selectedGroupings, setSelectedGroupings] = useState<GroupingOption[]>([]);

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
  const isAllBranchesSelected = selectedBranchId === "0";
  const activeGroupings = isAllBranchesSelected ? [] : selectedGroupings;
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
  const displayGrouping = activeGroupings.map((g) => (g === "branch" ? "With Branch" : "With Product")).join(", ");
  const branchDrilldownData = useMemo<BranchDrilldownGroup[] | null>(() => {
    if (!isAllBranchesSelected || !loanReportData) {
      return null;
    }

    const buildProductGroups = (rows: any[]): ProductDrilldownGroup[] => {
      const productMap = new Map<
        string,
        { productId: string | number; productName: string; rows: any[]; totals: TotalsAccumulator }
      >();

      rows.forEach((row) => {
        const productIdRaw =
          row.product_id ?? row.productId ?? row.product ?? row.productid ?? row.pl_account_type_id;
        const productName = row.product_name ?? row.productName ?? "Unknown Product";
        const productId = productIdRaw !== undefined && productIdRaw !== null ? productIdRaw : productName;
        const productKey = String(productId);

        if (!productMap.has(productKey)) {
          productMap.set(productKey, { productId, productName, rows: [], totals: createTotals() });
        }

        const productGroup = productMap.get(productKey);
        if (!productGroup) return;

        productGroup.rows.push(row);
        productGroup.totals.accounts += 1;
        productGroup.totals.capital += parseNumericValue(row.capital ?? row.total_capital);
        productGroup.totals.balance += parseNumericValue(row.balance ?? row.total_balance);
        productGroup.totals.interest += parseNumericValue(row.interest ?? row.total_interest);
        productGroup.totals.pastDueAmount += parseNumericValue(row.past_due_amount ?? row.total_past_due_amount);
        productGroup.totals.capitalInstallment += parseNumericValue(
          row.capital_installment ?? row.total_capital_installment
        );
        productGroup.totals.pastDueDaysSum += parseNumericValue(row.past_due_days);
      });

      return Array.from(productMap.values()).map((group) => {
        const { accounts, capital, balance, interest, pastDueAmount, capitalInstallment, pastDueDaysSum } =
          group.totals;
        const passdueInstallment =
          capitalInstallment > 0 ? parseFloat((pastDueAmount / capitalInstallment).toFixed(2)) : 0;
        const avgPastDueDays = accounts > 0 ? parseFloat((pastDueDaysSum / accounts).toFixed(2)) : 0;

        return {
          productId: group.productId,
          productName: group.productName,
          rows: group.rows,
          totals: {
            accounts,
            capital,
            balance,
            interest,
            pastDueAmount,
            capitalInstallment,
            passdueInstallment,
            avgPastDueDays,
          },
        };
      });
    };

    const grouped = new Map<
      string,
      { branchId: string | number; branchName: string; rows: any[]; totals: TotalsAccumulator }
    >();

    loanReportData.forEach((row) => {
      const branchIdRaw = row.branch_id ?? row.branchId ?? row.branch ?? row.branchid;
      const branchName = row.branch_name ?? row.branchName ?? "Unknown Branch";
      const branchId = branchIdRaw !== undefined && branchIdRaw !== null ? branchIdRaw : branchName;
      const branchKey = String(branchId);

      if (!grouped.has(branchKey)) {
        grouped.set(branchKey, { branchId, branchName, rows: [], totals: createTotals() });
      }

      const group = grouped.get(branchKey);
      if (!group) return;

      group.rows.push(row);
      group.totals.accounts += 1;
      group.totals.capital += parseNumericValue(row.capital);
      group.totals.balance += parseNumericValue(row.balance);
      group.totals.interest += parseNumericValue(row.interest);
      group.totals.pastDueAmount += parseNumericValue(row.past_due_amount);
      group.totals.capitalInstallment += parseNumericValue(row.capital_installment);
      group.totals.pastDueDaysSum += parseNumericValue(row.past_due_days);
    });

    return Array.from(grouped.values()).map((group) => {
      const { accounts, capital, balance, interest, pastDueAmount, capitalInstallment, pastDueDaysSum } =
        group.totals;
      const passdueInstallment =
        capitalInstallment > 0 ? parseFloat((pastDueAmount / capitalInstallment).toFixed(2)) : 0;
      const avgPastDueDays = accounts > 0 ? parseFloat((pastDueDaysSum / accounts).toFixed(2)) : 0;

      return {
        branchId: group.branchId,
        branchName: group.branchName,
        rows: group.rows,
        totals: {
          accounts,
          capital,
          balance,
          interest,
          pastDueAmount,
          capitalInstallment,
          passdueInstallment,
          avgPastDueDays,
        },
        productGroups: buildProductGroups(group.rows),
      };
    });
  }, [isAllBranchesSelected, loanReportData]);

  const productDrilldownData = useMemo<ProductDrilldownGroup[] | null>(() => {
    if (!loanReportData) {
      return null;
    }

    const grouped = new Map<
      string,
      { productId: string | number; productName: string; rows: any[]; totals: TotalsAccumulator }
    >();

    loanReportData.forEach((row) => {
      const productIdRaw =
        row.product_id ?? row.productId ?? row.product ?? row.productid ?? row.pl_account_type_id;
      const productName = row.product_name ?? row.productName ?? "Unknown Product";
      const productId = productIdRaw !== undefined && productIdRaw !== null ? productIdRaw : productName;
      const productKey = String(productId);

      if (!grouped.has(productKey)) {
        grouped.set(productKey, { productId, productName, rows: [], totals: createTotals() });
      }

      const group = grouped.get(productKey);
      if (!group) return;

      group.rows.push(row);
      group.totals.accounts += 1;
      group.totals.capital += parseNumericValue(row.capital ?? row.total_capital);
      group.totals.balance += parseNumericValue(row.balance ?? row.total_balance);
      group.totals.interest += parseNumericValue(row.interest ?? row.total_interest);
      group.totals.pastDueAmount += parseNumericValue(row.past_due_amount ?? row.total_past_due_amount);
      group.totals.capitalInstallment += parseNumericValue(
        row.capital_installment ?? row.total_capital_installment
      );
      group.totals.pastDueDaysSum += parseNumericValue(row.past_due_days);
    });

    return Array.from(grouped.values()).map((group) => {
      const { accounts, capital, balance, interest, pastDueAmount, capitalInstallment, pastDueDaysSum } =
        group.totals;
      const passdueInstallment =
        capitalInstallment > 0 ? parseFloat((pastDueAmount / capitalInstallment).toFixed(2)) : 0;
      const avgPastDueDays = accounts > 0 ? parseFloat((pastDueDaysSum / accounts).toFixed(2)) : 0;

      return {
        productId: group.productId,
        productName: group.productName,
        rows: group.rows,
        totals: {
          accounts,
          capital,
          balance,
          interest,
          pastDueAmount,
          capitalInstallment,
          passdueInstallment,
          avgPastDueDays,
        },
      };
    });
  }, [loanReportData]);

  const handlePrint = () => {
    if (!hasResults || !loanReportData) return;

    const groupingText = displayGrouping ? ` | Grouping: ${displayGrouping}` : "";
    const printableRows = loanReportData
      .map(
        (row) =>
          `<tr>${columns
            .map((col) => `<td style="padding:6px 8px;border:1px solid #ccc;">${String(row[col] ?? "")}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const printableHeader = columns
      .map((col) => `<th style="padding:8px 8px;border:1px solid #ccc;background:#f1f3f5;text-align:left;">${col}</th>`)
      .join("");

    const content = `
      <html>
        <head>
          <title>Loan Past Due Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; }
            h2 { margin: 0 0 12px 0; font-size: 14px; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Loan Past Due Report</h1>
          <h2>Branch: ${displayBranchName}${displayLoanProductName ? ` | Product: ${displayLoanProductName}` : ""}${groupingText}</h2>
          <table>
            <thead><tr>${printableHeader}</tr></thead>
            <tbody>${printableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleExport = () => {
    if (!hasResults || !loanReportData) return;

    const header = columns.join(",");
    const rows = loanReportData.map((row) =>
      columns
        .map((col) => {
          const cell = String(row[col] ?? "");
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    );

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "loan-past-due-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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

    // if (selectedGroupings.length === 0) {
    //   alert("Please select at least one grouping option");
    //   return;
    // }

    // if (selectedBranchId === "0" && !selectedLoanProductId) {
    //   alert("Please select a Loan Product when Branch is All Branches");
    //   return;
    // }

    //drildown drillup

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
      const query = buildQuery(filters, activeGroupings);

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
        selectedGroupings={selectedGroupings}
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
        onGroupingChange={setSelectedGroupings}
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
          displayGrouping={displayGrouping}
          onPrint={handlePrint}
          onExport={handleExport}
          isAllBranches={isAllBranchesSelected}
          branchGroups={branchDrilldownData}
          productGroups={productDrilldownData}
        />
      )}
    </div>
  );
};

export default LoanPastDueReports;
