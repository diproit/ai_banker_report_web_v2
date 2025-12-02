import React, { useRef, useState } from 'react';
import { FaUpload, FaTimes, FaCheck, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const LogoUpload = ({ onLogoUpload, logo, onToggle, isChecked = false }) => {
  const fileInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);

  const { t } = useTranslation();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        alert(t('components.logoUpload.invalid_file'));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert(t('components.logoUpload.file_too_large'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (onLogoUpload) {
          onLogoUpload(event.target.result);
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert(t('components.logoUpload.invalid_file'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onLogoUpload) {
      onLogoUpload(null);
    }
  };

  const togglePreview = (e) => {
    e.stopPropagation();
    setShowPreview(!showPreview);
  };

  return (
    <div className="logo-upload-card">
      <div className="logo-upload-content">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <div className="logo-actions">
          <div className="logo-upload-button">
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              title={t('components.logoUpload.upload')}
            >
              <FaUpload className="upload-icon" />
              <span>{t('components.logoUpload.logo')}</span>
            </button>
            
            {logo && (
              <button
                className="preview-button"
                onClick={togglePreview}
                title={t('components.logoUpload.preview')}
              >
                <FaEye className="preview-icon" />
                <span>{t('components.logoUpload.preview')}</span>
              </button>
            )}
          </div>
          
          <label className="logo-checkbox-container">
            <input 
              type="checkbox" 
              checked={isChecked}
              onChange={(e) => onToggle && onToggle(e.target.checked)}
              className="logo-checkbox"
            />
            <span className="checkmark">
              {isChecked && <FaCheck className="check-icon" />}
            </span>
          </label>
        </div>
        
        {showPreview && logo && (
          <div className="preview-overlay" onClick={togglePreview}>
            <div className="preview-content" onClick={e => e.stopPropagation()}>
              <button className="close-preview" onClick={togglePreview}>
                <FaTimes />
              </button>
              <img src={logo} alt="Logo Preview" className="preview-image" />
            </div>
          </div>
        )}
        
        {logo && (
          <div className="logo-preview">
            <img 
              src={logo} 
              alt="Logo" 
              className="logo-image"
              onClick={() => fileInputRef.current?.click()}
            />
            <button 
              className="remove-logo"
              onClick={handleRemove}
              title={t('components.logoUpload.remove')}
            >
              <FaTimes />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoUpload;
