import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FiPlus, FiSave, FiScissors, FiCopy, FiTrash2, FiRotateCcw, FiRotateCw, FiZoomIn, FiZoomOut, FiEye, FiMove, FiUpload, FiDownload } from 'react-icons/fi';
import { serializeCanvas, deserializeCanvas, downloadCanvasFile, loadCanvasFromFile, storeCanvasFile } from '../../utils/canvasSaveLoad';
import ImagePropertiesSidebar from '../ImagePropertiesSidebar';
import { useParams } from 'react-router-dom';
import TextPropertiesSidebar from '../TextPropertiesSidebar';
import '../css/DesignReport.css';
import '../css/ImagePropertiesSidebar.css';
import BASE_URL from '../../config/api';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
// console.log(API_BASE_URL);

// Grid settings
const GRID_SIZE = 10; // px per grid cell
const RULER_THICKNESS = 24; // px
const LABEL_EVERY_CELLS = 10; // label every 100px if GRID_SIZE=10

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

export default function DesignReport() {
	const { reportId } = useParams();
	const canvasRef = useRef(null);
	const fileInputRef = useRef(null);
	const [widgets, setWidgets] = useState([]);
	const [draggingTool, setDraggingTool] = useState(null); // {type}
	const [activeId, setActiveId] = useState(null);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
	const [showPreview, setShowPreview] = useState(false); // true to show preview, false to hide
	const [scale, setScale] = useState(1);
	const [pageKey, setPageKey] = useState('free');
	const [showImageSidebar, setShowImageSidebar] = useState(false);
	const [selectedImageWidget, setSelectedImageWidget] = useState(null);
	const [showTextSidebar, setShowTextSidebar] = useState(false);
	const [selectedTextWidget, setSelectedTextWidget] = useState(null);
	const [selectedReportCategory, setSelectedReportCategory] = useState('');
	const [coordinates, setCoordinates] = useState({}); // Track bottom-right coordinates for all widgets

	const currentPreset = PAGE_PRESETS.find(p => p.key === pageKey) || PAGE_PRESETS[0];

	const handleReportCategoryChange = (e) => {
		const category = e.target.value;
		setSelectedReportCategory(category);
		
		// Log the selection for debugging
		console.log('Selected report category:', category);
		
		// Here you can add logic to:
		// 1. Load specific report templates
		// 2. Update available widgets based on category
		// 3. Navigate to specific report configurations
		// 4. Filter available design elements
		
		// Example: You could load different widget sets based on category
		// For now, we'll just log the selection
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

	// Re-measure and re-center data tables whor canvas size changes
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

	// Keyboard delete for active widget
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

	// Update coordinates for all widgets
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

	// Update coordinates whenever widgets change
	useEffect(() => {
		updateCoordinates();
	}, [widgets, updateCoordinates]);

	const getCanvasOffset = () => {
		const rect = canvasRef.current.getBoundingClientRect();
		return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
	};

	// Start dragging from toolbox
	const handleToolDragStart = (tool) => (e) => {
		e.dataTransfer.setData('text/plain', tool.type);
		setDraggingTool(tool.type);
	};

	const handleToolDragEnd = () => setDraggingTool(null);

	// Drop new widget onto canvas
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

	// Snap headers and footers to predefined positions
	if (type === 'header') {
		// Align to top center
		x = snap((canvasWidth - snap(baseSize.width)) / 2);
		y = 0;
	} else if (type === 'footer') {
		// Align to bottom center
		x = snap((canvasWidth - snap(baseSize.width)) / 2);
		y = snap(canvasHeight - snap(baseSize.height));
	} else if (type === 'data-table') {
		// Align to center
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
		// Text-specific properties
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

	// Auto-open image properties sidebar for image widgets
	if (type === 'image') {
		setSelectedImageWidget(newWidget);
		setShowImageSidebar(true);
	}
	
	// Auto-open text properties sidebar for text widgets
	if (type === 'textbox') {
		setSelectedTextWidget(newWidget);
		setShowTextSidebar(true);
	}
};

	const handleCanvasDragOver = (e) => {
		e.preventDefault();
	};

	// Begin move drag - now via small move handle
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
		
		// Snap headers and footers to predefined positions
		if (widget.type === 'header') {
			// Snap to top center
			newX = snap((canvasWidth - widget.width) / 2);
			newY = 0;
		} else if (widget.type === 'footer') {
			// Snap to bottom center
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

	// Resize from 8 handles using direction
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

// Rotation handle
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

	// Save/Load functionality
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
			const val = storeCanvasFile(widgets, userId, branchId, reportStructureId, reportName,is_active,created_at,updated_at);
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
			alert('Error saving canvas: ' + error.message);
		}
	};

	const handleLoadCanvas = async (event) => {
		try {
		    const payload = {
			  id: 13,
		    };
		    const storeUrl = `${BASE_URL}/report-design/json_load`;
            const res = await fetch(storeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // This header is important for telling the server what type of data you are sending
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                // The body of the request is the raw JSON string
                body: JSON.stringify(payload),
            });
		    const data = await res.json();
            let fileString = data.design_json;
			console.log('fileString', fileString);
            if (fileString.startsWith('"') && fileString.endsWith('"')) {
               fileString = fileString.slice(1, -1).replace(/\\"/g, '"');
            }

			const result = await deserializeCanvas(fileString);
			
			if (result.success) {
				setWidgets(result.elements);
				console.log(`Loaded ${result.totalElements} elements from canvas file`);
				
				// Restore page configuration if available
				if (result.pageConfig) {
					const { key, width, height, label } = result.pageConfig;
					
					// Check if the page preset exists
					const existingPreset = PAGE_PRESETS.find(p => p.key === key);
					if (existingPreset) {
						setPageKey(key);
						console.log('Restored page configuration:', key, label);
					} else {
						// Handle custom page size
						console.log('Loaded custom page size:', width, 'x', height, label);
						setCanvasSize({ width: parseInt(width), height: parseInt(height) });
						setScale(1); // Reset scale for custom sizes
					}
				}
				
				if (result.metadata) {
					console.log('Canvas metadata:', result.metadata);
				}
			} else {
				console.error('Failed to load canvas:', result.error);
				alert('Failed to load canvas: ' + result.error);
			}
		} catch (error) {
			console.error('Error loading canvas:', error);
			alert('Error loading canvas: ' + error.message);
		}

		// Reset file input to allow loading the same file again
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
			
			// Copy to clipboard
			navigator.clipboard.writeText(jsonString).then(() => {
				alert('Canvas data copied to clipboard!');
			}).catch(() => {
				// Fallback: show in modal or download
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
			alert('Error exporting canvas: ' + error.message);
		}
	};

	// Open image properties when clicking on an image widget
	const handleImageClick = (widget) => {
		if (widget.type === 'image') {
			setSelectedImageWidget(widget);
			setShowImageSidebar(true);
		}
	};

	// Open text properties when clicking on a text widget
	const handleTextClick = (widget) => {
		if (widget.type === 'textbox') {
			setSelectedTextWidget(widget);
			setShowTextSidebar(true);
		}
	};

	// Align helpers (for active widget)
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

	// Build ticks for rulers based on actual canvasRef size
	const hTicks = Array.from({ length: Math.ceil(canvasSize.width / GRID_SIZE) + 1 }, (_, i) => i);
	const vTicks = Array.from({ length: Math.ceil(canvasSize.height / GRID_SIZE) + 1 }, (_, i) => i);

	// Toolbar handlers
	const handleZoomIn = () => setScale((s) => Math.min(2, parseFloat((s + 0.1).toFixed(2))))
	const handleZoomOut = () => setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))))
	const handleZoomSelect = (e) => setScale(parseFloat(e.target.value))

	return (
		<div className="design-report-page">
			<div className="design-toolbar">
				<div className="toolbar-group">
					<button className="tb-btn" title="New"><FiPlus /></button>
					<button className="tb-btn" title="Save" onClick={handleSaveCanvas}><FiSave /></button>
					{/* <button className="tb-btn" title="Load" onClick={() => fileInputRef.current?.click()}><FiUpload /></button> */}
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
									<div key={w.id} className={`widget ${w.type} ${activeId === w.id ? 'active' : ''}`} style={{ left: w.x, top: w.y, width: w.width, height: w.height, transform: `rotate(${w.rotation || 0}deg)`, transformOrigin: 'center' }} onMouseDown={() => { setActiveId(w.id); if (w.type === 'image') { setSelectedImageWidget(w); setShowImageSidebar(true); } else if (w.type === 'textbox') { setSelectedTextWidget(w); setShowTextSidebar(true); }}}>
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
					<div className="preview-modal" style={{padding:0, background:'#f5f5f5'}} onClick={(e) => e.stopPropagation()}>
						<div className="preview-header">
							<span>Grid Preview</span>
							<button className="close-btn" onClick={() => setShowPreview(false)}>Close</button>
						</div>
						<div className="preview-canvas" style={{ width: canvasSize.width, height: canvasSize.height, background:'#fff', margin:0 }}>
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
							<div className="canvas-zoom" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '100%', height: '100%', position:'relative' }}>
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
			
			{/* Hidden file input for loading canvas files */}
			{/* <input
				ref={fileInputRef}
				type="file"
				accept=".json"
				onChange={handleLoadCanvas}
				style={{ display: 'none' }}
			/> */}
		</div>
	);
};
