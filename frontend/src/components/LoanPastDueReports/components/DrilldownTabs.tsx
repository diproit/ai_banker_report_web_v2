import React from "react";
import "../LoanPastDueReports.css";

type DrilldownView = "branch" | "product" | "table";

interface DrilldownTabsProps {
  active: DrilldownView;
  hasBranch: boolean;
  hasProduct: boolean;
  onChange: (view: DrilldownView) => void;
}

const DrilldownTabs: React.FC<DrilldownTabsProps> = ({ active, hasBranch, hasProduct, onChange }) => {
  if (!hasBranch && !hasProduct) {
    return null;
  }

  return (
    <div className="drilldown-toggle">
      {hasBranch && (
        <button
          type="button"
          className={`drilldown-tab ${active === "branch" ? "active" : ""}`}
          onClick={() => onChange("branch")}
        >
          Branch Drilldown
        </button>
      )}
      {hasProduct && (
        <button
          type="button"
          className={`drilldown-tab ${active === "product" ? "active" : ""}`}
          onClick={() => onChange("product")}
        >
          Product Drilldown
        </button>
      )}
      <button
        type="button"
        className={`drilldown-tab ${active === "table" ? "active" : ""}`}
        onClick={() => onChange("table")}
      >
        Table View
      </button>
    </div>
  );
};

export type { DrilldownView };
export default DrilldownTabs;
