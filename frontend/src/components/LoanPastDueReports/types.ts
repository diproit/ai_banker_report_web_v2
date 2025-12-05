export interface DropdownOption {
  id: number;
  name: string;
}

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
