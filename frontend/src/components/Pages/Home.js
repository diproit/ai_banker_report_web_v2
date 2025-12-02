import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import '../css/Home.css';

const Home = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const getUserDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.user_name) {
      return user.user_name;
    }
    return 'User'; // Fallback
  };
  
  const userName = getUserDisplayName();

  return (
    <div className="dashboard-content">
      {/* Welcome Card */}
      <div className="welcome-card">
        <div className="welcome-header">
          <h2>{t('welcome_back', { name: userName })}</h2>
          <Link to="/chat" className="ai-chat-button">
            <FiMessageSquare className="ai-chat-icon" />
            <span>{t('app.ai_assistant')}</span>
          </Link>
        </div>
        <p>{t('whats_happening')}</p>
      </div>
    </div>
  );
};

export default Home;