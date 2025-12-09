import { FiPlus, FiSave, FiScissors, FiCopy, FiTrash2, FiRotateCcw, FiRotateCw, FiZoomIn, FiZoomOut, FiEye, FiMove, FiUpload, FiDownload } from 'react-icons/fi';
import { serializeCanvas, deserializeCanvas, downloadCanvasFile, storeCanvasFile } from '../../utils/canvasSaveLoad';
import ImagePropertiesSidebar from '../ImagePropertiesSidebar';
import TextPropertiesSidebar from '../TextPropertiesSidebar';
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PreviewWithDesignButton from './PreviewWithDesignButton';
import { useParams } from "react-router-dom";
import { createPortal } from 'react-dom';
import { FaCheckSquare, FaRegSquare, FaFileDownload, FaFilePdf, FaFileExcel, FaFileCsv, FaChevronDown, FaTimes, FaPlus, FaEye } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiFilter } from 'react-icons/fi';
import { MaterialReactTable } from 'material-react-table';
import moment from 'moment';
import HeadingEditor from '../common/HeadingEditor';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CSVLink } from 'react-csv';
import { get, post } from '../../clients/apiClient';
// import '../css/DesignReport.css';
// import '../css/ImagePropertiesSidebar.css';
// import '../css/ReportPage.css';
// import '../common/HeadingEditor.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
console.log(API_BASE_URL);

// Grid settings
const GRID_SIZE = 10;
const RULER_THICKNESS = 24;
const LABEL_EVERY_CELLS = 10;

// Page size presets (approx px at 96dpi)
const PAGE_PRESETS = [
  { key: 'free', label: 'Free (Auto)', width: 'auto', height: 'auto' },
  { key: 'a4-portrait', label: 'A4 Portrait', width: 595, height: 842 },
  { key: 'a4l', label: 'A4 Landscape', width: 1123, height: 794 },
  { key: 'letterp', label: 'Letter Portrait', width: 816, height: 1056 },
  { key: 'letterl', label: 'Letter Landscape', width: 1056, height: 816 },
];

// Helper to snap value to grid
const snap = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const initialToolbox = [
  { type: 'textbox', label: 'TextBox' },
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'line', label: 'Line' },
  { type: 'dashline', label: 'Dash Line' },
  { type: 'image', label: 'Image' },
  { type: 'data-table', label: 'Data Table' },
];

const headerFooterToolbox = [
  { type: 'header', label: 'Header' },
  { type: 'footer', label: 'Footer' },
];

// DesignReport Component
export function DesignReport() {
  const { reportId } = useParams();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [widgets, setWidgets] = useState([]);
  const [draggingTool, setDraggingTool] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [scale, setScale] = useState(1);
  const [pageKey, setPageKey] = useState('free');
  const [showImageSidebar, setShowImageSidebar] = useState(false);
  const [selectedImageWidget, setSelectedImageWidget] = useState(null);
  const [showTextSidebar, setShowTextSidebar] = useState(false);
  const [selectedTextWidget, setSelectedTextWidget] = useState(null);
  const [selectedReportCategory, setSelectedReportCategory] = useState('');
  const [coordinates, setCoordinates] = useState({});

  const currentPreset = PAGE_PRESETS.find(p => p.key === pageKey) || PAGE_PRESETS[0];

  const handleReportCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedReportCategory(category);
    console.log('Selected report category:', category);
  };

  const measureCanvas = useCallback(() => {
    if (canvasRef.current) {
      setCanvasSize({ width: canvasRef.current.clientWidth, height: canvasRef.current.clientHeight });
    }
  }, []);

  useEffect(() => {
    measureCanvas();
    window.addEventListener('resize', measureCanvas);
    return () => window.removeEventListener('resize', measureCanvas);
  }, [measureCanvas]);

  useEffect(() => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((w) => {
        if (w.type === 'data-table') {
          const canvasWidth = currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width;
          const canvasHeight = currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height;
          const newX = snap((canvasWidth - snap(w.width)) / 2);
          const newY = snap((canvasHeight - snap(w.height)) / 2);
          return { ...w, x: newX, y: newY };
        }
        return w;
      })
    );
  }, [canvasSize, currentPreset]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!activeId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setWidgets((prev) => prev.filter((w) => w.id !== activeId));
        setActiveId(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeId]);

  const updateCoordinates = useCallback(() => {
    const newCoordinates = {};
    widgets.forEach(widget => {
      newCoordinates[widget.id] = {
        x: widget.x + widget.width,
        y: widget.y + widget.height,
        width: widget.width,
        height: widget.height
      };
    });
    setCoordinates(newCoordinates);
  }, [widgets]);

  useEffect(() => {
    updateCoordinates();
  }, [widgets, updateCoordinates]);

  const getCanvasOffset = () => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  };

  const handleToolDragStart = (tool) => (e) => {
    e.dataTransfer.setData('text/plain', tool.type);
    setDraggingTool(tool.type);
  };

  const handleToolDragEnd = () => setDraggingTool(null);

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain') || draggingTool;
    if (!type) return;

    const { left, top } = getCanvasOffset();
    const canvasWidth = currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width;
    const canvasHeight = currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height;

    let x = snap((e.pageX - left) / scale);
    let y = snap((e.pageY - top) / scale);

    const id = Date.now().toString();

    let baseSize;
    switch (type) {
      case 'line': baseSize = { width: 120, height: 2 }; break;
      case 'textbox': baseSize = { width: 200, height: 40 }; break;
      case 'header': baseSize = { width: 200, height: 40 }; break;
      case 'footer': baseSize = { width: 200, height: 40 }; break;
      case 'data-table': baseSize = { width: 200, height: 65 }; break;
      default: baseSize = { width: 160, height: 100 };
    }

    if (type === 'header') {
      x = snap((canvasWidth - snap(baseSize.width)) / 2);
      y = 0;
    } else if (type === 'footer') {
      x = snap((canvasWidth - snap(baseSize.width)) / 2);
      y = snap(canvasHeight - snap(baseSize.height));
    } else if (type === 'data-table') {
      x = snap((canvasWidth - snap(baseSize.width)) / 2);
      y = snap((canvasHeight - snap(baseSize.height)) / 2);
    }

    const newWidget = {
      id,
      type,
      x,
      y,
      width: snap(baseSize.width),
      height: snap(baseSize.height),
      text: type === 'textbox' ? 'Text' : '',
      imageSrc: null,
      altText: '',
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
      responsive: { desktop: true, tablet: true, mobile: true },
      alignment: 'left',
      objectFit: 'fill',
      rotation: 0,
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textColor: '#000000',
      backgroundColor: 'transparent',
      textAlign: 'left',
      lineHeight: 1.5,
      letterSpacing: 0
    };

    setWidgets((prev) => [...prev, newWidget]);
    setActiveId(id);
    setDraggingTool(null);

    if (type === 'image') {
      setSelectedImageWidget(newWidget);
      setShowImageSidebar(true);
    }

    if (type === 'textbox') {
      setSelectedTextWidget(newWidget);
      setShowTextSidebar(true);
    }
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
  };

  const startMove = (id, startEvent) => {
    startEvent.stopPropagation();
    const startX = startEvent.pageX;
    const startY = startEvent.pageY;
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;

    const canvasWidth = currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width;
    const canvasHeight = currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height;

    const onMove = (e) => {
      let dx = (e.pageX - startX) / scale;
      let dy = (e.pageY - startY) / scale;

      let newX = snap(widget.x + dx);
      let newY = snap(widget.y + dy);

      if (widget.type === 'header') {
        newX = snap((canvasWidth - widget.width) / 2);
        newY = 0;
      } else if (widget.type === 'footer') {
        newX = snap((canvasWidth - widget.width) / 2);
        newY = snap(canvasHeight - widget.height);
      }

      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, x: newX, y: newY } : w)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResizeDir = (id, dir, startEvent) => {
    startEvent.stopPropagation();
    const startX = startEvent.pageX;
    const startY = startEvent.pageY;
    const startWidget = widgets.find((w) => w.id === id);
    if (!startWidget) return;

    const onMove = (e) => {
      const dx = (e.pageX - startX) / scale;
      const dy = (e.pageY - startY) / scale;
      setWidgets((prev) => prev.map((w) => {
        if (w.id !== id) return w;
        let x = startWidget.x, y = startWidget.y, width = startWidget.width, height = startWidget.height;
        if (dir.includes('e')) width = Math.max(GRID_SIZE, snap(startWidget.width + dx));
        if (dir.includes('s')) height = Math.max(GRID_SIZE, snap(startWidget.height + dy));
        if (dir.includes('w')) {
          const newW = Math.max(GRID_SIZE, snap(startWidget.width - dx));
          x = snap(startWidget.x + (startWidget.width - newW));
          width = newW;
        }
        if (dir.includes('n')) {
          const newH = Math.max(GRID_SIZE, snap(startWidget.height - dy));
          y = snap(startWidget.y + (startWidget.height - newH));
          height = newH;
        }
        return { ...w, x, y, width, height };
      }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startRotate = (id, startEvent) => {
    startEvent.stopPropagation();
    const startWidget = widgets.find((w) => w.id === id);
    if (!startWidget) return;

    const centerX = startWidget.x + startWidget.width / 2;
    const centerY = startWidget.y + startWidget.height / 2;
    const startAngle = Math.atan2(startEvent.pageY - centerY, startEvent.pageX - centerX);

    const onMove = (e) => {
      const currentAngle = Math.atan2(e.pageY - centerY, e.pageX - centerX);
      let rotation = (currentAngle - startAngle) * (180 / Math.PI);
      rotation = Math.round(rotation);
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, rotation } : w)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleTextChange = useCallback((id, value) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, text: value } : w)));
  }, []);

  const removeWidget = (id) => setWidgets((prev) => prev.filter((w) => w.id !== id));

  const handleImagePropertyChange = (key, value) => {
    if (!selectedImageWidget) return;
    setSelectedImageWidget(prev => ({ ...prev, [key]: value }));
  };

  const handleTextPropertyChange = (key, value) => {
    if (!selectedTextWidget) return;
    setSelectedTextWidget(prev => ({ ...prev, [key]: value }));
  };

  const handleImageSave = (properties) => {
    if (selectedImageWidget) {
      setWidgets(prev => prev.map(w =>
        w.id === selectedImageWidget.id ? { ...w, ...properties } : w
      ));
      setSelectedImageWidget(null);
      setShowImageSidebar(false);
    }
  };

  const handleImageClose = () => {
    setSelectedImageWidget(null);
    setShowImageSidebar(false);
  };

  const handleTextSave = (properties) => {
    if (selectedTextWidget) {
      setWidgets(prev => prev.map(w =>
        w.id === selectedTextWidget.id ? { ...w, ...properties } : w
      ));
      setSelectedTextWidget(null);
      setShowTextSidebar(false);
    }
  };

  const handleTextClose = () => {
    setSelectedTextWidget(null);
    setShowTextSidebar(false);
  };

  const handleSaveCanvas = async () => {
    try {
      const filename = `canvas-design-${new Date().toISOString().split('T')[0]}.json`;
      const result = downloadCanvasFile(widgets, filename, {
        pretty: true,
        pageKey: pageKey,
        pageWidth: currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width,
        pageHeight: currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height,
        pageLabel: currentPreset.label
      });
      const userId = 1;
      const branchId = 1;
      const reportStructureId = 3;
      const reportName = "Personal Savings details myReport002";
      const is_active = 1;
      const createdat = new Date();
      const updatedat = new Date();
      const created_at = createdat.toISOString().slice(0, 19).replace("T", " ");
      const updated_at = updatedat.toISOString().slice(0, 19).replace("T", " ");
      const val = storeCanvasFile(widgets, userId, branchId, reportStructureId, reportName, is_active, created_at, updated_at);
      console.log('val', val);
      if (val.success) {
        console.log('Canvas stored successfully');
      } else {
        console.error('Failed to store canvas:', val.error);
      }

      if (result.success) {
        console.log('Canvas saved successfully');
      } else {
        console.error('Failed to save canvas:', result.error);
      }

    } catch (error) {
      console.error('Error saving canvas:', error);
      toast.error('Error saving canvas: ' + (error?.message || String(error)));
    }
  };

  const handleLoadCanvas = async (event) => {
    try {
      const payload = {
        id: 13,
      };
      const data = await post('/report-design/json_load', payload);
      let fileString = data.design_json;
      console.log('fileString', fileString);
      if (fileString.startsWith('"') && fileString.endsWith('"')) {
        fileString = fileString.slice(1, -1).replace(/\\"/g, '"');
      }

      const result = await deserializeCanvas(fileString);

      if (result.success) {
        setWidgets(result.elements);
        console.log(`Loaded ${result.totalElements} elements from canvas file`);

        if (result.pageConfig) {
          const { key, width, height, label } = result.pageConfig;
          const existingPreset = PAGE_PRESETS.find(p => p.key === key);
          if (existingPreset) {
            setPageKey(key);
            console.log('Restored page configuration:', key, label);
          } else {
            console.log('Loaded custom page size:', width, 'x', height, label);
            setCanvasSize({ width: parseInt(width), height: parseInt(height) });
            setScale(1);
          }
        }

        if (result.metadata) {
          console.log('Canvas metadata:', result.metadata);
        }
      } else {
        console.error('Failed to load canvas:', result.error);
        toast.error('Failed to load canvas: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading canvas:', error);
      toast.error('Error loading canvas: ' + (error?.message || String(error)));
    }

    event.target.value = '';
  };

  const handleExportCanvas = () => {
    try {
      const jsonString = serializeCanvas(widgets, {
        pretty: true,
        pageKey: pageKey,
        pageWidth: currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width,
        pageHeight: currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height,
        pageLabel: currentPreset.label
      });

      navigator.clipboard.writeText(jsonString).then(() => {
        toast.success('Canvas data copied to clipboard!');
      }).catch(() => {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'canvas-design-export.json';
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting canvas:', error);
      toast.error('Error exporting canvas: ' + (error?.message || String(error)));
    }
  };

  const handleImageClick = (widget) => {
    if (widget.type === 'image') {
      setSelectedImageWidget(widget);
      setShowImageSidebar(true);
    }
  };

  const handleTextClick = (widget) => {
    if (widget.type === 'textbox') {
      setSelectedTextWidget(widget);
      setShowTextSidebar(true);
    }
  };

  const alignActive = (direction) => {
    if (!activeId) return;
    setWidgets((prev) => prev.map((w) => {
      if (w.id !== activeId) return w;
      switch (direction) {
        case 'left': return { ...w, x: 0 };
        case 'center': return { ...w, x: snap(((currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width) - w.width) / 2) };
        case 'right': return { ...w, x: snap((currentPreset.width === 'auto' ? canvasSize.width : currentPreset.width) - w.width) };
        case 'top': return { ...w, y: 0 };
        case 'middle': return { ...w, y: snap(((currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height) - w.height) / 2) };
        case 'bottom': return { ...w, y: snap((currentPreset.height === 'auto' ? canvasSize.height : currentPreset.height) - w.height) };
        default: return w;
      }
    }));
  };

  const hTicks = Array.from({ length: Math.ceil(canvasSize.width / GRID_SIZE) + 1 }, (_, i) => i);
  const vTicks = Array.from({ length: Math.ceil(canvasSize.height / GRID_SIZE) + 1 }, (_, i) => i);

  const handleZoomIn = () => setScale((s) => Math.min(2, parseFloat((s + 0.1).toFixed(2))))
  const handleZoomOut = () => setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))))
  const handleZoomSelect = (e) => setScale(parseFloat(e.target.value))

  return (
    <div className="design-report-page">
      <div className="design-toolbar">
        <div className="toolbar-group">
          <button className="tb-btn" title="New"><FiPlus /></button>
          <button className="tb-btn" title="Save" onClick={handleSaveCanvas}><FiSave /></button>
          <button className="tb-btn" title="Load" onClick={handleLoadCanvas}><FiUpload /></button>
          <button className="tb-btn" title="Export" onClick={handleExportCanvas}><FiDownload /></button>
          <button className="tb-btn" title="Cut"><FiScissors /></button>
          <button className="tb-btn" title="Copy"><FiCopy /></button>
          <button className="tb-btn" title="Delete" onClick={() => activeId && removeWidget(activeId)}><FiTrash2 /></button>
        </div>
        <div className="toolbar-group">
          <button className="tb-btn" title="Undo"><FiRotateCcw /></button>
          <button className="tb-btn" title="Redo"><FiRotateCw /></button>
        </div>
        <div className="toolbar-group">
          <label className="label">Page</label>
          <select className="page-select" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
            {PAGE_PRESETS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          <button className="tb-btn" title="Zoom Out" onClick={handleZoomOut}><FiZoomOut /></button>
          <select className="zoom-select" value={scale} onChange={handleZoomSelect}>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
          </select>
          <button className="tb-btn" title="Zoom In" onClick={handleZoomIn}><FiZoomIn /></button>
        </div>
        <div className="toolbar-group">
          <div className="dropdown">
            <div className="dropdown-menu">
              <button onClick={() => alignActive('left')}>Left</button>
              <button onClick={() => alignActive('center')}>Center</button>
              <button onClick={() => alignActive('right')}>Right</button>
              <hr />
              <button onClick={() => alignActive('top')}>Top</button>
              <button onClick={() => alignActive('middle')}>Middle</button>
              <button onClick={() => alignActive('bottom')}>Bottom</button>
            </div>
          </div>
          <div className="dropdown">
            <div className="dropdown-menu">
              <span className="hint-item">Coming soon</span>
            </div>
          </div>
          <div className="dropdown">
            <div className="dropdown-menu">
              <span className="hint-item">Grid, Rulers</span>
            </div>
          </div>
        </div>
        <div className="toolbar-right">
          <button
            className="tb-btn preview-btn"
            style={{
              background: '#635bff',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 1px 4px 0 rgba(99,91,255,0.10)',
              width: '160px',
              padding: '0 20px',
              fontSize: '14px'
            }}
            onClick={() => setShowPreview(true)}
          >
            <FiEye style={{ marginRight: 10 }} /> Preview
          </button>
        </div>
      </div>

      <div className="work-area">
        <div className="design-sidebar">
          <div className="report-dropdown-container">
            <label htmlFor="report-categories" className="design-sidebar-title">Reports</label>
            <select
              id="report-categories"
              className="report-dropdown"
              value={selectedReportCategory}
              onChange={handleReportCategoryChange}
            >
              <option value="">Select Report</option>
              <option value="financial">Financial Reports</option>
              <option value="sales">Sales Reports</option>
              <option value="inventory">Inventory Reports</option>
              <option value="customer">Customer Reports</option>
              <option value="employee">Employee Reports</option>
              <option value="performance">Performance Reports</option>
              <option value="audit">Audit Reports</option>
              <option value="compliance">Compliance Reports</option>
            </select>
          </div>
          <h3 className="design-sidebar-title">Basic Items</h3>
          <ul className="toolbox">
            {initialToolbox.map((tool) => (
              <li key={tool.type} draggable onDragStart={handleToolDragStart(tool)} onDragEnd={handleToolDragEnd} className={`tool ${draggingTool === tool.type ? 'dragging' : ''}`}>
                {tool.label}
              </li>
            ))}
          </ul>

          <h3 className="design-sidebar-title">Headers & Footers</h3>
          <ul className="toolbox">
            {headerFooterToolbox.map((tool) => (
              <li key={tool.type} draggable onDragStart={handleToolDragStart(tool)} onDragEnd={handleToolDragEnd} className={`tool ${draggingTool === tool.type ? 'dragging' : ''}`}>
                {tool.label}
              </li>
            ))}
          </ul>
          <h3 className="design-sidebar-title">Data</h3>
          <ul className="toolbox">
            <li key="data-table" draggable onDragStart={handleToolDragStart({ type: 'data-table', label: 'Data Table' })} onDragEnd={handleToolDragEnd} className={`tool ${draggingTool === 'data-table' ? 'dragging' : ''}`}>
              Data Table
            </li>
          </ul>
          <div className="hint">Drag an item onto the canvas</div>
        </div>

        <div className="design-canvas-wrapper">
          <div className="canvas-area" style={{ '--ruler-thickness': `${RULER_THICKNESS}px` }}>
            {/* Top Ruler */}
            <div className="ruler horizontal">
              {hTicks.map((i) => {
                const px = i * GRID_SIZE;
                const isMajor = i % LABEL_EVERY_CELLS === 0;
                const isMedium = i % 5 === 0;
                return (
                  <div key={`h-${i}`} className={`tick ${isMajor ? 'major' : isMedium ? 'medium' : 'minor'}`} style={{ left: px }}>
                    {isMajor && <span className="label">{i * GRID_SIZE}</span>}
                  </div>
                );
              })}
            </div>
            {/* Left Ruler */}
            <div className="ruler vertical">
              {vTicks.map((i) => {
                const px = i * GRID_SIZE;
                const isMajor = i % LABEL_EVERY_CELLS === 0;
                const isMedium = i % 5 === 0;
                return (
                  <div key={`v-${i}`} className={`tick ${isMajor ? 'major' : isMedium ? 'medium' : 'minor'}`} style={{ top: px }}>
                    {isMajor && <span className="label">{i * GRID_SIZE}</span>}
                  </div>
                );
              })}
            </div>

            <div
              ref={canvasRef}
              className="design-canvas"
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              style={{ width: currentPreset.width === 'auto' ? '100%' : currentPreset.width, height: currentPreset.height === 'auto' ? '100%' : currentPreset.height }}
            >
              <div className="canvas-zoom" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {widgets.map((w) => (
                  <div key={w.id} className={`widget ${w.type} ${activeId === w.id ? 'active' : ''}`} style={{ left: w.x, top: w.y, width: w.width, height: w.height, transform: `rotate(${w.rotation || 0}deg)`, transformOrigin: 'center' }} onMouseDown={() => { setActiveId(w.id); if (w.type === 'image') { setSelectedImageWidget(w); setShowImageSidebar(true); } else if (w.type === 'textbox') { setSelectedTextWidget(w); setShowTextSidebar(true); } }}>
                    {/* Move handle */}
                    {activeId === w.id && (
                      <button className="move-handle" title="Move" onMouseDown={(e) => startMove(w.id, e)}>
                        <FiMove size={14} />
                      </button>
                    )}
                    {/* Rotation handle */}
                    {activeId === w.id && (
                      <button className="rotate-handle" title="Rotate" onMouseDown={(e) => startRotate(w.id, e)}>
                        <FiRotateCw size={14} />
                      </button>
                    )}
                    {w.type === 'textbox' && (
                      <textarea
                        className="widget-textarea"
                        value={w.text}
                        onChange={(e) => handleTextChange(w.id, e.target.value)}
                        style={{
                          fontFamily: w.fontFamily || 'Arial',
                          fontSize: `${w.fontSize || 16}px`,
                          fontWeight: w.fontWeight || 'normal',
                          fontStyle: w.fontStyle || 'normal',
                          textDecoration: w.textDecoration || 'none',
                          color: w.textColor || '#000000',
                          backgroundColor: w.backgroundColor || 'transparent',
                          textAlign: w.textAlign || 'left',
                          lineHeight: w.lineHeight || 1.5,
                          letterSpacing: `${w.letterSpacing || 0}px`,
                          border: w.borderWidth > 0 ? `${w.borderWidth}px solid ${w.borderColor}` : 'none',
                          borderRadius: `${w.borderRadius || 0}px`,
                          boxShadow: w.shadow !== 'none' ?
                            (w.shadow === 'custom' ?
                              `${w.shadowOffsetX}px ${w.shadowOffsetY}px ${w.shadowBlur}px ${w.shadowColor}` :
                              (w.shadow === 'small' ? '0 1px 3px rgba(0,0,0,0.12)' :
                                w.shadow === 'medium' ? '0 4px 6px rgba(0,0,0,0.1)' :
                                  '0 10px 15px rgba(0,0,0,0.1)')) : 'none',
                          opacity: (w.opacity || 100) / 100
                        }}
                      />
                    )}
                    {w.type === 'rectangle' && <div className="rectangle-shape" />}
                    {w.type === 'line' && <div className="line-shape" />}
                    {w.type === 'dashline' && <div className="dashline-shape" />}
                    {w.type === 'image' && (
                      w.imageSrc ? (
                        <img
                          src={w.imageSrc}
                          alt={w.altText || 'Image'}
                          style={{
                            opacity: w.opacity / 100,
                            border: w.borderWidth > 0 ? `${w.borderWidth}px solid ${w.borderColor}` : 'none',
                            borderRadius: `${w.borderRadius}px`,
                            boxShadow: w.shadow !== 'none' ?
                              (w.shadow === 'custom' ?
                                `${w.shadowOffsetX}px ${w.shadowOffsetY}px ${w.shadowBlur}px ${w.shadowColor}` :
                                (w.shadow === 'small' ? '0 1px 3px rgba(0,0,0,0.12)' :
                                  w.shadow === 'medium' ? '0 4px 6px rgba(0,0,0,0.1)' :
                                    '0 10px 15px rgba(0,0,0,0.1)')) : 'none',
                            filter: w.filter !== 'none' ? `${w.filter}(${w.filterIntensity}%)` : 'none',
                            objectFit: w.objectFit || 'fill',
                            width: '100%',
                            height: '100%'
                          }}
                          className="image-widget"
                        />
                      ) : (
                        <div className="image-placeholder">Image</div>
                      )
                    )}
                    {w.type === 'header' && (
                      <div className="header-placeholder">
                        <div className="widget-dropdown">
                          <button className="dropdown-toggle">Header ▼</button>
                          <div className="dropdown-content">
                            <button className="dropdown-item">Existing Headers</button>
                            <button className="dropdown-item add-new">+ Add Header</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {w.type === 'footer' && (
                      <div className="footer-placeholder">
                        <div className="widget-dropdown">
                          <button className="dropdown-toggle">Footer ▼</button>
                          <div className="dropdown-content">
                            <button className="dropdown-item">Existing Footers</button>
                            <button className="dropdown-item add-new">+ Add Footer</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {w.type === 'data-table' && (
                      <div className="data-table-placeholder">
                        <table>
                          <thead>
                            <tr>
                              <th>Header 1</th>
                              <th>Header 2</th>
                              <th>Header 3</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Data 1</td>
                              <td>Data 2</td>
                              <td>Data 3</td>
                            </tr>
                            <tr>
                              <td>Data 4</td>
                              <td>Data 5</td>
                              <td>Data 6</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Resize handles */}
                    {activeId === w.id && (
                      <>
                        <div className="rz rz-nw" onMouseDown={(e) => startResizeDir(w.id, 'nw', e)} />
                        <div className="rz rz-n" onMouseDown={(e) => startResizeDir(w.id, 'n', e)} />
                        <div className="rz rz-ne" onMouseDown={(e) => startResizeDir(w.id, 'ne', e)} />
                        <div className="rz rz-e" onMouseDown={(e) => startResizeDir(w.id, 'e', e)} />
                        <div className="rz rz-se" onMouseDown={(e) => startResizeDir(w.id, 'se', e)} />
                        <div className="rz rz-s" onMouseDown={(e) => startResizeDir(w.id, 's', e)} />
                        <div className="rz rz-sw" onMouseDown={(e) => startResizeDir(w.id, 'sw', e)} />
                        <div className="rz rz-w" onMouseDown={(e) => startResizeDir(w.id, 'w', e)} />
                      </>
                    )}
                    {/* Coordinate Label */}
                    <div className="coordinate-label">
                      ({Math.round(w.x + w.width)}, {Math.round(w.y + w.height)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Preview: Only grid/ruler/canvas, no sidebar/toolbar */}
      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" style={{ padding: 0, background: '#f5f5f5' }} onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span>Grid Preview</span>
              <button className="close-btn" onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <div className="preview-canvas" style={{ width: canvasSize.width, height: canvasSize.height, background: '#fff', margin: 0 }}>
              {/* Render rulers and widgets only, no sidebar or toolbar */}
              {/* Top Ruler */}
              <div className="ruler horizontal">
                {hTicks.map((i) => {
                  const px = i * GRID_SIZE;
                  const isMajor = i % LABEL_EVERY_CELLS === 0;
                  const isMedium = i % 5 === 0;
                  return (
                    <div key={`h-${i}`} className={`tick ${isMajor ? 'major' : isMedium ? 'medium' : 'minor'}`} style={{ left: px }}>
                      {isMajor && <span className="label">{i * GRID_SIZE}</span>}
                    </div>
                  );
                })}
              </div>
              {/* Left Ruler */}
              <div className="ruler vertical">
                {vTicks.map((i) => {
                  const px = i * GRID_SIZE;
                  const isMajor = i % LABEL_EVERY_CELLS === 0;
                  const isMedium = i % 5 === 0;
                  return (
                    <div key={`v-${i}`} className={`tick ${isMajor ? 'major' : isMedium ? 'medium' : 'minor'}`} style={{ top: px }}>
                      {isMajor && <span className="label">{i * GRID_SIZE}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="canvas-zoom" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '100%', height: '100%', position: 'relative' }}>
                {widgets.map((w) => (
                  <div key={`quick-${w.id}`} className={`widget ${w.type}`} style={{ left: w.x, top: w.y, width: w.width, height: w.height, transform: `rotate(${w.rotation || 0}deg)`, transformOrigin: 'center' }}>
                    {w.type === 'textbox' && <div className="text-preview">{w.text}</div>}
                    {w.type === 'rectangle' && <div className="rectangle-shape" />}
                    {w.type === 'line' && <div className="line-shape" />}
                    {w.type === 'image' && <div className="image-placeholder">Image</div>}
                    {w.type === 'header' && <div className="header-placeholder">Header</div>}
                    {w.type === 'footer' && <div className="footer-placeholder">Footer</div>}
                    {w.type === 'data-table' && <div className="data-table-placeholder">Data Table</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ImagePropertiesSidebar
        isOpen={showImageSidebar}
        widget={selectedImageWidget}
        onClose={handleImageClose}
        onSave={handleImageSave}
        onPropertyChange={handleImagePropertyChange}
      />
      <TextPropertiesSidebar
        widget={selectedTextWidget}
        onClose={handleTextClose}
        onSave={handleTextSave}
        onPropertyChange={handleTextPropertyChange}
      />
      <ToastContainer />
    </div>
  );
}

// Utility functions
const toAccessorKey = (name) => name.replace(/\./g, '__');
const fromAccessorKey = (accessor) => accessor.replace(/__+/g, '.');

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (let p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'report';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const SearchField = ({
  id,
  columns,
  selectedColumns,
  onColumnSelect,
  onValueChange,
  onRemove,
  value = '',
  column = '',
  onRealtimeFilterChange,
  distinctValues = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const availableColumns = useMemo(() => {
    return columns.filter(col => !selectedColumns.includes(col.accessorKey) || col.accessorKey === column);
  }, [columns, selectedColumns, column]);

  const columnType = useMemo(() => {
    const col = columns.find(c => c.accessorKey === column);
    if (!col) return 'text';
    if (/(date|dt|time)/i.test(col.accessorKey)) return 'date';
    if (/(qty|quantity|amount|price|total|debit|credit|value)/i.test(col.accessorKey)) return 'number';
    return 'text';
  }, [column, columns]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (column && inputRef.current) {
      inputRef.current.focus();
    }
  }, [column]);

  const handleColumnSelect = (col) => {
    onColumnSelect(id, col);
    setIsOpen(false);
  };

  const handleClear = () => {
    onValueChange(id, '');
  };

  return (
    <div className="search-field-container">
      <div className="search-field-header">
        <div
          ref={dropdownRef}
          className={`column-selector ${isOpen ? 'is-open' : ''} ${column ? 'has-selection' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          tabIndex="0"
          role="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={column || 'Select column to search'}
        >
          <span className="selector-value">
            {column ? columns.find(c => c.accessorKey === column)?.header : 'Select column...'}
          </span>
          <span className="dropdown-arrow">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          {isOpen && (
            <div className="column-dropdown" role="listbox">
              {availableColumns.map(col => (
                <div
                  key={col.accessorKey}
                  className={`dropdown-option ${col.accessorKey === column ? 'is-selected' : ''}`}
                  onClick={() => handleColumnSelect(col.accessorKey)}
                  role="option"
                  aria-selected={col.accessorKey === column}
                >
                  <span className="option-text">{col.header}</span>
                  {col.accessorKey === column && (
                    <span className="checkmark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {column && (
          <button
            className="remove-field-button"
            onClick={() => onRemove(id)}
            aria-label="Remove search field"
          >
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {column && (
        <div className="search-input-container">
          {distinctValues && distinctValues.length > 0 ? (
            <select
              ref={inputRef}
              value={value}
              onChange={(e) => {
                onValueChange(id, e.target.value);
                if (onRealtimeFilterChange) {
                  onRealtimeFilterChange(id, column, e.target.value);
                }
              }}
              className="search-input"
              aria-label={`Select ${columns.find(c => c.accessorKey === column)?.header}`}
            >
              <option value="">Select a value...</option>
              {distinctValues.map((val, index) => (
                <option key={index} value={val}>
                  {val}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef}
              type={columnType}
              value={value}
              onChange={(e) => {
                onValueChange(id, e.target.value);
                if (onRealtimeFilterChange) {
                  onRealtimeFilterChange(id, column, e.target.value);
                }
              }}
              placeholder={`Search in ${columns.find(c => c.accessorKey === column)?.header}...`}
              className="search-input"
              aria-label={`Search in ${column}`}
            />
          )}

          {value && (
            <button
              className="clear-search-button"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const getNestedValue = (obj, path) => {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

const populatePlaceholders = (text, data) => {
  if (!text || !data) {
    return text;
  }
  return text.replace(/{([^}]+)}/g, (match, key) => {
    let value = getNestedValue(data, key.trim());
    if (typeof value === 'string' && moment(value, moment.ISO_8601, true).isValid()) {
      value = moment(value).format('YYYY-MM-DD');
    }
    return value !== undefined ? value : match;
  });
};

// ReportPage Component
export function ReportPage() {
  const { reportId } = useParams();

  // State declarations
  const [logo, setLogo] = useState(null);
  const [isLogoEnabled, setIsLogoEnabled] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [fullScreenLogo, setFullScreenLogo] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [reportConfig, setReportConfig] = useState(null);
  const [sqlQueryPlaceholders, setSqlQueryPlaceholders] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [tableData, setTableData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isSummaryPreview, setIsSummaryPreview] = useState(false);

  const [headings, setHeadings] = useState([
    { content: 'Report Title', id: 1, include: true },
    { content: 'Subtitle', id: 2, include: true }
  ]);
  const [footer, setFooter] = useState('');
  const [includeFooter, setIncludeFooter] = useState(true);

  const [searchFields, setSearchFields] = useState([]);
  const [distinctValuesMap, setDistinctValuesMap] = useState({});
  const [isLoadingDistinctValues, setIsLoadingDistinctValues] = useState(false);
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const storedFilters = localStorage.getItem('savedReportFilters');
      return storedFilters ? JSON.parse(storedFilters) : [];
    } catch (error) {
      console.error("Failed to parse saved filters from localStorage", error);
      return [];
    }
  });

  const [previewData, setPreviewData] = useState([]);
  const [previewDataSummary, setPreviewDataSummary] = useState([]);

  const [columnOrder, setColumnOrder] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genarateDone, setGenarateDone] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Show toast notifications for ReportPage error/success
  useEffect(() => {
    if (error) {
      toast.error(String(error), { position: 'top-right', autoClose: 4000 });
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success(String(success), { position: 'top-right', autoClose: 3000 });
    }
  }, [success]);

  const exportButtonRef = useRef(null);
  const columnFilterRef = useRef(null);

  const BACKEND_THRESHOLD = 1000;
  const DATE_RANGE_BACKEND_MS = 365 * 24 * 60 * 60 * 1000;

  let globalRes = null;

  const handleSaveFilters = () => {
    const newSavedFilter = {
      id: Date.now(),
      name: `Saved Filter ${savedFilters.length + 1}`,
      filters: searchFields,
      timestamp: new Date().toISOString(),
    };
    const updatedSavedFilters = [...savedFilters, newSavedFilter];
    setSavedFilters(updatedSavedFilters);
    localStorage.setItem('savedReportFilters', JSON.stringify(updatedSavedFilters));
    setSuccess('Filter settings saved successfully!');
  };

  const applySavedFilter = (filters) => {
    setSearchFields(filters);
    setSuccess('Saved filter applied successfully!');
  };

  const deleteSavedFilter = (id) => {
    const updatedSavedFilters = savedFilters.filter(filter => filter.id !== id);
    setSavedFilters(updatedSavedFilters);
    localStorage.setItem('savedReportFilters', JSON.stringify(updatedSavedFilters));
    setSuccess('Saved filter deleted successfully!');
  };

  const handlePreviewReport = async () => {
    setIsSummaryPreview(false);
    setError(null);
    setIsLoadingData(true);
    try {
      let json;
      if (genarateDone && globalRes) {
        json = globalRes;
      } else {
        json = await get(`/dynamic-ui/table_data/${reportId}`);
      }

      const rows = json.table_data || json.data || [];
      console.log("rows", rows);

      const mappedRows = rows.map(r => {
        const mapped = {};
        const useFields = (reportConfig?.fields?.include && reportConfig.fields.include.length) ? reportConfig.fields.include : Object.keys(r);
        useFields.forEach(f => {
          const originalName = typeof f === 'string' ? f : (f.name || '');
          const accessor = toAccessorKey(originalName);
          const val = getValueByPath(r, originalName) ?? r[originalName] ?? (() => {
            return r[accessor] ?? '';
          })();
          mapped[accessor] = val;
        });
        Object.keys(r).forEach(k => {
          const accessor = toAccessorKey(k);
          if (!(accessor in mapped)) mapped[accessor] = r[k];
        });
        return mapped;
      });
      console.log("mappedRows for normal", mappedRows);
      setPreviewData(mappedRows);
      setShowPreviewModal(true);

    } catch (err) {
      console.error('Preview fetch error', err);
      setError(err.message || 'Failed to fetch preview data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePreviewReportSummary = async () => {
    setError(null);
    setIsLoadingData(true);
    try {
      let json;
      if (genarateDone && globalRes) {
        json = globalRes;
      } else {
        json = await get(`/dynamic-ui/table_data/${reportId}`);
      }

      const rows = json.table_data || json.data || [];
      console.log("rows", rows);

      const aggregatedData = new Map();

      rows.forEach(row => {
        const savingsTypeName = row['Savings Type Name'];
        const balance = parseFloat(row['Balance']) || 0;
        const interestRateMax = parseFloat(row['Interest Rate (Max)']) || 0;

        if (aggregatedData.has(savingsTypeName)) {
          const existingEntry = aggregatedData.get(savingsTypeName);
          existingEntry['Total Balance'] += balance;
        } else {
          aggregatedData.set(savingsTypeName, {
            'Savings Type Name': savingsTypeName,
            'Interest Rate (Max)': interestRateMax,
            'Total Balance': balance,
          });
        }
      });

      const finalData = Array.from(aggregatedData.values());

      const mappedRows = finalData.map(r => {
        const mapped = {};
        const useFields = [
          'Savings Type Name',
          'Interest Rate (Max)',
          'Total Balance',
        ];

        useFields.forEach(originalName => {
          const accessor = toAccessorKey(originalName);
          mapped[accessor] = r[originalName];
        });

        return mapped;
      });
      console.log("mappedRowsfor summary", mappedRows);
      setPreviewData(mappedRows);
      setShowPreviewModal(true);
      setIsSummaryPreview(true);

    } catch (err) {
      console.error('Preview fetch error', err);
      setError(err.message || 'Failed to fetch preview data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const cfg = await get(`/dynamic-ui/config/${reportId}`);
        console.log("Report config:", cfg.config);

        if (!isMounted) return;
        setReportConfig(cfg);

        const extractPlaceholders = (text) => {
          const matches = text.matchAll(/{([^}]+)}/g);
          return Array.from(matches).map(match => match[1].trim());
        };

        let extracted = [];
        if (cfg?.config?.heading) {
          extracted = extracted.concat(extractPlaceholders(cfg.config.heading));
        }
        if (cfg?.config?.subHeading) {
          extracted = extracted.concat(extractPlaceholders(cfg.config.subHeading));
        }
        setSqlQueryPlaceholders(extracted);

        if (cfg?.config?.Logo) {
          setLogo(cfg.config.Logo);
          setIsLogoEnabled(true);
        }

        const includeFields = (cfg?.fields?.include || []).map(f => {
          const name = typeof f === 'string' ? f : (f.name || '');
          const accessorKey = toAccessorKey(name);
          return {
            accessorKey,
            header: (name.split('.').slice(-1)[0] || name).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            enableColumnOrdering: false,
            enableHiding: !!(typeof f === 'object' && f.isRemovable),
          };
        });

        setColumns(includeFields);
        setColumnOrder(includeFields.map(c => c.accessorKey));

        const initialVisibility = {};
        includeFields.forEach(c => initialVisibility[c.accessorKey] = true);
        setColumnVisibility(initialVisibility);

        const newHeadings = [];

        if (cfg?.config?.heading) {
          newHeadings.push({
            id: 'main-heading',
            content: cfg.config.heading,
            include: true
          });
        }

        if (cfg?.config?.subHeading) {
          newHeadings.push({
            id: 'sub-heading',
            content: cfg.config.subHeading,
            include: true
          });
        }

        if (Array.isArray(cfg.headings) && cfg.headings.length) {
          setHeadings(cfg.headings.map((h, idx) => ({
            id: idx + 1,
            content: h.text || h || '',
            include: (typeof h.include === 'boolean') ? h.include : true,
            meta: h
          })));
        } else if (newHeadings.length > 0) {
          setHeadings(newHeadings);
        }

        console.log("footerrr", cfg.config.footer);
        if (cfg.config.footer) {
          console.log(cfg.config.footer);
          setFooter(cfg.config.footer);
        }

        if (Array.isArray(cfg?.fields?.search) && cfg.fields.search.length) {
          const sf = cfg.fields.search.map((f, idx) => {
            const name = typeof f === 'string' ? f : (f.name || '');
            return { id: String(idx + 1), column: toAccessorKey(name), value: '' };
          });
          setSearchFields(sf.length ? sf : [{ id: '1', column: '', value: '' }]);
        }

      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load report config.');
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    };

    loadConfig();
    return () => { isMounted = false; };
  }, [reportId]);

  const fetchDistinctValues = useCallback(async (columnName) => {
    if (!columnName) return;
    try {
      const json = await get(`/dynamic-ui/distinct_values/1?column=${columnName}`);
      setDistinctValuesMap(prev => ({ ...prev, [columnName]: json.distinctValues || [] }));
    } catch (err) {
      console.error(`Error fetching distinct values for ${columnName}:`, err);
      setError(err.message || `Failed to fetch distinct values for ${columnName}`);
    }
  }, []);

  const fetchData = useCallback(async (options = {}, cfg = null) => {
    setIsLoadingData(true);
    setError(null);

    try {
      const configToUse = cfg || reportConfig;
      const payload = {
        filters: options.filters || {},
        pageIndex: options.pageIndex ?? pagination.pageIndex,
        pageSize: options.pageSize ?? pagination.pageSize,
        sorting: options.sorting || sorting,
        columnOrder: options.columnOrder || columnOrder,
      };

      const convertedFilters = {};
      for (const k of Object.keys(payload.filters || {})) {
        const original = fromAccessorKey(k);
        convertedFilters[original] = payload.filters[k];
      }
      payload.filters = convertedFilters;

      const json = await get(`/dynamic-ui/table_data/${reportId}`);
      globalRes = json;
      console.log("json", json);

      let rows = [];
      let total = 0;
      if (Array.isArray(json)) {
        rows = json;
        total = json.length;
      } else {
        rows = json.table_data || json.data || [];
        total = typeof json.total === 'number' ? json.total : rows.length;
      }
      console.log("rows", rows);
      console.log("reportConfig", reportConfig);

      if ((!columns || columns.length === 0) && rows.length > 0) {
        const inferred = Object.keys(rows[0]).map(k => {
          const header = (k.split('.').slice(-1)[0] || k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const fieldConfig = reportConfig.fields?.include?.find(include => include.name === header);
          const isRemovable = fieldConfig ? fieldConfig.isRemovable : true;
          return {
            accessorKey: toAccessorKey(k),
            header: header,
            enableColumnOrdering: true,
            enableHiding: isRemovable,
            isRemovable: isRemovable,
          };
        });
        const filteredInferred = inferred.filter(col => !sqlQueryPlaceholders.includes(fromAccessorKey(col.accessorKey)));
        setColumns(filteredInferred);
        console.log("filteredInferred", filteredInferred);
        const initialVisibility = {};
        filteredInferred.forEach(c => initialVisibility[c.accessorKey] = true);
        setColumnVisibility(initialVisibility);
        setColumnOrder(filteredInferred.map(c => c.accessorKey));
      }

      const mappedRows = rows.map(r => {
        const mapped = {};
        const useFields = (reportConfig?.fields?.include && reportConfig.fields.include.length) ? reportConfig.fields.include : Object.keys(r);
        useFields.forEach(f => {
          const originalName = typeof f === 'string' ? f : (f.name || '');
          const accessor = toAccessorKey(originalName);
          const val = getValueByPath(r, originalName) ?? r[originalName] ?? (() => {
            return r[accessor] ?? '';
          })();
          mapped[accessor] = val;
        });

        Object.keys(r).forEach(k => {
          const accessor = toAccessorKey(k);
          if (!(accessor in mapped)) mapped[accessor] = r[k];
        });

        return mapped;
      });

      const formattedRows = mappedRows.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          if (typeof newRow[key] === 'string' && moment(newRow[key], moment.ISO_8601, true).isValid()) {
            newRow[key] = moment(newRow[key]).format('YYYY-MM-DD');
          }
        }
        return newRow;
      });

      console.log("Formatted Rows:", formattedRows);
      setTableData(formattedRows);
      setTotalRows(total);
      return mappedRows;
    } catch (err) {
      console.error('fetchData error', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoadingData(false);
    }
  }, [reportConfig, columnOrder, columns, pagination.pageSize, pagination.pageIndex, sorting, reportId, sqlQueryPlaceholders]);

  const buildFilterPayloadFromSearchFields = () => {
    const payload = {};
    searchFields.forEach(f => {
      if (f.column && f.value !== undefined && f.value !== '') {
        payload[f.column] = f.value;
      }
    });
    return payload;
  };

  const getSelectedColumns = (currentId) => {
    return searchFields
      .filter(field => field.id !== currentId && field.column)
      .map(field => field.column);
  };

  const addSearchField = () => {
    const newId = Date.now().toString();
    setSearchFields(prev => [...prev, { id: newId, column: '', value: '' }]);
  };
  const removeSearchField = (id) => {
    if (searchFields.length > 1) {
      setSearchFields(prev => prev.filter(f => f.id !== id));
    }
  };

  const resetSearchFields = () => {
    setSearchFields([]);
    setError(null);
    setSuccess(null);
  };
  const handleColumnSelect = (id, column) => {
    setSearchFields(prev => prev.map(f => f.id === id ? { ...f, column, value: '' } : f));
    fetchDistinctValues(column);
  };
  const handleValueChange = (id, value) => {
    setSearchFields(prev => {
      const updatedFields = prev.map(f => f.id === id ? { ...f, value } : f);
      applyFilters(updatedFields);
      return updatedFields;
    });
  };

  const isBackendFilterPreferred = (currentSearchFields = searchFields) => {
    if (totalRows >= BACKEND_THRESHOLD) return true;

    const dateField = currentSearchFields.find(sf => /date/i.test(sf.column || '') && sf.value);
    if (dateField && typeof dateField.value === 'string') {
      const v = dateField.value;
      const parts = v.split(/[-|,;]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        try {
          const d0 = new Date(parts[0]), d1 = new Date(parts[1]);
          if (!isNaN(d0) && !isNaN(d1) && (d1 - d0) > DATE_RANGE_BACKEND_MS) return true;
        } catch (e) { }
      }
    }

    return false;
  };

  const applyFilters = async (currentSearchFields = searchFields) => {
    setError(null);
    setSuccess(null);

    const filtersPayload = currentSearchFields.reduce((acc, f) => {
      if (f.column && f.value !== undefined && f.value !== '') {
        acc[f.column] = f.value;
      }
      return acc;
    }, {});

    const backendPreferred = isBackendFilterPreferred(currentSearchFields);

    if (backendPreferred) {
      setIsLoadingData(true);
      try {
        const fetchOptions = Object.keys(filtersPayload).length > 0 ? {
          pageIndex: 0,
          pageSize: pagination.pageSize,
          filters: filtersPayload,
          sorting,
          columnOrder,
        } : {
          pageIndex: 0,
          pageSize: pagination.pageSize,
          sorting,
          columnOrder,
        };
        await fetchData(fetchOptions);
        setPagination(p => ({ ...p, pageIndex: 0 }));
      } catch (err) {
        console.error(err);
        setError(err.message || 'Server filtering failed');
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleExport = async (format) => {
    setShowExportDropdown(false);
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, headers } = getExportableData();

      switch (format) {
        case 'csv':
          break;

        case 'xlsx':
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
          XLSX.writeFile(workbook, `report_${new Date().toISOString().slice(0, 10)}.xlsx`);
          break;

        case 'pdf':
          const doc = new jsPDF();
          autoTable(doc, {
            head: [headers],
            body: data.map(Object.values),
          });
          doc.save(`report_${new Date().toISOString().slice(0, 10)}.pdf`);
          break;

        case 'doc':
          const htmlTable = `
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr>
                    ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          const blob = new Blob([htmlTable], { type: 'application/msword' });
          saveAs(blob, `report_${new Date().toISOString().slice(0, 10)}.doc`);
          break;

        default:
          throw new Error('Unsupported export format');
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Export failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = async () => {
    setGenarateDone(false)
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const fetchedData = await fetchData({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        filters: buildFilterPayloadFromSearchFields(),
        columnOrder,
      });
      const firstRowData = fetchedData.length > 0 ? fetchedData[0] : {};

      const updatedHeadings = headings.map(h => ({
        ...h,
        content: populatePlaceholders(h.content, firstRowData)
      }));

      setHeadings(updatedHeadings);

      const updatedFooter = populatePlaceholders(footer, firstRowData);
      setFooter(updatedFooter);

      setGenarateDone(true)

      return {
        fetchedData,
        updatedHeadings,
        updatedFooter
      };

    } catch (err) {
      console.error(err);
      setError(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  let getExportableData = () => {
    const dataToExport = filteredData || tableData;

    const visibleColumns = columnOrder
      .map(key => columns.find(c => c.accessorKey === key))
      .filter(c => columnVisibility[c.accessorKey]);

    const formattedData = dataToExport.map(row => {
      const newRow = {};
      visibleColumns.forEach(col => {
        newRow[col.header] = row[col.accessorKey];
      });
      return newRow;
    });

    return {
      data: formattedData,
      headers: visibleColumns.map(col => col.header),
    };
  };

  useEffect(() => {
    const syncWidths = () => {
      const tableCard = document.querySelector('.table-card');
      const searchCard = document.querySelector('.search-card');
      const headercard = document.querySelector('.headings-card');

      if (tableCard && searchCard) {
        const tableCardWidth = tableCard.offsetWidth;
        searchCard.style.width = `${tableCardWidth}px`;
        searchCard.style.maxWidth = '100%';
      }
    };
    syncWidths();
    const handleResize = () => syncWidths();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(event.target)) {
        setShowColumnFilter(false);
      }
      if (exportButtonRef.current && !exportButtonRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    if (showColumnFilter || showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnFilter, showExportDropdown]);

  const availableColumns = useMemo(() => {
    return columns;
  }, [columns]);

  const filteredData = useMemo(() => {
    if (isBackendFilterPreferred()) return tableData;

    if (!searchFields || searchFields.length === 0) return tableData;

    return tableData.filter(row => {
      return searchFields.every(field => {
        if (!field.column || !field.value) return true;
        const cellValue = String(row[field.column] ?? '').trim();
        const searchValue = String(field.value).trim();
        return cellValue.startsWith(searchValue);
      });
    });
  }, [tableData, searchFields, reportConfig, columns, isBackendFilterPreferred]);

  useEffect(() => {
    if (!columns || columns.length === 0) return;
    setColumnVisibility(prev => {
      const next = { ...prev };
      columns.forEach(c => {
        if (!(c.accessorKey in next)) next[c.accessorKey] = true;
      });
      return next;
    });
  }, [columns]);

  useEffect(() => {
    const handler = setTimeout(() => {
      applyFilters(searchFields);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchFields, applyFilters]);

  if (isLoadingConfig) {
    return (
      <div className="report-page">
        <div className="loading">Loading report configuration...</div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <ToastContainer />

      {showPreviewModal && createPortal(
        <div className="preview-modal-overlay">
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h4>Report Preview</h4>
              <button className="preview-modal-close" onClick={() => setShowPreviewModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="preview-modal-body">

              {Array.from({ length: Math.ceil(filteredData.length / 12) }, (_, pageIndex) => {
                const pageData = filteredData.slice(pageIndex * 12, pageIndex * 12 + 12);

                return (
                  <div key={pageIndex} className="preview-page">

                    {pageIndex === 0 && (
                      <div className="preview-headings">
                        <div className="heading-row">
                          <div className="heading-texts">
                            {headings.filter(h => h.include).map((heading, index) => (
                              <h1 key={index}>
                                {populatePlaceholders(heading.content, previewData[0])}
                              </h1>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="preview-table-container">
                      <MaterialReactTable
                        columns={columns}
                        data={(pageData || tableData)}
                        state={{
                          columnVisibility,
                          columnOrder,
                          sorting,
                        }}
                        enableColumnOrdering={false}
                        enableColumnResizing={false}
                        enableColumnActions={false}
                        enablePagination={false}
                        enableGlobalFilter={false}
                        enableColumnFilters={false}
                        enableBottomToolbar={false}
                        enableTopToolbar={false}
                        enableDensityToggle={false}
                        enableHiding={false}
                        enableFullScreenToggle={false}
                        enableStickyHeader={false}
                        initialState={{
                          columnVisibility,
                          columnOrder,
                          sorting,
                          columnSizing: {},
                        }}
                        muiTableBodyCellProps={{
                          sx: {
                            borderRight: '1px solid #ccc',
                            '&:last-of-type': { borderRight: 'none' },
                          },
                        }}
                        muiTableHeadCellProps={{
                          sx: {
                            borderRight: '1px solid #ccc',
                            '&:last-of-type': { borderRight: 'none' },
                          },
                        }}
                        muiTableContainerProps={{
                          sx: {
                            maxHeight: 'none',
                            overflowY: 'visible',
                          },
                        }}
                      />
                    </div>

                    <div className="preview-footer">
                      <div className="footer-content">
                        {includeFooter && footer}
                        <div className="page-number">
                          Page {pageIndex + 1} of {Math.ceil(previewData.length / 12)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showLogoModal && fullScreenLogo && (
        <div className="logo-modal-overlay" onClick={() => setShowLogoModal(false)}>
          <div className="logo-modal" onClick={e => e.stopPropagation()}>
            <button className="logo-modal-close" onClick={() => setShowLogoModal(false)}>
              <FaTimes size={20} />
            </button>
            <img src={fullScreenLogo} alt="Full Screen Logo" className="logo-modal-image" />
          </div>
        </div>
      )}


      {isLogoEnabled && logo && (
        <div className="logo-card">
          <img src={logo} alt="Company Logo" className="logo-preview" />
          <button onClick={() => {
            setFullScreenLogo(logo);
            setShowLogoModal(true);
          }} className="logo-preview-button">
            Preview Logo
          </button>
        </div>
      )}

      <div className="headings-card">
        <div className="header-section">
          <div className="header-actions">
            <h3 className="section-title">Report Headings</h3>
            {headings.length < 3 && (
              <button
                type="button"
                onClick={() => {
                  setHeadings([...headings, { id: Date.now(), content: '', include: true }]);
                }}
                className="add-heading-button"
                disabled={headings.length >= 3}
              >
                <FaPlus /> Add Heading
              </button>
            )}
          </div>

          <div className="headings-container">
            {headings.map((heading, index) => (
              <div key={heading.id} className="heading-item">
                <div className="heading-checkbox">
                  <input
                    type="checkbox"
                    id={`heading-${heading.id}`}
                    checked={heading.include}
                    onChange={() => {
                      const updated = [...headings];
                      updated[index].include = !updated[index].include;
                      setHeadings(updated);
                    }}
                    className="hidden-checkbox"
                  />
                  <label htmlFor={`heading-${heading.id}`}>
                    {heading.include ? (
                      <FaCheckSquare className="checked-icon" />
                    ) : (
                      <FaRegSquare className="unchecked-icon" />
                    )}
                  </label>
                </div>
                <div className="heading-editor-wrapper">
                  <HeadingEditor
                    showToolbar={false}
                    value={genarateDone && globalRes ? populatePlaceholders(heading.content, globalRes) : heading.content}
                    onChange={(content) => {
                      const updated = [...headings];
                      updated[index].content = content;
                      setHeadings(updated);
                    }}
                    onRemove={headings.length > 1 ? () => {
                      setHeadings(headings.filter((_, i) => i !== index));
                    } : null}
                    placeholder={`Heading ${index + 1} (Click to edit)`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-content show">
          <div className="search-card">
            <div className="search-card-header">
              <h3 className="search-card-title">Search Filters</h3>
              <div className="search-header-actions">
                <button
                  onClick={resetSearchFields}
                  className="reset-search-fields"
                  aria-label="Reset all search fields"
                  title="Reset all search filters"
                >
                  <span>↻</span>
                </button>
                {searchFields.length < availableColumns.length && (
                  <button
                    onClick={addSearchField}
                    className="add-search-field"
                    aria-label="Add search field"
                  >
                    <span>+</span>
                    <span>Add Search Field</span>
                  </button>
                )}
              </div>
            </div>

            <div className="search-input-group">
              <div className="search-fields-row">
                {searchFields.map((field) => (
                  <SearchField
                    key={field.id}
                    id={field.id}
                    columns={availableColumns}
                    selectedColumns={getSelectedColumns(field.id)}
                    onColumnSelect={handleColumnSelect}
                    onValueChange={handleValueChange}
                    onRemove={removeSearchField}
                    column={field.column}
                    value={field.value}
                    distinctValues={distinctValuesMap[field.column] || []}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-section">
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Report Data</h3>
            <div className="table-actions">
              <div className="column-filter" ref={columnFilterRef}>
                <button
                  className="filter-dropdown-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnFilter(!showColumnFilter);
                  }}
                >
                  <FiFilter /> Columns
                </button>
                {showColumnFilter && (
                  <div className="column-dropdown">
                    {columns.filter(column => column.enableHiding).map((column) => (
                      <div key={column.accessorKey} className="filter-dropdown-item">
                        <input
                          type="checkbox"
                          id={`col-${column.accessorKey}`}
                          checked={!!columnVisibility[column.accessorKey]}
                          onChange={() => {
                            setColumnVisibility(prev => ({
                              ...prev,
                              [column.accessorKey]: !prev[column.accessorKey],
                            }));
                          }}
                        />
                        <label htmlFor={`col-${column.accessorKey}`}>
                          {column.header}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="table-container">
            <MaterialReactTable
              columns={columns}
              data={filteredData || tableData}
              enableColumnOrdering
              enableStickyHeader={true}
              enableColumnResizing={true}
              enableColumnActions={false}
              enablePagination={true}
              manualFiltering={false}
              manualPagination={false}
              manualSorting={false}
              enableColumnSorting={true}
              enableGlobalFilter={false}
              enableColumnFilters={false}
              enableBottomToolbar={true}
              enableTopToolbar={false}
              layoutMode="grid"
              displayColumnDefOptions={{
                'mrt-row-expand': { size: 0 },
              }}
              columnResizeMode="fit"
              enableColumnResizeToFit={true}
              muiTableContainerProps={{
                sx: {
                  maxHeight: 'calc(100vh - 300px)',
                  tableLayout: 'fixed',
                },
              }}
              muiTableBodyRowProps={({ row }) => ({
                onClick: () => {
                  console.log('Row clicked:', row.original);
                },
                sx: {
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
              })}
              muiTablePaperProps={{
                elevation: 0,
                sx: {
                  border: '1px solid var(--border)',
                  boxShadow: 'none',
                },
              }}
              muiTableHeadCellProps={{
                sx: {
                  fontWeight: 600,
                  backgroundColor: 'var(--bg)',
                  borderRight: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  },
                  '& .Mui-TableHeadCell-Content': {
                    justifyContent: 'space-between',
                  },
                },
              }}
              muiTableBodyCellProps={{
                sx: (theme) => ({
                  padding: '0.75rem 1rem',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  '&:last-child': { borderRight: 'none' },
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                }),
              }}
              muiTableBodyProps={{
                sx: (theme) => ({
                  '& tr:nth-of-type(odd)': { backgroundColor: 'var(--card-bg)' },
                  '& tr:nth-of-type(even)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                  '& tr:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  '& tr:last-child td': { borderBottom: 'none' },
                }),
              }}
              onColumnOrderChange={(order) => setColumnOrder(order)}
              onColumnFiltersChange={(cf) => setColumnFilters(cf)}
              onSortingChange={(s) => {
                setSorting(s);
                setPagination(p => ({ ...p, pageIndex: 0 }));
              }}
              onPaginationChange={(p) => {
                setPagination(p);
              }}
              onColumnVisibilityChange={(v) => setColumnVisibility(v)}
              state={{
                columnVisibility,
                pagination,
                columnOrder,
                columnFilters,
                sorting,
                density: 'comfortable',
                columnSizing: {},
                columnPinning: {},
                showColumnFilters: false,
                showGlobalFilter: false,
                showColumnActions: false,
              }}
              defaultColumn={{
                minSize: 60,
                maxSize: 800,
                size: 100,
              }}
              initialState={{
                columnVisibility: columnVisibility,
                pagination: {
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="footer-section">
        <div className="footer-header">
          <h3 className="section-title">Report Footer</h3>
        </div>
        <div className="footer-content">
          <div className="footer-item">
            <div className="footer-checkbox">
              <input
                type="checkbox"
                id="include-footer"
                checked={includeFooter}
                onChange={() => setIncludeFooter(v => !v)}
                className="hidden-checkbox"
              />
              <label htmlFor="include-footer">
                {includeFooter ? <FaCheckSquare className="checked-icon" /> : <FaRegSquare className="unchecked-icon" />}
              </label>
            </div>
            <div className="footer-editor-wrapper">
              <HeadingEditor
                showToolbar={false}
                value={genarateDone && globalRes ? populatePlaceholders(footer, globalRes) : footer}
                onChange={setFooter}
                placeholder="Click to edit footer text..."
                showRemove={false}
                onBlur={() => { }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="generate-report-button"
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating Report...' : (<><FaFileDownload className="button-icon" /> Generate Report</>)}
        </button>
        <PreviewWithDesignButton reportId={reportId} generateReport={generateReport} headings={headings} footer={footer} />
        <button
          className="preview-button"
          onClick={handlePreviewReport}
          disabled={!genarateDone || isLoadingData || isLoadingConfig}
        >
          <FaEye /> Preview
        </button>

        <div className="export-container" ref={exportButtonRef}>
          <button
            className="export-button"
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isGenerating || isLoadingData || isLoadingConfig || !genarateDone}
          >
            Export <FaChevronDown className="export-arrow" />
          </button>

          {showExportDropdown && (
            <div className="export-dropdown">
              {(reportConfig?.exportOptions?.pdf ?? reportConfig?.export?.pdf ?? true) && (
                <div className="export-option" onClick={() => handleExport('pdf')}>
                  <FaFilePdf className="export-icon" />
                  <span>Export as PDF</span>
                </div>
              )}
              {(reportConfig?.exportOptions?.excel ?? reportConfig?.export?.excel ?? true) && (
                <div className="export-option" onClick={() => handleExport('xlsx')}>
                  <FaFileExcel className="export-icon" />
                  <span>Export as Excel</span>
                </div>
              )}

              {(reportConfig?.exportOptions?.csv ?? reportConfig?.export?.csv ?? true) && (
                <CSVLink
                  data={getExportableData().data}
                  headers={getExportableData().headers}
                  filename={`report_${new Date().toISOString().slice(0, 10)}.csv`}
                  className="export-option"
                  onClick={() => setShowExportDropdown(false)}
                >
                  <FaFileCsv className="export-icon" />
                  <span>Export as CSV</span>
                </CSVLink>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="success-message">
          <p>{success}</p>
        </div>
      )}

      {showPreviewModal && (
        <div className="preview-modal-overlay">
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h3>Report Preview</h3>
              <button
                className="preview-modal-close"
                onClick={() => setShowPreviewModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="preview-modal-body">
              {isLoadingData ? (
                <p>Loading preview data...</p>
              ) : error ? (
                <p className="error-message">Error: {error}</p>
              ) : previewData.length > 0 ? (
                <div className="preview-table-container">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex}>{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No data to display for this report.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default DesignReport;