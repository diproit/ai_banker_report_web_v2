import type { QueryParams } from "./types";

export const ROWS_PER_PAGE = 10;

export const buildFiltersList = (params: QueryParams) => {
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

export const buildQuery = (filters: string[], branchId: number) => {
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

export const getVisiblePages = (currentPage: number, totalPages: number) => {
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

export const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};
