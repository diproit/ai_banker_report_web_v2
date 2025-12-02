import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaTrash,
  FaFont,
  FaTextHeight
} from 'react-icons/fa';

const HeadingEditor = ({
  value,
  onChange,
  onRemove,
  placeholder = '',
  showRemove = true,
  onBlur,
  showToolbar = true,   // 👈 new prop
}) => {
  const { t } = useTranslation();
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [alignment, setAlignment] = useState('left');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState('16px');
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
    { label: 'Garamond', value: 'Garamond, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
    { label: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
    { label: 'Lucida Sans', value: '"Lucida Sans Unicode", "Lucida Grande", sans-serif' },
    { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
    { label: 'Copperplate', value: 'Copperplate, "Copperplate Gothic Light", fantasy' },
    { label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
    { label: 'Consolas', value: 'Consolas, monaco, monospace' },
    { label: 'Franklin Gothic', value: '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif' },
    { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' }
  ];

  const sizeOptions = [
    { label: '8px', value: '8px' },
    { label: '10px', value: '10px' },
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' },
    { label: '36px', value: '36px' },
    { label: '40px', value: '40px' },
    { label: '48px', value: '48px' },
    { label: '56px', value: '56px' },
    { label: '64px', value: '64px' }
  ];

  const toggleDropdown = (type, e) => {
    e.stopPropagation();

    // Toggle the dropdown
    if (type === 'font') {
      setShowFontDropdown(prev => !prev);
      setShowSizeDropdown(false);
    } else if (type === 'size') {
      setShowSizeDropdown(prev => !prev);
      setShowFontDropdown(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowFontDropdown(false);
        setShowSizeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // no-op: previously used to prevent dropdown close; kept for future use if needed

  // Update the editor's content when value prop changes
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Apply font styling separately (only when font changes, not on every value change)
  useEffect(() => {
    if (editorRef.current && fontFamily) {
      document.execCommand('fontName', false, fontFamily);
    }
  }, [fontFamily]);

  useEffect(() => {
    if (editorRef.current && fontSize) {
      document.execCommand('fontSize', false, parseInt(fontSize));
    }
  }, [fontSize]);

  const handleInput = (e) => {
    if (onChange) {
      onChange(e.currentTarget.innerHTML);
    }
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    // Update the editor's content to apply styles
    const content = editorRef.current.innerHTML;
    if (onChange) {
      onChange(content);
    }
  };

  const applyFontFamily = (font) => {
    setFontFamily(font);
    formatText('fontName', font);
    setShowFontDropdown(false);
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    formatText('fontSize', size.replace('px', ''));
    setShowSizeDropdown(false);
  };

  const getFontLabel = (value) => {
    const font = fontOptions.find(f => f.value === value);
    return font ? font.label : t('components.headingEditor.font');
  };

  const getSizeLabel = (value) => {
    const size = sizeOptions.find(s => s.value === value);
    return size ? size.label : t('components.headingEditor.font_size');
  };

  const handleAlignment = (align) => {
    setAlignment(align);
    formatText('justify' + align.charAt(0).toUpperCase() + align.slice(1));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const getAlignmentClass = () => {
    switch (alignment) {
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      default: return 'justify-start';
    }
  };

  const resolvedPlaceholder = placeholder || t('components.headingEditor.placeholder');

  return (
    <div className="heading-editor-container">
      {showToolbar && (   // 👈 render only if true
        <div className="toolbar">
          <div className="toolbar">
            {/* Font Family Dropdown */}
            {/* Font Dropdown */}
            <div className="dropdown-container" ref={dropdownRef}>
              <button
                className={`toolbar-button dropdown-button ${showFontDropdown ? 'active' : ''}`}
                onClick={(e) => toggleDropdown('font', e)}
              >
                <span className="dropdown-icon"><FaFont /></span>
                <span className="dropdown-text">{getFontLabel(fontFamily)}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {showFontDropdown && (
                <div className="dropdown-menu">
                  {fontOptions.map((font) => (
                    <div
                      key={font.value}
                      className={`dropdown-item ${fontFamily === font.value ? 'active' : ''}`}
                      onClick={() => applyFontFamily(font.value)}
                      style={{ '--item-font-family': font.value, fontFamily: font.value }}
                      data-font-family
                    >
                      {font.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown */}
            <div className="dropdown-container">
              <button
                className={`toolbar-button dropdown-button ${showSizeDropdown ? 'active' : ''}`}
                onClick={(e) => toggleDropdown('size', e)}
              >
                <span className="dropdown-icon"><FaTextHeight /></span>
                <span className="dropdown-text">{getSizeLabel(fontSize)}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {showSizeDropdown && (
                <div className="dropdown-menu">
                  {sizeOptions.map((size) => (
                    <div
                      key={size.value}
                      className={`dropdown-item ${fontSize === size.value ? 'active' : ''}`}
                      onClick={() => applyFontSize(size.value)}
                      style={{ fontSize: size.value }}
                    >
                      {size.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />


            <button
              type="button"
              onClick={() => formatText('bold')}
              className="toolbar-button"
              aria-label={t('components.headingEditor.bold')}
            >
              <FaBold />
            </button>
            <button
              type="button"
              onClick={() => formatText('italic')}
              className="toolbar-button"
              aria-label={t('components.headingEditor.italic')}
            >
              <FaItalic />
            </button>
            <button
              type="button"
              onClick={() => formatText('underline')}
              className="toolbar-button"
              aria-label={t('components.headingEditor.underline')}
            >
              <FaUnderline />
            </button>
            <div className="divider" />
            <button
              type="button"
              onClick={() => handleAlignment('left')}
              className={`toolbar-button ${alignment === 'left' ? 'active' : ''}`}
              aria-label={t('components.headingEditor.align_left')}
            >
              <FaAlignLeft />
            </button>
            <button
              type="button"
              onClick={() => handleAlignment('center')}
              className={`toolbar-button ${alignment === 'center' ? 'active' : ''}`}
              aria-label={t('components.headingEditor.align_center')}
            >
              <FaAlignCenter />
            </button>
            <button
              type="button"
              onClick={() => handleAlignment('right')}
              className={`toolbar-button ${alignment === 'right' ? 'active' : ''}`}
              aria-label={t('components.headingEditor.align_right')}
            >
              <FaAlignRight />
            </button>
            {showRemove && onRemove && (
              <>
                <div className="divider" />
                <button
                  type="button"
                  onClick={onRemove}
                  className="toolbar-button remove"
                  aria-label={t('components.headingEditor.remove')}
                >
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className={`editor ${getAlignmentClass()} ${isFocused ? 'focused' : ''}`}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) {
            onBlur(e.currentTarget.innerHTML);
          }
        }}
        onKeyDown={handleKeyDown}
        data-placeholder={resolvedPlaceholder}
      />
    </div>
  );
};

export default React.memo(HeadingEditor);