import BASE_URL from "../config/api";

const API_BASE_URL = BASE_URL;

export const sqlExecutorApi = {
  /**
   * Execute a SQL query
   * @param {string} query - SQL query string
   * @param {number} limit - Optional limit for number of rows
   * @returns {Promise<Object>} Query results or error
   */
  executeQuery: async (query, limit = null) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/sql_executor/runQuery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  getBranches: async () => {
    const query =
      "SELECT id, name_ln1 as name FROM gl_branch ORDER BY name_ln1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success ? response.data : [];
  },

  /**
   * Get all active customer types
   */
  getCustomerTypes: async () => {
    const query =
      "SELECT id, type_ln1 as name FROM ci_customer_type WHERE status = 1 ORDER BY type_ln1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success ? response.data : [];
  },

  /**
   * Get institute information
   */
  getInstitute: async () => {
    const query = "SELECT id, name_ln1 as name FROM it_institute LIMIT 1";
    const response = await sqlExecutorApi.executeQuery(query);
    return response.success && response.data.length > 0
      ? response.data[0]
      : null;
  },
};
