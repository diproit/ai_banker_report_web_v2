import React from 'react';
import { FiType, FiSmartphone, FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiEye, FiMonitor, FiTablet } from 'react-icons/fi';
import './css/TextPropertiesSidebar.css';

const TextPropertiesSidebar = ({ 
  widget, 
  onPropertyChange, 
  onSave, 
  onClose 
}) => {
  if (!widget) return null;

  const properties = widget;

  const handlePropertyChange = (key, value) => {
    onPropertyChange(key, value);
  };

  const handleSave = () => {
    onSave(properties);
  };

  const fontFamilies = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Comic Sans MS', label: 'Comic Sans MS' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Lucida Console', label: 'Lucida Console' },
    { value: 'Palatino', label: 'Palatino' },
    { value: 'Garamond', label: 'Garamond' },
    { value: 'Bookman', label: 'Bookman' },
    { value: 'Arial Black', label: 'Arial Black' }
  ];

  const fontSizes = [
    { value: 12, label: '12px' },
    { value: 14, label: '14px' },
    { value: 16, label: '16px' },
    { value: 18, label: '18px' },
    { value: 20, label: '20px' },
    { value: 24, label: '24px' },
    { value: 28, label: '28px' },
    { value: 32, label: '32px' },
    { value: 36, label: '36px' },
    { value: 48, label: '48px' },
    { value: 60, label: '60px' },
    { value: 72, label: '72px' }
  ];

  const handleResponsiveChange = (device, checked) => {
    handlePropertyChange('responsive', {
      ...properties.responsive,
      [device]: checked
    });
  };

  return (
    <div className="text-sidebar-overlay">
      <div className="text-sidebar">
        <div className="sidebar-header">
          <h3><FiType /> Text Properties</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="sidebar-content">
          {/* Text Content Section */}
          <div className="section">
            <h4>Text Content</h4>
            <div className="control-group">
              <label>Text</label>
              <textarea
                value={properties.text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
                placeholder="Enter your text here..."
                rows="4"
              />
            </div>
          </div>

          {/* Font Settings Section */}
          <div className="section">
            <h4><FiType /> Font Settings</h4>
            <div className="font-controls">
              <div className="control-group">
                <label>Font Family</label>
                <select
                  value={properties.fontFamily || 'Arial'}
                  onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
                >
                  {fontFamilies.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>
              <div className="control-group">
                <label>Font Size</label>
                <select
                  value={properties.fontSize || 16}
                  onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                >
                  {fontSizes.map(size => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
              <div className="control-group">
                <label>Font Weight</label>
                <select
                  value={properties.fontWeight || 'normal'}
                  onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="lighter">Lighter</option>
                  <option value="bolder">Bolder</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="500">500</option>
                  <option value="600">600</option>
                  <option value="700">700</option>
                  <option value="800">800</option>
                  <option value="900">900</option>
                </select>
              </div>
            </div>
          </div>

          {/* Text Styling Section */}
          <div className="section">
            <h4>Text Styling</h4>
            <div className="styling-controls">
              <div className="control-group">
                <label>Text Color</label>
                <input
                  type="color"
                  value={properties.textColor || '#000000'}
                  onChange={(e) => handlePropertyChange('textColor', e.target.value)}
                />
              </div>
              <div className="control-group">
                <label>Background Color</label>
                <input
                  type="color"
                  value={properties.backgroundColor || 'transparent'}
                  onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                />
              </div>
              <div className="control-group">
                <label>Text Alignment</label>
                <select
                  value={properties.textAlign || 'left'}
                  onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              <div className="text-decoration-controls">
                <label>Text Decoration</label>
                <div className="decoration-buttons">
                  <button
                    className={`decoration-btn ${properties.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={() => handlePropertyChange('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                    title="Bold"
                  >
                    <FiBold />
                  </button>
                  <button
                    className={`decoration-btn ${properties.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={() => handlePropertyChange('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                    title="Italic"
                  >
                    <FiItalic />
                  </button>
                  <button
                    className={`decoration-btn ${properties.textDecoration === 'underline' ? 'active' : ''}`}
                    onClick={() => handlePropertyChange('textDecoration', properties.textDecoration === 'underline' ? 'none' : 'underline')}
                    title="Underline"
                  >
                    <FiUnderline />
                  </button>
                </div>
              </div>
              <div className="control-group">
                <label>Line Height</label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={properties.lineHeight || 1.5}
                  onChange={(e) => handlePropertyChange('lineHeight', parseFloat(e.target.value))}
                />
                <span className="range-value">{properties.lineHeight || 1.5}</span>
              </div>
              <div className="control-group">
                <label>Letter Spacing (px)</label>
                <input
                  type="range"
                  min="-2"
                  max="10"
                  step="0.5"
                  value={properties.letterSpacing || 0}
                  onChange={(e) => handlePropertyChange('letterSpacing', parseFloat(e.target.value))}
                />
                <span className="range-value">{properties.letterSpacing || 0}px</span>
              </div>
            </div>
          </div>

          {/* Position & Size Section */}
          <div className="section">
            <h4>Position & Size</h4>
            <div className="dimension-controls">
              <div className="control-group">
                <label>X Position</label>
                <input
                  type="number"
                  value={properties.x || 0}
                  onChange={(e) => handlePropertyChange('x', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Y Position</label>
                <input
                  type="number"
                  value={properties.y || 0}
                  onChange={(e) => handlePropertyChange('y', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Width</label>
                <input
                  type="number"
                  value={properties.width || 200}
                  onChange={(e) => handlePropertyChange('width', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Height</label>
                <input
                  type="number"
                  value={properties.height || 40}
                  onChange={(e) => handlePropertyChange('height', parseInt(e.target.value))}
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
                  value={properties.opacity || 100}
                  onChange={(e) => handlePropertyChange('opacity', parseInt(e.target.value))}
                />
                <span className="range-value">{properties.opacity || 100}%</span>
              </div>

              <div className="control-group">
                <label>Border Width (px)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={properties.borderWidth || 0}
                  onChange={(e) => handlePropertyChange('borderWidth', parseInt(e.target.value))}
                />
              </div>

              {properties.borderWidth > 0 && (
                <>
                  <div className="control-group">
                    <label>Border Color</label>
                    <input
                      type="color"
                      value={properties.borderColor || '#000000'}
                      onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label>Border Radius (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={properties.borderRadius || 0}
                      onChange={(e) => handlePropertyChange('borderRadius', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <div className="control-group">
                <label>Shadow</label>
                <select
                  value={properties.shadow || 'none'}
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
                      value={properties.shadowColor || '#000000'}
                      onChange={(e) => handlePropertyChange('shadowColor', e.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label>Blur (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={properties.shadowBlur || 0}
                      onChange={(e) => handlePropertyChange('shadowBlur', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Offset X (px)</label>
                    <input
                      type="number"
                      min="-50"
                      max="50"
                      value={properties.shadowOffsetX || 0}
                      onChange={(e) => handlePropertyChange('shadowOffsetX', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Offset Y (px)</label>
                    <input
                      type="number"
                      min="-50"
                      max="50"
                      value={properties.shadowOffsetY || 0}
                      onChange={(e) => handlePropertyChange('shadowOffsetY', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}
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
                    checked={properties.responsive?.desktop !== false}
                    onChange={(e) => handleResponsiveChange('desktop', e.target.checked)}
                  />
                  Desktop
                </label>
                <label>
                  <FiTablet />
                  <input
                    type="checkbox"
                    checked={properties.responsive?.tablet !== false}
                    onChange={(e) => handleResponsiveChange('tablet', e.target.checked)}
                  />
                  Tablet
                </label>
                <label>
                  <FiSmartphone />
                  <input
                    type="checkbox"
                    checked={properties.responsive?.mobile !== false}
                    onChange={(e) => handleResponsiveChange('mobile', e.target.checked)}
                  />
                  Mobile
                </label>
              </div>
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="section">
            <h4><FiEye /> Accessibility</h4>
            <div className="control-group">
              <label>Alt Text (for screen readers)</label>
              <textarea
                value={properties.altText || ''}
                onChange={(e) => handlePropertyChange('altText', e.target.value)}
                placeholder="Describe the text content for accessibility..."
                rows="2"
              />
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default TextPropertiesSidebar;