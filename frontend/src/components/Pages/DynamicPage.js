import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getComponentForUrl } from "../../config/routeMapping";
import "./DynamicPage.css";

const DynamicPage = () => {
  const location = useLocation();
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the current URL path
    const currentPath = location.pathname;

    // Get menu item data passed from sidebar (if available)
    const menuItem = location.state?.item;

    console.log("DynamicPage - Current path:", currentPath);
    console.log("DynamicPage - Menu item:", menuItem);

    // Try to get component from route mapping
    let componentToRender = null;

    // First, try exact match with the URL from menu item
    if (menuItem?.url) {
      componentToRender = getComponentForUrl(menuItem.url);
    }

    // If no exact match, try matching the current path
    if (!componentToRender) {
      componentToRender = getComponentForUrl(currentPath);
    }

    setComponent(() => componentToRender);
    setLoading(false);
  }, [location]);

  if (loading) {
    return (
      <div className="dynamic-page-loading">
        <div className="spinner"></div>
        <p>Loading page...</p>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="dynamic-page-not-found">
        <h2>Page Not Found</h2>
        <p>The requested page does not exist or is under development.</p>
        <p className="path-info">Path: {location.pathname}</p>
      </div>
    );
  }

  // Render the component with menu item data
  return (
    <div className="dynamic-page-container">
      <Component menuItem={location.state?.item} />
    </div>
  );
};

export default DynamicPage;
