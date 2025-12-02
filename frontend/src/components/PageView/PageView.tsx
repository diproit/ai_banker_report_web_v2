import React from "react";
import "./PageView.css";

interface PageViewProps {
  title: string;
  path?: string;
}

const PageView: React.FC<PageViewProps> = ({ title, path }) => {
  return (
    <div className="page-view">
      <div className="page-view-header">
        <h1 className="page-view-title">This is the {title}</h1>
        {path && <p className="page-view-path">{path}</p>}
      </div>
      <div className="page-view-content">
        <div className="page-view-placeholder">
          <span className="page-view-icon">📄</span>
          <p className="page-view-message">
            Content for "{title}" will be displayed here
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageView;
