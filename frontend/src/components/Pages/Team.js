import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import '../css/Home.css';

const Home = () => {
  return (
    <div className="dashboard-content">
      {/* Welcome Card */}
      <div className="welcome-card">
        <div className="welcome-header">
          <h2>Team</h2>
          <Link to="/chat" className="ai-chat-button">
            <FiMessageSquare className="ai-chat-icon" />
            <span>AI Assistant</span>
          </Link>
        </div>
        <p>Here's what's happening with your business today.</p>
      </div>
    </div>
  );
};

export default Home;