import React from "react";
import { useLocation } from "react-router-dom";

const ReportDetails = () => {
  const location = useLocation();
  const { item } = location.state || {}; // fallback if state is undefined

  return (
    <div>
      <h1>Report Details</h1>
      {item ? (
        <pre>{JSON.stringify(item, null, 2)}</pre>
      ) : (
        <p>No item data received.</p>
      )}
    </div>
  );
};

export default ReportDetails;
