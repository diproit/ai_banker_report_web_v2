import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PreviewWithDesignButton from './PreviewWithDesignButton';
import { useParams } from "react-router-dom";
import { createPortal } from 'react-dom';
import { FaCheckSquare, FaRegSquare, FaFileDownload, FaFilePdf, FaFileWord, FaFileExcel, FaFileCsv, FaChevronDown, FaSync, FaTimes, FaPlus, FaExpand, FaEye, FaImage, FaAlignLeft, FaAlignCenter } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import { FiFilter } from 'react-icons/fi';
import { MaterialReactTable } from 'material-react-table';
import moment from 'moment';
import HeadingEditor from '../common/HeadingEditor';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';  // 👈 import the function directly
import { CSVLink } from 'react-csv';
import '../css/ReportPage.css';
import '../common/HeadingEditor.css';
import BASE_URL from '../../config/api';
import { get, post } from '../../clients/apiClient';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
// console.log(API_BASE_URL);

// sanitize accessorKey (convert dots to double-underscore to avoid nested object accessor issues)
const toAccessorKey = (name) => name.replace(/\./g, '__');

// reverse map (accessorKey -> original field name)
const fromAccessorKey = (accessor) => accessor.replace(/__+/g, '.');

// safely get nested value from object with dot path
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

// Download helper
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
  onRealtimeFilterChange, // New prop for real-time filtering
  distinctValues = [] // New prop for distinct values
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter out already selected columns from other fields
  const availableColumns = useMemo(() => {
    return columns.filter(col => !selectedColumns.includes(col.accessorKey) || col.accessorKey === column);
  }, [columns, selectedColumns, column]);

  // Get column type for input type
  const columnType = useMemo(() => {
    const col = columns.find(c => c.accessorKey === column);
    if (!col) return 'text';
    if (/(date|dt|time)/i.test(col.accessorKey)) return 'date';
    if (/(qty|quantity|amount|price|total|debit|credit|value)/i.test(col.accessorKey)) return 'number';
    return 'text';
  }, [column, columns]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when column is selected
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
          aria-label={column || t('components.reportPage.preview')}
        >
          <span className="selector-value">
            {column ? columns.find(c => c.accessorKey === column)?.header : t('components.reportPage.select_column')}
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
            aria-label={t('components.reportPage.remove_search_field')}
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
              <option value="">{t('components.reportPage.no_data') || t('components.reportPage.select_column')}</option>
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
              placeholder={t('components.reportPage.search_in', { col: columns.find(c => c.accessorKey === column)?.header }) || `Search in ${columns.find(c => c.accessorKey === column)?.header}...`}
              className="search-input"
              aria-label={t('components.reportPage.search_in', { col: column }) || `Search in ${column}`}
            />
          )}

          {value && (
            <button
              className="clear-search-button"
              onClick={handleClear}
              aria-label={t('components.reportPage.clear_search') || t('common.cancel')}
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Safely get a nested value from an object using a dot-notation path
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

// Replace placeholders in a string with values from data
const populatePlaceholders = (text, data) => {
  if (!text || !data) {
    return text;
  }
  return text.replace(/{([^}]+)}/g, (match, key) => {
    let value = getNestedValue(data, key.trim());
    // Check if the value is a date string in timestamp format and convert it to YYYY-MM-DD
    if (typeof value === 'string' && moment(value, moment.ISO_8601, true).isValid()) {
      value = moment(value).format('YYYY-MM-DD');
    }
    return value !== undefined ? value : match;
  });
};

export default function ReportPage() {
  const { t } = useTranslation();
  const { reportId } = useParams();

  // --- UI / Data state ---
  const [logo, setLogo] = useState(null);
  const [isLogoEnabled, setIsLogoEnabled] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [fullScreenLogo, setFullScreenLogo] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [reportConfig, setReportConfig] = useState(null); // raw JSON
  const [sqlQueryPlaceholders, setSqlQueryPlaceholders] = useState([]); // New state for SQL query placeholders
  const [columns, setColumns] = useState([]); // MRT column defs
  const [columnVisibility, setColumnVisibility] = useState({}); // dynamic keys
  const [tableData, setTableData] = useState([]); // current page rows
  const [totalRows, setTotalRows] = useState(0);
  const [isSummaryPreview, setIsSummaryPreview] = useState(false);

  const [headings, setHeadings] = useState([
    { content: 'Report Title', id: 1, include: true },
    { content: 'Subtitle', id: 2, include: true }
  ]);
  const [footer, setFooter] = useState('');
  const [includeFooter, setIncludeFooter] = useState(true);

  // searchFields state - dynamic list of {id, column, value}
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
    setSuccess(t('components.reportPage.filter_saved'));
  };

  const applySavedFilter = (filters) => {
    setSearchFields(filters);
    setSuccess(t('components.reportPage.saved_filter_applied'));
  };

  const deleteSavedFilter = (id) => {
    const updatedSavedFilters = savedFilters.filter(filter => filter.id !== id);
    setSavedFilters(updatedSavedFilters);
    localStorage.setItem('savedReportFilters', JSON.stringify(updatedSavedFilters));
    setSuccess(t('components.reportPage.saved_filter_deleted'));
  };
  //console.log("savedFilters:", savedFilters);

  // --- START PREVIEW MODAL LOGIC ---
  const [previewData, setPreviewData] = useState([]);

  const handlePreviewReport = async () => {
    setIsSummaryPreview(false);
    setError(null);
    setIsLoadingData(true);
    try {
      let json;
      if (genarateDone && globalRes) {
        json = globalRes;
      } else {
        json = await post('/dynamic-ui/table_data', { id: Number(reportId) });
      }

      const rows = json.table_data || json.data || [];
      console.log("rows", rows);

      // Map server row fields (with dots) into accessorKey fields for preview table
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
  // --- END PREVIEW MODAL LOGIC ---

  // --- START PREVIEW MODAL LOGIC ---
  const [previewDataSummary, setPreviewDataSummary] = useState([]);

  const handlePreviewReportSummary = async () => {
    setError(null);
    setIsLoadingData(true);
    try {
      let json;
      if (genarateDone && globalRes) {
        json = globalRes;
      } else {
        json = await post('/dynamic-ui/table_data', { id: Number(reportId) });
      }

      const rows = json.table_data || json.data || [];
      console.log("rows", rows);

      // --- 1. Aggregation Step ---
      // Use a Map to efficiently group by Savings Type Name and calculate the sums
      const aggregatedData = new Map();

      rows.forEach(row => {
        const savingsTypeName = row['Savings Type Name'];
        const balance = parseFloat(row['Balance']) || 0;
        const interestRateMax = parseFloat(row['Interest Rate (Max)']) || 0;

        if (aggregatedData.has(savingsTypeName)) {
          // If the type already exists, update the total balance
          const existingEntry = aggregatedData.get(savingsTypeName);
          existingEntry['Total Balance'] += balance;
        } else {
          // If it's a new type, create a new entry
          aggregatedData.set(savingsTypeName, {
            'Savings Type Name': savingsTypeName,
            'Interest Rate (Max)': interestRateMax, // Assuming this is consistent per type
            'Total Balance': balance,
          });
        }
      });

      // --- 2. Mapping and Final Formatting Step ---
      // Convert the Map values into an array of objects
      const finalData = Array.from(aggregatedData.values());

      // Now, map the final aggregated data to the accessor key format
      const mappedRows = finalData.map(r => {
        const mapped = {};

        // You'll need to define your "useFields" for the new, aggregated columns
        // You can define this manually or derive it from the aggregated data
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
      // Finally, set the state with the new, calculated data
      // setTableData(mappedRows);
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
  // --- END PREVIEW MODAL LOGIC ---

  // table control state
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]); // kept for compatibility
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  // UI toggles
  // Removed showFilters state to always show filters
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // status
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genarateDone, setGenarateDone] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const exportButtonRef = useRef(null);
  const columnFilterRef = useRef(null);

  // backend switching heuristics
  const BACKEND_THRESHOLD = 1000; // rows
  const DATE_RANGE_BACKEND_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

  // On mount: load report config from backend
  // On mount: load report config from backend
  let cfg;
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        // Try to fetch config (replace path or add query param if needed)
        cfg = await get(`/dynamic-ui/config/${reportId}`);
        console.log("Report config:", cfg.config);

        if (!isMounted) return;
        setReportConfig(cfg);

        // Extract placeholders from heading and subHeading
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

        // Check for logo in config
        if (cfg?.config?.Logo) {
          setLogo(cfg.config.Logo);
          setIsLogoEnabled(true);
        }

        // Build MRT columns from cfg.fields.include if exists, else from first row later
        const includeFields = (cfg?.fields?.include || []).map(f => {
          // f may be either string or object with name property
          const name = typeof f === 'string' ? f : (f.name || '');
          const accessorKey = toAccessorKey(name);
          return {
            accessorKey,
            header: (name.split('.').slice(-1)[0] || name).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            enableColumnOrdering: false,
            enableHiding: !!(typeof f === 'object' && f.isRemovable),
            // allow server filtering
          };
        });

        // if includeFields empty, keep columns empty and request data to infer columns
        setColumns(includeFields);
        setColumnOrder(includeFields.map(c => c.accessorKey));

        // initial columnVisibility: all visible except those explicitly hide (like notes)
        const initialVisibility = {};
        includeFields.forEach(c => initialVisibility[c.accessorKey] = true);
        setColumnVisibility(initialVisibility);

        // --- START OF UPDATED HEADINGS LOGIC ---
        // New logic to handle both "heading" and "subHeading" keys
        const newHeadings = [];

        // Add the main heading from 'cfg.config.heading'
        if (cfg?.config?.heading) {
          newHeadings.push({
            id: 'main-heading',
            content: cfg.config.heading,
            include: true
          });
        }

        // Add the subheading from 'cfg.config.subHeading'
        if (cfg?.config?.subHeading) {
          newHeadings.push({
            id: 'sub-heading',
            content: cfg.config.subHeading,
            include: true
          });
        }

        // If the API returns a 'headings' array, use it instead of the above
        // This part of your code is already robust, so we'll keep it as a fallback
        if (Array.isArray(cfg.headings) && cfg.headings.length) {
          setHeadings(cfg.headings.map((h, idx) => ({
            id: idx + 1,
            content: h.text || h || '',
            include: (typeof h.include === 'boolean') ? h.include : true,
            meta: h
          })));
        } else if (newHeadings.length > 0) {
          // Only set headings if we found some, and no 'headings' array was provided
          setHeadings(newHeadings);
        }
        // --- END OF UPDATED HEADINGS LOGIC ---
        console.log("footerrr", cfg.config.footer);
        if (cfg.config.footer) {
          console.log(cfg.config.footer);
          setFooter(cfg.config.footer);
        }

        // initialize searchFields from cfg.fields.search if provided
        if (Array.isArray(cfg?.fields?.search) && cfg.fields.search.length) {
          const sf = cfg.fields.search.map((f, idx) => {
            const name = typeof f === 'string' ? f : (f.name || '');
            return { id: String(idx + 1), column: toAccessorKey(name), value: '' };
          });
          // keep at least one
          setSearchFields(sf.length ? sf : [{ id: '1', column: '', value: '' }]);
        }

        // Data will be fetched only when the 'Generate Report' button is pressed.
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load report config.');
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    };

    loadConfig();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to fetch distinct values for a given column
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

  let globalRes = null;
  // Fetch data from backend, sending pagination/sorting/filters
  const fetchData = useCallback(async (options = {}, cfg = null) => {
    // options: { pageIndex, pageSize, filters, sorting, columnOrder }
    setIsLoadingData(true);
    setError(null);

    try {
      const configToUse = cfg || reportConfig;
      // Build payload
      const payload = {
        filters: options.filters || {}, // key: accessorKey or original field? use original where possible
        pageIndex: options.pageIndex ?? pagination.pageIndex,
        pageSize: options.pageSize ?? pagination.pageSize,
        sorting: options.sorting || sorting,
        columnOrder: options.columnOrder || columnOrder,
      };

      // If the backend expects original DB field names, convert accessor keys back to dot names in filters
      const convertedFilters = {};
      for (const k of Object.keys(payload.filters || {})) {
        const original = fromAccessorKey(k);
        convertedFilters[original] = payload.filters[k];
      }
      payload.filters = convertedFilters;

      // POST to backend; your backend should accept this shape and return { rows: [], total: N }
      const json = await post('/dynamic-ui/table_data', { id: Number(reportId) });
      globalRes = json;
      console.log("json", json);
      // Expecting { rows: [...], total: N } OR plain array
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


      // If columns empty (config didn't include fields), infer from first row
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

      // Map server row fields (with dots) into accessorKey fields for table
      const mappedRows = rows.map(r => {
        const mapped = {};
        // prefer config.fields.include order if available
        const useFields = (reportConfig?.fields?.include && reportConfig.fields.include.length) ? reportConfig.fields.include : Object.keys(r);
        useFields.forEach(f => {
          const originalName = typeof f === 'string' ? f : (f.name || '');
          const accessor = toAccessorKey(originalName);
          const val = getValueByPath(r, originalName) ?? r[originalName] ?? (() => {
            // fallback: try direct key if server used same accessor
            return r[accessor] ?? '';
          })();
          mapped[accessor] = val;
        });

        // Also include any other keys not in include list
        Object.keys(r).forEach(k => {
          const accessor = toAccessorKey(k);
          if (!(accessor in mapped)) mapped[accessor] = r[k];
        });

        return mapped;
      });

      // Format date values in mappedRows to YYYY-MM-DD
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportConfig, columnOrder, columns, pagination.pageSize, pagination.pageIndex, sorting]);

  // Build filters (accessorKey -> value) from searchFields
  const buildFilterPayloadFromSearchFields = () => {
    const payload = {};
    searchFields.forEach(f => {
      if (f.column && f.value !== undefined && f.value !== '') {
        payload[f.column] = f.value;
      }
    });
    return payload;
  };

  // Utility: get selected columns except current
  const getSelectedColumns = (currentId) => {
    return searchFields
      .filter(field => field.id !== currentId && field.column)
      .map(field => field.column);
  };

  // Add / remove / change search fields
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
    // Fetch distinct values for the selected column
    fetchDistinctValues(column);
  };
  const handleValueChange = (id, value) => {
    setSearchFields(prev => {
      const updatedFields = prev.map(f => f.id === id ? { ...f, value } : f);
      // Trigger filter application immediately
      applyFilters(updatedFields); // Pass updated fields directly
      return updatedFields;
    });
  };

  // Filtering mode: if dataset large or date-range big, prefer backend filtering
  const isBackendFilterPreferred = (currentSearchFields = searchFields) => {
    // if server tells totalRows and it's large, use backend
    if (totalRows >= BACKEND_THRESHOLD) return true;

    // check date fields in searchFields for long ranges (if user selected date inputs)
    // We look for any searchField.value that looks like two dates "yyyy-mm-dd to yyyy-mm-dd" or if UI uses startDate/endDate tokens
    // Simpler approach: if any searchField column name contains 'date' and value looks like range '|' separated or contains '/'
    const dateField = currentSearchFields.find(sf => /date/i.test(sf.column || '') && sf.value);
    if (dateField && typeof dateField.value === 'string') {
      // check if they entered a range "start|end" or "start - end"
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

  // Apply filters: choose backend or frontend
  const applyFilters = async (currentSearchFields = searchFields) => {
    setError(null);
    setSuccess(null);

    const filtersPayload = currentSearchFields.reduce((acc, f) => {
      if (f.column && f.value !== undefined && f.value !== '') {
        acc[f.column] = f.value;
      }
      return acc;
    }, {});

    // Determine filtering preference based on the current state of search fields
    const backendPreferred = isBackendFilterPreferred(currentSearchFields);

    if (backendPreferred) {
      // server-side filtering
      setIsLoadingData(true);
      try {
        // If filtersPayload is empty, fetch data without filters
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
    } else {
      // client-side filtering is handled by the filteredData useMemo hook
      // No explicit action needed here other than ensuring searchFields state is updated
      // The filteredData useMemo hook will react to changes in searchFields and tableData
    }
  };

  // Export handling based on config.exportOptions or config.exportOptions
  const handleExport = async (format) => {
    setShowExportDropdown(false);
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, headers } = getExportableData();

      switch (format) {
        case 'csv':
          // `react-csv` handles this beautifully with a component
          // You'll need to change the implementation slightly for CSV. See below.
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
          // Word export is more complex on the client-side.
          // It generally involves generating an HTML table and then using a library like docx or docx-templates.
          // A simpler, but less robust, approach is to create a simple HTML string and download it as a .doc file.
          // This is a basic example and might not preserve complex styles.
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

      // toast.success('Export successful!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Export failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate report (same as export default maybe backend chooses format)
  const generateReport = async () => {
    setGenarateDone(false)
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Await the data and store it in a variable.
      const fetchedData = await fetchData({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        filters: buildFilterPayloadFromSearchFields(),
        columnOrder,
      });
      const firstRowData = fetchedData.length > 0 ? fetchedData[0] : {};

      // 2. Populate a new headings array using the new data.
      const updatedHeadings = headings.map(h => ({
        ...h,
        content: populatePlaceholders(h.content, firstRowData)
      }));

      // 3. MOST IMPORTANT STEP: Update the state that the UI is bound to.
      setHeadings(updatedHeadings);

      // 4. Populate and update the footer state as well.
      const updatedFooter = populatePlaceholders(footer, firstRowData);
      setFooter(updatedFooter);

      setGenarateDone(true)

      return {
        fetchedData,
        updatedHeadings,
        updatedFooter
      };

      // // 5. Build the payload using the NEWLY UPDATED values
      // const payload = {
      //   reportName: reportConfig?.reportName || null,
      //   headings: updatedHeadings.filter(h => h.include).map(h => h.content),
      //   footer: includeFooter ? updatedFooter : null,
      //   filters: buildFilterPayloadFromSearchFields(),
      //   data: fetchedData,
      //   columnOrder,
      //   columnFilters,
      //   sorting,
      // };

      // const res = await fetch(`${API_BASE_URL}/api/report/generate`, {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      //   },
      //   body: JSON.stringify(payload),
      // });

      // if (!res.ok) {
      //   const txt = await res.text();
      //   throw new Error(`Report generation failed: ${res.status} ${txt}`);
      // }

      // const json = await res.json();
      // if (json.fileUrl) {
      //   downloadFile(json.fileUrl, `report_${new Date().toISOString().slice(0,10)}.pdf`);
      //   setSuccess('Report downloaded successfully.');
      // } else if (json.message) {
      //   setSuccess(json.message);
      // } else {
      //   setSuccess('Report generation started.');
      // }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  let getExportableData = () => {
    // Get the data that is currently displayed in the table (after filters and sorting)
    const dataToExport = filteredData || tableData;

    // Get the columns that are currently visible and in the correct order
    const visibleColumns = columnOrder
      .map(key => columns.find(c => c.accessorKey === key))
      .filter(c => columnVisibility[c.accessorKey]);

    // Map the data to a new array of objects, with only the visible columns
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

  // Sync widths for cards (your existing logic)
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

  // Close dropdowns when clicking outside (export and column filter)
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

  // Available columns for search dropdown (derived from columns state)
  const availableColumns = useMemo(() => {
    return columns;
  }, [columns]);

  // filteredData for client-side mode (applies searchFields); if using backend, tableData is managed by backend
  const filteredData = useMemo(() => {
    // If backend filtering is preferred, the tableData is already filtered by the backend.
    // Otherwise, apply client-side filtering based on searchFields.
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

  // initial columnVisibility defaults (if not set)
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

  // Debounce applyFilters when searchFields change
  useEffect(() => {
    const handler = setTimeout(() => {
      applyFilters(searchFields);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchFields, applyFilters]);


  if (isLoadingConfig) {
    return (
      <div className="report-page">
        <div className="loading">{t('components.reportPage.loading_config')}</div>
      </div>
    );
  }

  return (
    <div className="report-page">

      {/* --- START PREVIEW MODAL --- */}
      {showPreviewModal && createPortal(
        <div className="preview-modal-overlay">
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h4>{t('components.reportPage.report_preview')}</h4>
              <button className="preview-modal-close" onClick={() => setShowPreviewModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="preview-modal-body">

              {/* Split data into pages of 12 rows */}
              {Array.from({ length: Math.ceil(filteredData.length / 12) }, (_, pageIndex) => {
                const pageData = filteredData.slice(pageIndex * 12, pageIndex * 12 + 12);

                return (
                  <div key={pageIndex} className="preview-page">

                    {/* Headings only on first page */}
                    {pageIndex === 0 && (
                      <div className="preview-headings">
                        <div className="heading-row">
                          {/* <img src="/logoReport.png" alt="Company Logo" className="heading-logo" /> */}
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

                    {/* Table rows for this page */}
                    {/* Table rows for this page */}
                    <div className="preview-table-container">
                      <MaterialReactTable
                        // Use the full columns array and let the state handle visibility
                        columns={columns}
                        data={(pageData || tableData)}

                        // 1. Pass the captured state from the UI table
                        // The `state` prop will apply the visibility, sorting, and ordering
                        state={{
                          columnVisibility,
                          columnOrder,
                          sorting,
                        }}

                        // 2. Disable ALL interactive features to make it a static preview
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

                        // 3. Keep the initial state for initial rendering
                        initialState={{
                          columnVisibility,
                          columnOrder,
                          sorting,
                          // You may also want to set column sizing if it's dynamic
                          columnSizing: {},
                        }}

                        // 4. Preserve your styling
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

                    {/* Footer with dividers + page number */}
                    <div className="preview-footer">
                      <div className="footer-content">
                        {includeFooter && footer}
                        <div className="page-number">
                          {t('components.reportPage.page_of', { page: pageIndex + 1, total: Math.ceil(previewData.length / 12) })}
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
      {/* --- END PREVIEW MODAL --- */}
      {/* Saved Filters Section
      <div className="saved-filters-section">
        <div className="saved-filters-content">
          <h3 className="section-title">Saved Filters</h3>
          {savedFilters.length === 0 ? (
            <p>No saved filters yet.</p>
          ) : (
            <div className="saved-filters-list">
              {savedFilters.map((filter) => (
                <div key={filter.id} className="saved-filter-item">
                  <span>{filter.name} ({new Date(filter.timestamp).toLocaleString()})</span>
                  <button onClick={() => applySavedFilter(filter.filters)}>Apply</button>
                  <button onClick={() => deleteSavedFilter(filter.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div> */}

      {/* Logo Modal */}
      {showLogoModal && fullScreenLogo && (
        <div className="logo-modal-overlay" onClick={() => setShowLogoModal(false)}>
          <div className="logo-modal" onClick={e => e.stopPropagation()}>
            <button className="logo-modal-close" onClick={() => setShowLogoModal(false)}>
              <FaTimes size={20} />
            </button>
            <img src={fullScreenLogo} alt={t('components.logoUpload.alt_logo_preview')} className="logo-modal-image" />
          </div>
        </div>
      )}

      {/* Logo Card */}
      {isLogoEnabled && logo && (
        <div className="logo-card">
          <img src={logo} alt={t('components.logoUpload.alt_logo')} className="logo-preview" />
          <button onClick={() => {
            setFullScreenLogo(logo);
            setShowLogoModal(true);
          }} className="logo-preview-button">
            {t('components.reportPage.preview_logo_button')}
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="headings-card">
        <div className="header-section">
          <div className="header-actions">
            <h3 className="section-title">{t('components.reportPage.report_headings')}</h3>
            {headings.length < 3 && ( // allow more than 4 if JSON adds more; UI limits to 8 here but you can change
              <button
                type="button"
                onClick={() => {
                  setHeadings([...headings, { id: Date.now(), content: '', include: true }]);
                }}
                className="add-heading-button"
                disabled={headings.length >= 3}
              >
                <FaPlus /> {t('components.reportPage.add_heading')}
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
                    placeholder={t('components.headingEditor.placeholder') || `Heading ${index + 1} (Click to edit)`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-content show">
          {/* Search Card */}
          <div className="search-card">
            <div className="search-card-header">
              <h3 className="search-card-title">{t('components.reportPage.search_filters')}</h3>
              <div className="search-header-actions">
                <button
                  onClick={resetSearchFields}
                  className="reset-search-fields"
                  aria-label={t('components.reportPage.reset_search_fields')}
                  title={t('components.reportPage.reset_search_fields')}
                >
                  <span>↻</span>
                </button>
                {searchFields.length < availableColumns.length && (
                  <button
                    onClick={addSearchField}
                    className="add-search-field"
                    aria-label={t('components.reportPage.add_search_field')}
                  >
                    <span>+</span>
                    <span>{t('components.reportPage.add_search_field')}</span>
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

            {/* Removed Apply Filters button as filters are now applied automatically or on change */}
            {/* <div className="save-filters-section">
              <button
                type="button"
                onClick={handleSaveFilters}
                className="save-filters-button"
              >
                Save Filters
              </button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">{t('components.reportPage.report_data')}</h3>
            <div className="table-actions">
              <div className="column-filter" ref={columnFilterRef}>
                <button
                  className="filter-dropdown-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnFilter(!showColumnFilter);
                  }}
                >
                  <FiFilter /> {t('components.reportPage.table_columns')}
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

              {/* Optionally add other action buttons here */}
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
              // state handlers
              onColumnOrderChange={(order) => setColumnOrder(order)}
              onColumnFiltersChange={(cf) => setColumnFilters(cf)}
              onSortingChange={(s) => {
                setSorting(s);
                // optionally request server side sort immediately
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

      {/* Footer Section */}
      <div className="footer-section">
        <div className="footer-header">
          <h3 className="section-title">{t('components.reportPage.report_footer')}</h3>
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
                placeholder={t('components.reportPage.click_to_edit_footer')}
                showRemove={false}
                onBlur={() => { }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="generate-report-button"
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? t('components.reportPage.generating_report') : (<><FaFileDownload className="button-icon" /> {t('components.reportPage.generate_report')}</>)}
        </button>
        <PreviewWithDesignButton reportId={reportId} generateReport={generateReport} headings={headings} footer={footer} />
        {/* --- ADD THE PREVIEW BUTTON HERE --- */}
        <button
          className="preview-button"
          onClick={handlePreviewReport}
          disabled={!genarateDone || isLoadingData || isLoadingConfig}
        >
          <FaEye /> {t('components.reportPage.preview')}
        </button>
        {/* <button
    className="preview-button"
    onClick={handlePreviewReportSummary}
    disabled={!genarateDone || isLoadingData || isLoadingConfig}
  >
    <FaEye /> Preview as Summary
  </button> */}
        {/* --- END ADDITION --- */}

        <div className="export-container" ref={exportButtonRef}>
          <button
            className="export-button"
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isGenerating || isLoadingData || isLoadingConfig || !genarateDone}
          >
            {t('components.reportPage.export')} <FaChevronDown className="export-arrow" />
          </button>

          {showExportDropdown && (
            <div className="export-dropdown">
              {/* decide which export options to show from config */}
              {(reportConfig?.exportOptions?.pdf ?? reportConfig?.export?.pdf ?? true) && (
                <div className="export-option" onClick={() => handleExport('pdf')}>
                  <FaFilePdf className="export-icon" />
                  <span>{t('components.reportPage.export_pdf')}</span>
                </div>
              )}
              {/* {(reportConfig?.exportOptions?.doc ?? reportConfig?.export?.word ?? reportConfig?.export?.doc ?? true) && (
          <div className="export-option" onClick={() => handleExport('doc')}>
            <FaFileWord className="export-icon" />
            <span>Export as Word</span>
          </div>
        )} */}
              {(reportConfig?.exportOptions?.excel ?? reportConfig?.export?.excel ?? true) && (
                <div className="export-option" onClick={() => handleExport('xlsx')}>
                  <FaFileExcel className="export-icon" />
                  <span>{t('components.reportPage.export_as_excel') || t('components.reportPage.export_excel') || 'Export as Excel'}</span>
                </div>
              )}

              {/*
          This is the part you need to change.
          Replace the <div> with onClick={() => handleExport('csv')}
          with the <CSVLink> component.
        */}
              {(reportConfig?.exportOptions?.csv ?? reportConfig?.export?.csv ?? true) && (
                <CSVLink
                  data={getExportableData().data}
                  headers={getExportableData().headers}
                  filename={`report_${new Date().toISOString().slice(0, 10)}.csv`}
                  className="export-option"
                  // The onClick event is not needed here as CSVLink handles it
                  onClick={() => setShowExportDropdown(false)} // This will close the dropdown after clicking
                >
                  <FaFileCsv className="export-icon" />
                  <span>{t('components.reportPage.export_as_csv')}</span>
                </CSVLink>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Report Preview Modal */}
      {showPreviewModal && (
        <div className="preview-modal-overlay">
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h3>{t('components.reportPage.report_preview')}</h3>
              <button
                className="preview-modal-close"
                onClick={() => setShowPreviewModal(false)}
                aria-label={t('components.reportPage.preview')}
              >
                &times;
              </button>
            </div>
            <div className="preview-modal-body">
              {isLoadingData ? (
                <p>{t('components.reportPage.loading_preview')}</p>
              ) : error ? (
                <p className="error-message">{t('components.reportPage.preview_error')}: {error}</p>
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
                <p>{t('components.reportPage.no_data_to_display')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
