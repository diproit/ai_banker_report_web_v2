export interface DropdownOption {
  id: number;
  name: string;
}

export type GroupingOption = "branch" | "product";

export interface QueryParams {
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

export interface BranchDrilldownTotals {
  accounts: number;
  capital: number;
  balance: number;
  interest: number;
  pastDueAmount: number;
  capitalInstallment: number;
  passdueInstallment: number;
  avgPastDueDays: number;
}

export interface BranchDrilldownGroup {
  branchId: number | string;
  branchName: string;
  rows: any[];
  totals: BranchDrilldownTotals;
  productGroups?: ProductDrilldownGroup[];
}

export interface ProductDrilldownGroup {
  productId: number | string;
  productName: string;
  rows: any[];
  totals: BranchDrilldownTotals;
}
