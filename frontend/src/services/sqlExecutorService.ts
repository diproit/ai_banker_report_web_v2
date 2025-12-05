const API_BASE_URL = "http://localhost:8000/api/v1";

export interface QueryExecuteRequest {
  query: string;
  limit?: number;
}

export interface QueryExecuteResponse {
  success: boolean;
  data: any[];
  rows?: any[];
  columns?: string[];
  row_count?: number;
  query?: string;
  error?: string;
}

export const sqlExecutorApi = {
  /**
   * Execute a SQL query
   * @param query - SQL query string
   * @param limit - Optional limit for number of rows
   * @returns Query results or error
   */
  executeQuery: async (
    query: string,
    limit?: number
  ): Promise<QueryExecuteResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/runQuery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute query");
      }

      return data;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  },

  /**
   * Get all active branches
   */
  getBranches: async (): Promise<{ id: number; name: string }[]> => {
    const query =
      "SELECT id, name_ln1 as name FROM gl_branch WHERE status = 1 ORDER BY name_ln1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success ? response.data : [];
  },

  /**
   * Get all active customer types
   */
  getCustomerTypes: async (): Promise<{ id: number; name: string }[]> => {
    const query =
      "SELECT id, type_ln1 as name FROM ci_customer_type WHERE status = 1 ORDER BY type_ln1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success ? response.data : [];
  },

  /**
   * Get institute information
   */
  getInstitute: async (): Promise<{ id: number; name: string } | null> => {
    const query = "SELECT id, name_ln1 as name FROM it_institute LIMIT 1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success && response.data.length > 0
      ? response.data[0]
      : null;
  },

  getLoanProducts: async (): Promise<{ id: number; name: string }[]> => {
    const query =
      "SELECT id, name_ln1 as name FROM pl_account_type WHERE pl_account_category_id = 2 ORDER BY name_ln1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success ? response.data : [];
  },
};
