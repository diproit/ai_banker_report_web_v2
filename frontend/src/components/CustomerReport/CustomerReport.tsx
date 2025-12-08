import React, { useState, useEffect } from "react";
import "./CustomerReport.css";

interface Customer {
  "Ref member number": string;
  "Customer type": string;
  Name: string;
  Address: string;
  Phone: string;
  Mobile: string;
  "Date of Birth": string;
  Sex: string;
  "Branch Name": string;
}

interface CustomerReportProps {
  branchName: string;
  customerType: string;
  data: Customer[];
  instituteName?: string;
}

const CustomerReport: React.FC<CustomerReportProps> = ({
  branchName,
  customerType,
  data,
  instituteName = "Institute Name",
}) => {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    new Set()
  );
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Reset expanded state when data changes
  useEffect(() => {
    setExpandedBranches(new Set());
    setExpandedTypes(new Set());
    setExpandAll(false);
  }, [data]);

  // Group data by branch and customer type
  const groupedData = data.reduce((acc, customer) => {
    const branch = customer["Branch Name"] || "Unknown";
    const type = customer["Customer type"] || "Unknown";

    if (!acc[branch]) {
      acc[branch] = {};
    }
    if (!acc[branch][type]) {
      acc[branch][type] = [];
    }
    acc[branch][type].push(customer);

    return acc;
  }, {} as Record<string, Record<string, Customer[]>>);

  // Sort branches alphabetically
  const sortedBranches = Object.keys(groupedData).sort();

  // Toggle branch expansion
  const toggleBranch = (branch: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branch)) {
      newExpanded.delete(branch);
      // Also collapse all types under this branch
      const typesToRemove = Object.keys(groupedData[branch]).map(
        (type) => `${branch}::${type}`
      );
      const newExpandedTypes = new Set(expandedTypes);
      typesToRemove.forEach((key) => newExpandedTypes.delete(key));
      setExpandedTypes(newExpandedTypes);
    } else {
      newExpanded.add(branch);
    }
    setExpandedBranches(newExpanded);
  };

  // Toggle customer type expansion
  const toggleType = (branch: string, type: string) => {
    const key = `${branch}::${type}`;
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTypes(newExpanded);
  };

  // Expand/Collapse all
  const handleExpandCollapseAll = () => {
    if (expandAll) {
      setExpandedBranches(new Set());
      setExpandedTypes(new Set());
    } else {
      const allBranches = new Set(sortedBranches);
      const allTypes = new Set<string>();
      sortedBranches.forEach((branch) => {
        Object.keys(groupedData[branch]).forEach((type) => {
          allTypes.add(`${branch}::${type}`);
        });
      });
      setExpandedBranches(allBranches);
      setExpandedTypes(allTypes);
    }
    setExpandAll(!expandAll);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  // Get today's date in dd/mm/yyyy format
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get total count for a branch
  const getBranchCount = (branch: string) => {
    return Object.values(groupedData[branch]).flat().length;
  };

  // Handle print action
  const handlePrint = (branch: string, type: string) => {
    console.log("=== Print Report ===");
    console.log("Branch:", branch);
    console.log("Customer Type:", type);
    console.log("Record Count:", groupedData[branch][type].length);
    console.log("====================");
  };

  // Handle export action
  const handleExport = (branch: string, type: string) => {
    console.log("=== Export Report ===");
    console.log("Branch:", branch);
    console.log("Customer Type:", type);
    console.log("Record Count:", groupedData[branch][type].length);
    console.log("Data:", groupedData[branch][type]);
    console.log("=====================");
  };

  return (
    <div className="customer-report-card">
      <h1 className="report-main-heading">{instituteName}</h1>
      <h2 className="report-sub-heading">
        Customer List for {branchName}
        {customerType && ` - ${customerType}`}
      </h2>

      {/* Expand/Collapse All Button */}
      <div className="drill-down-controls">
        <button
          className="btn-expand-collapse"
          onClick={handleExpandCollapseAll}
        >
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Drill-down Structure */}
      <div className="drill-down-container">
        {sortedBranches.map((branch) => {
          const isBranchExpanded = expandedBranches.has(branch);
          const branchCount = getBranchCount(branch);
          const customerTypes = Object.keys(groupedData[branch]).sort();

          return (
            <div key={branch} className="branch-group">
              {/* Branch Header */}
              <div
                className="branch-header"
                onClick={() => toggleBranch(branch)}
              >
                <span className="expand-icon">
                  {isBranchExpanded ? "▼" : "▶"}
                </span>
                <span className="branch-name">{branch}</span>
                <span className="record-count">({branchCount} records)</span>
              </div>

              {/* Customer Types (shown when branch is expanded) */}
              {isBranchExpanded && (
                <div className="customer-types-container">
                  {customerTypes.map((type) => {
                    const typeKey = `${branch}::${type}`;
                    const isTypeExpanded = expandedTypes.has(typeKey);
                    const typeCustomers = groupedData[branch][type];
                    const typeCount = typeCustomers.length;

                    return (
                      <div key={typeKey} className="type-group">
                        {/* Customer Type Header */}
                        <div
                          className="type-header"
                          onClick={() => toggleType(branch, type)}
                        >
                          <span className="expand-icon">
                            {isTypeExpanded ? "▼" : "▶"}
                          </span>
                          <span className="type-name">{type}</span>
                          <span className="record-count">
                            ({typeCount} records)
                          </span>
                        </div>

                        {/* Customer Table (shown when type is expanded) */}
                        {isTypeExpanded && (
                          <div className="customer-table-container">
                            {/* Action Buttons */}
                            <div className="table-actions">
                              <button
                                className="btn-print"
                                onClick={() => handlePrint(branch, type)}
                              >
                                Print
                              </button>
                              <button
                                className="btn-export"
                                onClick={() => handleExport(branch, type)}
                              >
                                Export
                              </button>
                            </div>

                            <table className="report-table">
                              <thead>
                                <tr>
                                  <th>Ref member number</th>
                                  <th>Customer type</th>
                                  <th>Name</th>
                                  <th>Address</th>
                                  <th className="align-right">Phone</th>
                                  <th className="align-right">Mobile</th>
                                  <th className="align-right">Date of Birth</th>
                                  <th>Sex</th>
                                  <th>Branch Name</th>
                                </tr>
                              </thead>
                              <tbody>
                                {typeCustomers.map((customer, index) => (
                                  <tr key={index}>
                                    <td>{customer["Ref member number"]}</td>
                                    <td>{customer["Customer type"]}</td>
                                    <td>{customer["Name"]}</td>
                                    <td>{customer["Address"]}</td>
                                    <td className="align-right">
                                      {customer["Phone"]}
                                    </td>
                                    <td className="align-right">
                                      {customer["Mobile"]}
                                    </td>
                                    <td className="align-right">
                                      {formatDate(customer["Date of Birth"])}
                                    </td>
                                    <td>{customer["Sex"]}</td>
                                    <td>{customer["Branch Name"]}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="report-footer">
        <div className="footer-date">{getTodayDate()}</div>
      </div>
    </div>
  );
};

export default CustomerReport;
