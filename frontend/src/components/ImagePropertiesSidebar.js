import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiCheck, FiImage, FiSettings, FiEye, FiSmartphone, FiTablet, FiMonitor } from 'react-icons/fi';
import './css/ImagePropertiesSidebar.css';

const ImagePropertiesSidebar = ({ 
  isOpen, 
  onClose, 
  onSave, 
  widget, 
  onPropertyChange 
}) => {
  const [localImage, setLocalImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [properties, setProperties] = useState({
		width: widget?.width || 160,
		height: widget?.height || 100,
		opacity: 100,
		borderWidth: 0,
		borderColor: '#000000',
		borderRadius: 0,
		shadow: 'none',
		shadowColor: '#000000',
		shadowBlur: 0,
		shadowOffsetX: 0,
		shadowOffsetY: 0,
		filter: 'none',
		filterIntensity: 100,
		altText: '',
		responsive: {
			desktop: true,
			tablet: true,
			mobile: true
		},
		alignment: 'left',
		objectFit: 'fill',
		rotation: widget?.rotation || 0
	});

  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLocalImage(event.target.result);
        setImageUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrl) {
      setLocalImage(imageUrl);
    }
  };

  const handlePropertyChange = (key, value) => {
    const newProps = { ...properties, [key]: value };
    setProperties(newProps);
    if (onPropertyChange) {
      onPropertyChange(key, value);
    }
  };

  const handleResponsiveChange = (device, value) => {
    const newResponsive = { ...properties.responsive, [device]: value };
    handlePropertyChange('responsive', newResponsive);
  };

  const handleSave = () => {
    const finalProperties = {
      ...properties,
      imageSrc: localImage || imageUrl
    };
    onSave(finalProperties);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="image-sidebar-overlay">
      <div className="image-sidebar">
        <div className="sidebar-header">
          <h3>Image Properties</h3>
          <button className="close-btn" onClick={handleCancel}>
            <FiX size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          {/* Image Upload Section */}
          <div className="section">
            <h4><FiImage /> Image Source</h4>
            <div className="upload-area">
              {localImage ? (
                <div className="image-preview">
                  <img src={localImage} alt="Preview" />
                  <button 
                    className="remove-image-btn" 
                    onClick={() => setLocalImage(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <FiUpload size={32} />
                  <p>Upload or select an image</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button 
                    className="upload-btn" 
                    onClick={() => fileInputRef.current.click()}
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
            <div className="url-input">
              <label>Or enter image URL:</label>
              <div className="url-input-group">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <button onClick={handleUrlSubmit}>Load</button>
              </div>
            </div>
          </div>

          {/* Dimensions Section */}
          <div className="section">
            <h4><FiSettings /> Dimensions & Position</h4>
            <div className="dimension-controls">
              <div className="control-group">
                <label>Width (px)</label>
                <input
                  type="number"
                  value={properties.width}
                  onChange={(e) => handlePropertyChange('width', parseInt(e.target.value))}
                  min="10"
                />
              </div>
              <div className="control-group">
                <label>Height (px)</label>
                <input
                  type="number"
                  value={properties.height}
                  onChange={(e) => handlePropertyChange('height', parseInt(e.target.value))}
                  min="10"
                />
              </div>
              <div className="control-group">
                <label>Alignment</label>
                <select
                  value={properties.alignment}
                  onChange={(e) => handlePropertyChange('alignment', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="control-group">
                <label>Rotation (°)</label>
                <input
                  type="number"
                  value={properties.rotation || 0}
                  onChange={(e) => handlePropertyChange('rotation', parseInt(e.target.value))}
                  min="-360"
                  max="360"
                />
              </div>
            </div>
          </div>

          {/* Styling Options Section */}
          <div className="section">
            <h4>Styling Options</h4>
            <div className="styling-controls">
              <div className="control-group">
                <label>Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={properties.opacity}
                  onChange={(e) => handlePropertyChange('opacity', parseInt(e.target.value))}
                />
                <span className="range-value">{properties.opacity}%</span>
              </div>

              <div className="control-group">
                <label>Border Width (px)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={properties.borderWidth}
                  onChange={(e) => handlePropertyChange('borderWidth', parseInt(e.target.value))}
                />
              </div>

              {properties.borderWidth > 0 && (
                <>
                  <div className="control-group">
                    <label>Border Color</label>
                    <input
                      type="color"
                      value={properties.borderColor}
                      onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label>Border Radius (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={properties.borderRadius}
                      onChange={(e) => handlePropertyChange('borderRadius', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <div className="control-group">
                <label>Shadow</label>
                <select
                  value={properties.shadow}
                  onChange={(e) => handlePropertyChange('shadow', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {properties.shadow === 'custom' && (
                <div className="shadow-controls">
                  <div className="control-group">
                    <label>Shadow Color</label>
                    <input
                      type="color"
                      value={properties.shadowColor}
                      onChange={(e) => handlePropertyChange('shadowColor', e.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label>Blur</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={properties.shadowBlur}
                      onChange={(e) => handlePropertyChange('shadowBlur', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Offset X</label>
                    <input
                      type="number"
                      min="-50"
                      max="50"
                      value={properties.shadowOffsetX}
                      onChange={(e) => handlePropertyChange('shadowOffsetX', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Offset Y</label>
                    <input
                      type="number"
                      min="-50"
                      max="50"
                      value={properties.shadowOffsetY}
                      onChange={(e) => handlePropertyChange('shadowOffsetY', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div className="control-group">
                <label>Filter</label>
                <select
                  value={properties.filter}
                  onChange={(e) => handlePropertyChange('filter', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="sepia">Sepia</option>
                  <option value="blur">Blur</option>
                  <option value="brightness">Brightness</option>
                  <option value="contrast">Contrast</option>
                  <option value="saturate">Saturate</option>
                </select>
              </div>

              {properties.filter !== 'none' && (
                <div className="control-group">
                  <label>Filter Intensity</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={properties.filterIntensity}
                    onChange={(e) => handlePropertyChange('filterIntensity', parseInt(e.target.value))}
                  />
                  <span className="range-value">{properties.filterIntensity}%</span>
                </div>
              )}

              <div className="control-group">
                <label>Object Fit</label>
                <select
                  value={properties.objectFit}
                  onChange={(e) => handlePropertyChange('objectFit', e.target.value)}
                >
                  <option value="fill">Fill</option>
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="scale-down">Scale Down</option>
                </select>
              </div>
            </div>
          </div>

          {/* Responsive Behavior Section */}
          <div className="section">
            <h4><FiSmartphone /> Responsive Behavior</h4>
            <div className="responsive-controls">
              <div className="device-toggle">
                <label>
                  <FiMonitor />
                  <input
                    type="checkbox"
                    checked={properties.responsive.desktop}
                    onChange={(e) => handleResponsiveChange('desktop', e.target.checked)}
                  />
                  Desktop
                </label>
                <label>
                  <FiTablet />
                  <input
                    type="checkbox"
                    checked={properties.responsive.tablet}
                    onChange={(e) => handleResponsiveChange('tablet', e.target.checked)}
                  />
                  Tablet
                </label>
                <label>
                  <FiSmartphone />
                  <input
                    type="checkbox"
                    checked={properties.responsive.mobile}
                    onChange={(e) => handleResponsiveChange('mobile', e.target.checked)}
                  />
                  Mobile
                </label>
              </div>
            </div>
          </div>

          {/* Alt Text Section */}
          <div className="section">
            <h4><FiEye /> Accessibility</h4>
            <div className="control-group">
              <label>Alt Text</label>
              <textarea
                value={properties.altText}
                onChange={(e) => handlePropertyChange('altText', e.target.value)}
                placeholder="Describe the image for accessibility..."
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <FiCheck /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePropertiesSidebar;