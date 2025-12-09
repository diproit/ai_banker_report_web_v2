import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import PreviewWithDesignButton from "./PreviewWithDesignButton";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  FaCheckSquare,
  FaRegSquare,
  FaTimes,
  FaPlus,
  FaSave,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import {
  FiFilter,
  FiPlus,
  FiSave,
  FiScissors,
  FiCopy,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
  FiZoomIn,
  FiZoomOut,
  FiMove,
  FiUpload,
  FiDownload,
  FiEye,
} from "react-icons/fi";
import { MaterialReactTable } from "material-react-table";
import moment from "moment";
import HeadingEditor from "../common/HeadingEditor";
import DataTableSection from "../common/DataTableSection";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// import { CSVLink } from "react-csv";
import {
  serializeCanvas,
  deserializeCanvas,
  downloadCanvasFile,
  storeCanvasFile,
} from "../../utils/canvasSaveLoad";
import ImagePropertiesSidebar from "../ImagePropertiesSidebar";
import TextPropertiesSidebar from "../TextPropertiesSidebar";
import { post, get } from "../../clients/apiClient";
import "../css/ReportPage.css";
import "react-toastify/dist/ReactToastify.css";
// import '../common/HeadingEditor.css';
// import '../css/DesignReport.css';
// import '../css/ImagePropertiesSidebar.css';
import { TypeAheadDropdown } from "../TypeAheadDropdown";

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
// console.log(API_BASE_URL);

// Helper / Utility functions (from ReportPage.js)
const toAccessorKey = (name) => name?.replace(/\./g, "__");
const fromAccessorKey = (accessor) => accessor.replace(/__+/g, ".");
const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (let p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};
const downloadFile = (url, filename) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "report";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
const getNestedValue = (obj, path) => {
  const parts = path.split(".");
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
    if (
      typeof value === "string" &&
      moment(value, moment.ISO_8601, true).isValid()
    ) {
      value = moment(value).format("YYYY-MM-DD");
    }
    return value !== undefined ? value : match;
  });
};

const SearchField = ({
  id,
  columns,
  selectedColumns,
  onColumnSelect,
  onValueChange,
  onRemove,
  value = "",
  column = "",
  onRealtimeFilterChange, // New prop for real-time filtering
  distinctValues = [], // New prop for distinct values
  columnDistinctValues = {}, // New prop for all distinct values
  onRequestDistinctValues, // New: ask parent to fetch distincts for a column
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const { t } = useTranslation();

  // Filter out already selected columns from other fields
  const availableColumns = useMemo(() => {
    console.log(
      "availableColumns:",
      columns.filter(
        (col) =>
          !selectedColumns.includes(col.accessorKey) ||
          col.accessorKey === column
      )
    );
    return columns.filter(
      (col) =>
        !selectedColumns.includes(col.accessorKey) || col.accessorKey === column
    );
  }, [columns, selectedColumns, column]);

  console.log("availaiiiibleColumns", availableColumns);
  // Get column type for input type
  const columnType = useMemo(() => {
    const col = columns.find((c) => c.accessorKey === column);
    if (!col) return "text";
    if (/(date|dt|time)/i.test(col.accessorKey)) return "date";
    if (
      /(qty|quantity|amount|price|total|debit|credit|value)/i.test(
        col.accessorKey
      )
    )
      return "number";
    return "text";
  }, [column, columns]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // if click is inside the original selector, keep open
      if (dropdownRef.current && dropdownRef.current.contains(event.target))
        return;

      // if click is inside the portaled dropdown (overlay), keep open so option clicks register
      const overlay = document.getElementById("app-overlays");
      if (overlay && overlay.contains(event.target)) {
        // if clicked element is within a column-dropdown inside overlay, don't close
        if (event.target.closest && event.target.closest(".column-dropdown"))
          return;
      }

      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when column is selected
  useEffect(() => {
    if (column && inputRef.current) {
      inputRef.current.focus();
    }
  }, [column]);

  const handleColumnSelect = (col) => {
    console.log("handleColumnSasdsafselect:", id);
    onColumnSelect(id, col);
    setIsOpen(false);
    // proactively fetch distincts when a column is chosen (if not already loaded)
    if (typeof onRequestDistinctValues === "function") {
      const existing = columnDistinctValues[col];
      if (!existing || existing.length === 0) {
        onRequestDistinctValues(col);
      }
    }
  };

  const handleClear = () => {
    onValueChange(id, "");
  };

  console.log("[SearchField] id:", id, "column:", column);
  console.log(
    "[SearchField] distinct values for this column:",
    columnDistinctValues[column]
  );
  console.log("[TypeAheadDropdown] options:", columnDistinctValues[column]);

  return (
    <div className="search-field-container">
      <div className="search-field-header">
        <div
          ref={dropdownRef}
          className={`column-selector ${isOpen ? "is-open" : ""} ${column ? "has-selection" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          tabIndex="0"
          role="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={column || t("components.reportPage.select_column")}
        >
          <span className="selector-value">
            {column
              ? columns.find((c) => c.accessorKey === column)?.header
              : t("components.reportPage.select_column")}
          </span>
          <span className="dropdown-arrow">
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1.5L6 6.5L11 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          {isOpen && (
            <div className="column-dropdown" role="listbox">
              {availableColumns.map((col) => (
                <div
                  key={col.accessorKey}
                  className={`dropdown-option ${col.accessorKey === column ? "is-selected" : ""}`}
                  onMouseDown={(e) => {
                    // prevent document mousedown handlers from closing the dropdown before selection
                    e.preventDefault();
                    handleColumnSelect(col.accessorKey);
                  }}
                  onClick={() => handleColumnSelect(col.accessorKey)}
                  role="option"
                  aria-selected={col.accessorKey === column}
                >
                  <span className="option-text">{col.header}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {
          <button
            className="remove-field-button"
            onClick={() => onRemove(id)}
            aria-label={t("components.reportPage.remove_search_field")}
          >
            <FaTimes size={14} />
          </button>
        }
      </div>

      {column && (
        <div className="search-input-container">
          <TypeAheadDropdown
            id={id}
            value={value}
            options={columnDistinctValues[column] || []}
            onFocus={() => {
              if (typeof onRequestDistinctValues === "function" && column) {
                const existing = columnDistinctValues[column];
                if (!existing || existing.length === 0) {
                  onRequestDistinctValues(column);
                }
              }
            }}
            onValueChange={(id, newValue) => {
              onValueChange(id, newValue);
              if (onRealtimeFilterChange) {
                onRealtimeFilterChange(id, column, newValue);
              }
            }}
            placeholder={t("components.reportPage.search_in", {
              col: columns.find((c) => c.accessorKey === column)?.header,
            })}
            aria-label={t("components.reportPage.search_in", { col: column })}
          />
          {value && (
            <button
              className="clear-search-button"
              onClick={handleClear}
              aria-label={t("components.reportPage.clear_search")}
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FiltersSection = ({
  t,
  searchFields1,
  searchFields2,
  availableColumns,
  tableData,
  columnDistinctValues,
  resetSearchFields1,
  resetSearchFields2,
  addSearchField1,
  addSearchField2,
  handleColumnSelect,
  handleValueChange,
  removeSearchField,
  filters,
  selectedConfig,
  handleInputChange,
  removeFilterPair,
  addFilterPair,
  getActiveSearchNames,
  generateAndSendSQL,
  filterFields,
  isConfigUpdate,
  hasPresetValues,
  presetItems,
  setHasPresetValues,
  setPresetItems,
}) => {
  const [activeTab, setActiveTab] = useState("search");

  // Utility: get selected columns except current
  const getSelectedColumns = (currentId) => {
    // Correctly chooses the active state array (searchFields1 or searchFields2)
    console.log("searchFields1:", currentId);
    const currentSearchFields =
      activeTab === "filter" ? searchFields1 : searchFields2;
    console.log("searchFields1 1:", searchFields1);

    return currentSearchFields
      .filter((field) => field.id !== currentId && field.column)
      .map((field) => field.column);
  };

  const handleSelectWrapper = (id, column) => handleColumnSelect(id, column);
  const handleValueWrapper = (id, value) => handleValueChange(id, value);
  const handleRemoveWrapper = (id) => removeSearchField(id);

  // Effect to compute hasPresetValues
  // Whenever config changes
  useEffect(() => {
    isConfigUpdate.current = true;
  }, [selectedConfig]);

  // Compute preset items & hasPresetValues only on config update
  useEffect(() => {
    if (!isConfigUpdate.current) return;

    const presets = Array.isArray(filterFields)
      ? filterFields.filter(
          (item) => item.value && item.value.trim() !== "" && item.isRemovable
        )
      : [];

    setHasPresetValues(presets.length > 0);
    setPresetItems(presets);

    console.log("PresetValues 1:", presets.length > 0);
    console.log("PresetValues 2:", presets);

    isConfigUpdate.current = false;
  }, [filterFields]);

  return (
    <div className="filters-section-wrapper">
      {/* 1. Tabs */}
      <div className="filters-tabs">
        {/* <button
          className={activeTab === "filter" ? "active" : ""}
          onClick={() => setActiveTab("filter")}
        >
          {t("components.reportPage.tab1")}
        </button> */}
        <button
          className={activeTab === "search" ? "active" : ""}
          onClick={() => setActiveTab("search")}
        >
          {t("components.reportPage.tab2")}
        </button>
      </div>

      {/* 2. Content Container */}
      <div className="filters-section">
        {/* --- Filter Tab: Dynamic Filter UI --- */}
        <div
          className={`filters-content ${activeTab === "filter" ? "show" : "hide"}`}
        >
          {/* Add / Run Buttons */}
          <div className="flex gap-3"></div>
          <div className="search-card-header">
            {/* <h3 className="search-card-title">{t('components.reportPage.search_filters')} CARD 2</h3>  */}
            <div className="search-header-actions">
              {" "}
               {/* HIDE ADD BUTTON IF PRESETS ARE ACTIVE */}
              {/* {!hasPresetValues && (
                <button 
                    onClick={addFilterPair} 
                    className="add-search-field" 
                    aria-label={t('components.reportPage.add_search_field')} 
                > 
                    <span>+</span> 
                    <span>{t('components.reportPage.add_search_field')}</span> 
                </button> 
            )} */}
              <button
                onClick={() => generateAndSendSQL(selectedConfig, filters)}
                className="generate-report-button"
              >
                {" "}
                {t("components.reportPage.apply_filter")}
              </button>
            </div>
          </div>
          <div className="filter-container">
            {(hasPresetValues ? presetItems : getActiveSearchNames()).map(
              (item, index) => {
                const itemName = hasPresetValues ? item.name_en || "" : item;
                const itemValue = hasPresetValues
                  ? item.value || ""
                  : item.value;
                const isDisabled = hasPresetValues;

                return (
                  <div key={index} className="filter-row">
                    {/* Field name */}
                    <div
                      className={`filter-label ${isDisabled ? "disabled" : "active"}`}
                    >
                      {itemName || "Unnamed Field"}
                    </div>

                    {/* Input Field */}
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Enter value"
                      value={itemValue}
                      onChange={(e) =>
                        !isDisabled &&
                        handleInputChange(itemName, "value", e.target.value)
                      }
                      disabled={isDisabled}
                    />

                    {/* Optional remove button (uncomment if needed) */}
                    {/* {!isDisabled && (
            <button
              className="filter-remove-btn"
              onClick={() => removeFilterPair(index)}
            >
              ✕
            </button>
          )} */}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Search Tab: Search fields UI */}
        <div
          className={`filters-content ${activeTab === "search" ? "show" : "hide"}`}
        >
          <div className="search-card-header">
            {/* <h3 className="search-card-title">{t('components.reportPage.search_filters')} CARD 2</h3>  */}
            <div className="search-header-actions">
              <button
                style={{
                  marginRight: "8px",
                }}
                onClick={resetSearchFields2}
                className="reset-search-fields"
                aria-label={t("components.reportPage.reset_search_fields")}
                title={t("components.reportPage.reset_search_fields")}
              >
                <span>↻</span>
              </button>
              <button
                onClick={addSearchField2}
                className="add-search-field"
                aria-label={t("components.reportPage.add_search_field")}
              >
                <span>+</span>
                <span>{t("components.reportPage.add_search_field")}</span>
              </button>
              {/* {searchFields2.length < availableColumns.length && (
                  <button
                    onClick={addSearchField2}
                    className="add-search-field"
                    aria-label={t("components.reportPage.add_search_field")}
                  >
                    <span>+</span>
                    <span>{t("components.reportPage.add_search_field")}</span>
                  </button>
                )} */}
            </div>
          </div>

          <div className="search-input-group">
            <div className="search-fields-row">
              {searchFields2.length > 0 &&
                tableData.length > 0 &&
                searchFields2.map((field) => (
                  <SearchField
                    key={`tab2-${field.id}`}
                    id={field.id}
                    columns={availableColumns}
                    selectedColumns={getSelectedColumns(field.id)}
                    onColumnSelect={handleSelectWrapper}
                    onValueChange={handleValueWrapper}
                    onRemove={handleRemoveWrapper}
                    column={field.column}
                    value={field.value}
                    columnDistinctValues={columnDistinctValues || {}}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper / Utility functions (from DesignReport.js)
const GRID_SIZE = 10;
const RULER_THICKNESS = 24;
const LABEL_EVERY_CELLS = 10;
const PAGE_PRESETS = [
  {
    key: "free",
    labelKey: "components.reportPage.page_presets.free",
    width: "auto",
    height: "auto",
  },
  {
    key: "a4-portrait",
    labelKey: "components.reportPage.page_presets.a4_portrait",
    width: 595,
    height: 842,
  },
  {
    key: "a4l",
    labelKey: "components.reportPage.page_presets.a4_landscape",
    width: 1123,
    height: 794,
  },
  {
    key: "letterp",
    labelKey: "components.reportPage.page_presets.letter_portrait",
    width: 816,
    height: 1056,
  },
  {
    key: "letterl",
    labelKey: "components.reportPage.page_presets.letter_landscape",
    width: 1056,
    height: 816,
  },
];
const snap = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const initialToolbox = [
  { type: "textbox", labelKey: "components.reportPage.toolbox.textbox" },
  { type: "rectangle", labelKey: "components.reportPage.toolbox.rectangle" },
  { type: "line", labelKey: "components.reportPage.toolbox.line" },
  { type: "dashline", labelKey: "components.reportPage.toolbox.dashline" },
  { type: "image", labelKey: "components.reportPage.toolbox.image" },
  { type: "data-table", labelKey: "components.reportPage.toolbox.data-table" },
];
const headerFooterToolbox = [
  { type: "header", labelKey: "components.reportPage.toolbox.header" },
  { type: "footer", labelKey: "components.reportPage.toolbox.footer" },
];

let designJsonToSend;
export default function ReportAndDesignPage() {
  const { i18n } = useTranslation();
  const { reportId } = useParams();
  const { t } = useTranslation();

  const [showReportView, setShowReportView] = useState(true);
  const [reportConfigs, setReportConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState(""); // 'heading', 'subHeading', 'footer'
  const [editModalIndex, setEditModalIndex] = useState(null); // for headings/subheadings
  const [editModalContent, setEditModalContent] = useState("");

  const [logo, setLogo] = useState(null);
  // Add this useState near your other state declarations
  const [isLogoEnabled, setIsLogoEnabled] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [fullScreenLogo, setFullScreenLogo] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [reportConfig, setReportConfig] = useState(null);
  const [sqlQueryPlaceholders, setSqlQueryPlaceholders] = useState([]);
  const [columnDistinctValues, setColumnDistinctValues] = useState({});
  const [columns, setColumns] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [tableData, setTableData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isSummaryPreview, setIsSummaryPreview] = useState(false);
  const [instituteName, setInstituteName] = useState("");
  const [headings, setHeadings] = useState([
    {
      content: t(
        "components.reportPage.default_headings.reporttitle",
        "Report Title"
      ),
      id: 1,
      include: true,
    },
    {
      content: t("components.reportPage.default_headings.subtitle", "Subtitle"),
      id: 2,
      include: true,
    },
  ]);
  const [headingsData, setHeadingsData] = useState({
    heading: {}, // { heading_en, heading_si, ... }
    subHeading: [], // Array of subheading objects: [{ subHeading_en, subHeading_si, ... }, ...]
    footer: {
      // { footer_en, footer_si, ... }
      footer_en: "",
      footer_si: "",
      footer_ta: "",
      footer_th: "",
      footer_tl: "",
    }, // { footer_en, footer_si, ... }
  });

  useEffect(() => {
    const currentLanguage = i18n.language;

    // Initialize headingsData with default values from initial headings
    setHeadingsData((prev) => ({
      ...prev,
      heading: {
        [`heading_${currentLanguage}`]: t(
          "components.reportPage.default_headings.reporttitle",
          "Report Title"
        ),
      },
      subHeading: [
        {
          [`subHeading_${currentLanguage}`]: t(
            "components.reportPage.default_headings.subtitle",
            "Subtitle"
          ),
        },
      ],
    }));
  }, []);

  const [footer, setFooter] = useState("");
  const [includeFooter, setIncludeFooter] = useState(true);
  const [searchFields, setSearchFields] = useState([]);
  const [filterFields, setFilterFields] = useState([]);
  const [searchValues, setSearchValues] = useState({});
  const [distinctValuesMap, setDistinctValuesMap] = useState({});
  const [isLoadingDistinctValues, setIsLoadingDistinctValues] = useState(false);
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
  const [dataDoneLoading, setDataDoneLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [genarateDone, setGenarateDone] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [newConfigDescription, setNewConfigDescription] = useState("");
  const exportButtonRef = useRef(null);
  const columnFilterRef = useRef(null);
  const BACKEND_THRESHOLD = 50000;
  const DATE_RANGE_BACKEND_MS = 365 * 24 * 60 * 60 * 1000;

  // DesignReport states
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [widgets, setWidgets] = useState([]);
  const [draggingTool, setDraggingTool] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showDesignPreview, setShowDesignPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Add this line
  const [scale, setScale] = useState(1);
  const [pageKey, setPageKey] = useState("free");
  const [showImageSidebar, setShowImageSidebar] = useState(false);
  const [selectedImageWidget, setSelectedImageWidget] = useState(null);
  const [showTextSidebar, setShowTextSidebar] = useState(false);
  const [selectedTextWidget, setSelectedTextWidget] = useState(null);
  const [reportDesigns, setReportDesigns] = useState([]);
  const [selectedReportDesign, setSelectedReportDesign] = useState("");
  const [selectedReportCategory, setSelectedReportCategory] = useState("");
  const [coordinates, setCoordinates] = useState({});
  const [reportData, setReportData] = useState({});

  const [filteredConfigs, setFilteredConfigs] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  const [filteredDataForlngChng, setFilteredData] = useState([]);
  const [searchFields1, setSearchFields1] = useState([]); // For Tab 1
  const [searchFields2, setSearchFields2] = useState([]); // For Tab 2
  const [filters, setFilters] = useState([]);
  const [hasPresetValues, setHasPresetValues] = useState(false);
  const [presetItems, setPresetItems] = useState([]);
  const isConfigUpdate = useRef(false);

  let it_report_structure_id = reportId;
  let it_user_master_id = 1;
  let branchId = 1;

  useEffect(() => {
    const fetchReportDesigns = async () => {
      try {
        const payload = {
          it_user_master_id: it_user_master_id,
          it_report_structure_id: it_report_structure_id, // This might need to be dynamic later
        };

        // Use centralized API client
        const data = await post("/report-design/json_load", payload);

        console.log("API Response Data:", data);

        if (data.success && Array.isArray(data.data)) {
          // map over the array returned from backend
          const designs = data.data.map((d) => ({
            id: d.id,
            name: d.report_design_name,
            json: d.report_design_json,
          }));
          setReportDesigns(designs);
        }
      } catch (error) {
        console.error("Error fetching report designs:", error);
      }
    };

    fetchReportDesigns();
  }, []);

  const currentPreset =
    PAGE_PRESETS.find((p) => p.key === pageKey) || PAGE_PRESETS[0];
  const measureCanvas = useCallback(() => {
    if (canvasRef.current) {
      setCanvasSize({
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    measureCanvas();
    window.addEventListener("resize", measureCanvas);
    return () => window.removeEventListener("resize", measureCanvas);
  }, [measureCanvas]);

  // Re-measure and re-center data tables whor canvas size changes
  useEffect(() => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((w) => {
        if (w.type === "data-table") {
          const canvasWidth =
            currentPreset.width === "auto"
              ? canvasSize.width
              : currentPreset.width;
          const canvasHeight =
            currentPreset.height === "auto"
              ? canvasSize.height
              : currentPreset.height;
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
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setWidgets((prev) => prev.filter((w) => w.id !== activeId));
        setActiveId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeId]);

  // Update coordinates for all widgets
  const updateCoordinates = useCallback(() => {
    setCoordinates((prevCoordinates) => {
      const newCoordinates = {};
      widgets.forEach((widget) => {
        newCoordinates[widget.id] = {
          x: widget.x + widget.width,
          y: widget.y + widget.height,
          width: widget.width,
          height: widget.height,
        };
      });
      return newCoordinates;
    });
  }, [widgets]);

  // Update coordinates whenever widgets change
  useEffect(() => {
    updateCoordinates();
  }, [widgets, updateCoordinates]);

  const handleTextChange = useCallback((id, value) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, text: value } : w))
    );
  }, []);
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const storedFilters = localStorage.getItem("savedReportFilters");
      return storedFilters ? JSON.parse(storedFilters) : [];
    } catch (error) {
      console.error("Failed to parse saved filters from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    // This effect will run whenever any of the configuration changes
    if (selectedConfig?.activeCfg) {
      console.log("columnVisibility", columnVisibility);
      const currentConfig = {
        mainHeading: headings[0].content,
        subHeading: headings[1].content,
        footer: footer,
        includeFooter: includeFooter,
        searchFields: [...searchFields],
        columnVisibility: { ...columnVisibility },
        columnOrder: [...columnOrder],
      };

      // Compare with the original config to detect changes
      const originalConfig = selectedConfig.activeCfg || {};

      const configChanged =
        (currentConfig.mainHeading || "") !== (originalConfig.heading || "") ||
        (currentConfig.subHeading || "") !==
          (originalConfig.subHeading || "") ||
        (currentConfig.footer || "") !== (originalConfig.footer || "");

      setHasChanges(configChanged);
      console.log("headings", headings);
      console.log("selectedConfig?.activeCfg", selectedConfig?.activeCfg);
      console.log("currentConfig", currentConfig);
      console.log("originalConfig", originalConfig);
      console.log("configChanged", configChanged);
    }
  }, [
    headings,
    footer,
    includeFooter,
    searchFields,
    columnVisibility,
    columnOrder,
    selectedConfig,
  ]);

  useEffect(() => {
    if (selectedConfig?.activeCfg) {
      const newHeadings = [];
      const currentLanguage = i18n.language;
      if (selectedConfig?.activeCfg?.heading) {
        let mainHeading = selectedConfig.activeCfg.heading;
        if (typeof mainHeading === "object") {
          switch (currentLanguage) {
            case "en":
              mainHeading = mainHeading.heading_en || "N/A";
              break;
            case "si":
              mainHeading = mainHeading.heading_si || "N/A";
              break;
            case "ta":
              mainHeading = mainHeading.heading_ta || "N/A";
              break;
            case "th":
              mainHeading = mainHeading.heading_th || "N/A";
              break;
            default:
              mainHeading = mainHeading.heading_en || "N/A";
              break;
          }
        }
        newHeadings.push({
          id: "main-heading",
          content: mainHeading,
          include: true,
        });
      }
      if (selectedConfig?.activeCfg?.subHeading) {
        let subHeadings = selectedConfig.activeCfg.subHeading;

        // Handle both old object format and new array format
        if (Array.isArray(subHeadings)) {
          // New array format
          subHeadings.forEach((subHeading, index) => {
            if (typeof subHeading === "object") {
              let subHeadingText;
              switch (currentLanguage) {
                case "en":
                  subHeadingText = subHeading.subHeading_en || "N/A";
                  break;
                case "si":
                  subHeadingText = subHeading.subHeading_si || "N/A";
                  break;
                case "ta":
                  subHeadingText = subHeading.subHeading_ta || "N/A";
                  break;
                case "th":
                  subHeadingText = subHeading.subHeading_th || "N/A";
                  break;
                default:
                  subHeadingText = subHeading.subHeading_en || "N/A";
                  break;
              }
              newHeadings.push({
                id: `sub-heading-${index}`,
                content: subHeadingText,
                include: true,
              });
            } else {
              // Handle string format (fallback)
              newHeadings.push({
                id: `sub-heading-${index}`,
                content: subHeading || "N/A",
                include: true,
              });
            }
          });
        } else if (typeof subHeadings === "object") {
          // Old object format - convert to array
          let subHeadingText;
          switch (currentLanguage) {
            case "en":
              subHeadingText = subHeadings.subHeading_en || "N/A";
              break;
            case "si":
              subHeadingText = subHeadings.subHeading_si || "N/A";
              break;
            case "ta":
              subHeadingText = subHeadings.subHeading_ta || "N/A";
              break;
            case "th":
              subHeadingText = subHeadings.subHeading_th || "N/A";
              break;
            default:
              subHeadingText = subHeadings.subHeading_en || "N/A";
              break;
          }
          newHeadings.push({
            id: "sub-heading-0",
            content: subHeadingText,
            include: true,
          });
        } else {
          // Handle string format (fallback)
          newHeadings.push({
            id: "sub-heading-0",
            content: subHeadings || "N/A",
            include: true,
          });
        }
      }
      setHeadings(newHeadings);

      // Footer
      if (selectedConfig?.activeCfg?.footer) {
        let footerContent = selectedConfig.activeCfg.footer;
        if (typeof footerContent === "object") {
          switch (currentLanguage) {
            case "en":
              footerContent = footerContent.footer_en || "N/A";
              break;
            case "si":
              footerContent = footerContent.footer_si || "N/A";
              break;
            case "ta":
              footerContent = footerContent.footer_ta || "N/A";
              break;
            case "th":
              footerContent = footerContent.footer_th || "N/A";
              break;
            default:
              footerContent = footerContent.footer_en || "N/A";
              break;
          }
        }
        setFooter(footerContent);
      }
    }

    isConfigUpdate.current = true;
  }, [selectedConfig]);

  // Save new configuration
  const saveNewConfiguration = async () => {
    if (!newConfigName.trim()) {
      setError("Configuration name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log("headingsDataaaaaaaa", headingsData);
      // Extract UISearch from searchFields - only include fields with both column and value
      const uiSearchData = searchFields
        .filter((field) => field.column && field.value)
        .map((field) => ({
          column: field.column,
          value: field.value,
        }));

      const configJson = {
        reportName: selectedConfig?.activeCfg?.reportName || "Untitled_Report",
        heading: headingsData.heading || "Main Report Heading",
        subHeading: headingsData.subHeading || [], // Array structure for multiple subheadings
        footer: headingsData.footer || "Footer Here",
        isTransactionReport:
          selectedConfig?.activeCfg?.isTransactionReport ?? false,
        enableDateRange: selectedConfig?.activeCfg?.enableDateRange ?? false,
        fields: {
          include: selectedConfig?.activeCfg?.fields?.include || [],
          search: [...filterFields],
          sort: selectedConfig?.activeCfg?.fields?.sort || [],
        },
        exportOptions: selectedConfig?.activeCfg?.exportOptions || {
          pdf: false,
          csv: false,
          doc: true,
        },
        modifiedQuery: selectedConfig?.activeCfg?.modifiedQuery || "",
        UISearch: uiSearchData, // Add UISearch with column and value pairs
        columnVisibility: columnVisibility,
        columnOrder: columnOrder,
      };

      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 10).replace(/-/g, "");

      const isReplacingExisting = reportConfigs.some(
        (c) => c.name === newConfigName.trim()
      );
      const finalConfigName = isReplacingExisting
        ? newConfigName.trim() // keep same name when replacing
        : `${newConfigName.trim()}_${formattedDate}`; // new config gets timestamp

      const configData = {
        name: finalConfigName,
        description: newConfigDescription.trim(),
        config: configJson,
        reportId: reportId,
        userId: it_user_master_id,
        timestamp: new Date().toISOString(),
        branchId: branchId,
      };

      const endpoint = isReplacingExisting
        ? "/dynamic-ui/update-config"
        : "/dynamic-ui/save-config";

      // Use centralized API client
      const result = await post(endpoint, configData);

      if (result.success) {
        setReportConfigs((prev) => {
          if (isReplacingExisting) {
            // update the existing config
            return prev.map((cfg) =>
              cfg.name === newConfigName.trim()
                ? {
                    ...cfg,
                    cfg: configData.config,
                    description: configData.description,
                    timestamp: configData.timestamp,
                    branchId: configData.branchId,
                  }
                : cfg
            );
          } else {
            // add new config
            return [
              ...prev,
              {
                id: result.configId,
                name: configData.name,
                cfg: configData.config,
                description: configData.description,
                timestamp: configData.timestamp,
                branchId: configData.branchId,
              },
            ];
          }
        });

        // Immediately select the newly saved configuration in the dropdown
        const newlySavedConfig = {
          name: configData.name,
          activeCfg: configData.config,
        };
        setSelectedConfig(newlySavedConfig);

        // Clear table data after saving template - user can reload if needed
        setTableData([]);
        setColumns([]);
        setColumnOrder([]);
        setColumnVisibility({});
        setTotalRows(0);
        setDataDoneLoading(false);

        const successMessage = isReplacingExisting
          ? "Configuration updated successfully!"
          : "Configuration saved successfully!";

        toast.success(successMessage);
        setSuccess(successMessage);

        setShowSaveModal(false);
        setNewConfigName("");
        setNewConfigDescription("");
        setHasChanges(false);
      } else {
        throw new Error(result.message || "Failed to save configuration");
      }
    } catch (err) {
      console.error("Error saving configuration:", err);
      const errorMessage = err.message || "Failed to save configuration";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const openConfirmModal = (configdata) => {
    setConfigToDelete(configdata);
    setShowConfirmDeleteModal(true);
  };

  {
    /* Function to handle deletion after confirmation */
  }
  const confirmDelete = () => {
    if (configToDelete) {
      // Assuming handleDeleteConfiguration is defined in your component scope
      handleDeleteConfiguration(configToDelete.id, configToDelete.name);
      // You should probably hide the modal and clear the config *after* the deletion is successful
      setShowConfirmDeleteModal(false);
      setConfigToDelete(null);
    }
  };

  // Add handleDeleteConfiguration function
  const handleDeleteConfiguration = async (configId, configName) => {
    if (!configId) {
      setError("Configuration ID is required for deletion");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Call the delete API endpoint using centralized client
      const result = await post("/dynamic-ui/delete-config", { id: configId });

      if (result.success) {
        // Remove the deleted configuration from local state
        setReportConfigs((prev) => prev.filter((cfg) => cfg.id !== configId));

        // Show success message
        const successMessage = `Configuration "${configName}" deleted successfully!`;
        toast.success(successMessage);
        setSuccess(successMessage);

        // Clear the input field if it matches the deleted config
        if (newConfigName === configName) {
          setNewConfigName("");
        }
      } else {
        throw new Error(result.message || "Failed to delete configuration");
      }
    } catch (err) {
      console.error("Error deleting configuration:", err);
      const errorMessage = err.message || "Failed to delete configuration";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const columnsDataRef = useRef(null);
  const currentLanguage = i18n.language;
  const [columnHeaders, setColumnHeaders] = useState({
    language: currentLanguage,
    columns: [],
  });

  // Reset table-related UI state when switching reports or configurations
  const resetTableState = useCallback(() => {
    setTableData([]);
    setColumns([]);
    setColumnOrder([]);
    setColumnVisibility({});
    setTotalRows(0);
    setDataDoneLoading(false);
    setSearchFields([]);
    setDistinctValuesMap({});
    setColumnDistinctValues({});
    setColumnFilters([]);
    setSorting([]);
    setPagination({ pageIndex: 0, pageSize: 15 });
  }, []);
  useEffect(() => {
    let isMounted = true;

    // Reset table state when reportId changes
    resetTableState();

    // Skip loading if reportId is invalid
    if (!reportId) {
      console.warn("reportId is null or undefined, skipping config load");
      return;
    }

    const loadConfig = async () => {
      setIsLoadingConfig(true);

      try {
        console.log("reportId", reportId);

        // Fetch from backend using centralized client
        const response = await post("/dynamic-ui/config", {
          id: reportId,
          it_user_master_id,
          it_report_structure_id,
          branchId,
        });

        console.log("sddddddddddddd ", response);
        if (!isMounted) return;

        if (!response?.success) {
          setErrorMessage("No valid configuration found from backend.");
          setShowErrorPopup(true);
          return;
        }

        if (
          response?.success &&
          Array.isArray(response.config) &&
          response.config.length > 0
        ) {
          // Separate original + user configs
          const originalCfgObj = response.config.find(
            (c) => c.name === t("Original Configuration")
          );
          const userCfgs = response.config.filter(
            (c) => c.name !== t("Original Configuration")
          );

          const config = {
            originalName: originalCfgObj?.name || t("Original Configuration"),
            originalCfg: originalCfgObj?.cfg || {},
            userCfg: userCfgs || [],
          };

          console.log("Processed config: ", config);

          setReportConfigs(response.config);
          console.log("response.confiaaaaaaaaaag", response.config);
          setReportConfig(response.config);

          // Decide which config is active
          // const activeCfg = userCfgs.length > 0 ? userCfgs[0].cfg : config.originalCfg;
          const activeCfg = config.originalCfg;
          console.log("activeCfxxxxxxxxxg", activeCfg);

          setSelectedConfig({
            name: config.name,
            originalCfg: config.originalCfg,
            userCfg: config.userCfg,
            activeCfg: activeCfg,
          });

          // Extract placeholders
          const extractPlaceholders = (text) => {
            const matches = text?.matchAll(/{([^}]+)}/g);
            return matches
              ? Array.from(matches).map((match) => match[1].trim())
              : [];
          };

          if (activeCfg?.it_institute_header) {
            let instituteHeader = activeCfg.it_institute_header;
            console.log("instituteHeader", instituteHeader);

            if (typeof instituteHeader === "string") {
              instituteHeader = JSON.parse(instituteHeader);

              switch (currentLanguage) {
                case "en":
                  setInstituteName(instituteHeader.header_en || "N/A");
                  break;
                case "si":
                  setInstituteName(instituteHeader.header_si || "N/A");
                  break;
                case "ta":
                  setInstituteName(instituteHeader.header_ta || "N/A");
                  break;
                case "th":
                  setInstituteName(instituteHeader.header_th || "N/A");
                  break;
                default:
                  setInstituteName(instituteHeader.header_en || "N/A");
                  break;
              }
            } else {
              // If already parsed (not string)
              switch (currentLanguage) {
                case "en":
                  setInstituteName(instituteHeader.header_en || "N/A");
                  break;
                case "si":
                  setInstituteName(instituteHeader.header_si || "N/A");
                  break;
                case "ta":
                  setInstituteName(instituteHeader.header_ta || "N/A");
                  break;
                case "th":
                  setInstituteName(instituteHeader.header_th || "N/A");
                  break;
                default:
                  setInstituteName(instituteHeader.header_en || "N/A");
                  break;
              }
            }
          }

          let extracted = [];
          if (activeCfg?.heading) {
            let headingText = activeCfg.heading;
            if (typeof headingText === "string") {
              headingText = JSON.parse(headingText);
              switch (currentLanguage) {
                case "en":
                  headingText = headingText.heading_en || "N/A";
                  break;
                case "si":
                  headingText = headingText.heading_si || "N/A";
                  break;
                case "ta":
                  headingText = headingText.heading_ta || "N/A";
                  break;
                case "th":
                  headingText = headingText.heading_th || "N/A";
                  break;
                default:
                  headingText = headingText.heading_en || "N/A";
                  break;
              }
            }
            // extracted = extracted.concat(extractPlaceholders(headingText));
            extracted = headingText;
          }

          if (activeCfg?.subHeading) {
            let subHeadingText = activeCfg.subHeading;

            if (typeof subHeadingText === "string") {
              subHeadingText = JSON.parse(subHeadingText);
              switch (currentLanguage) {
                case "en":
                  subHeadingText = subHeadingText.subHeading_en || "N/A";
                  break;
                case "si":
                  subHeadingText = subHeadingText.subHeading_si || "N/A";
                  break;
                case "ta":
                  subHeadingText = subHeadingText.subHeading_ta || "N/A";
                  break;
                case "th":
                  subHeadingText = subHeadingText.subHeading_th || "N/A";
                  break;
                default:
                  subHeadingText = subHeadingText.subHeading_en || "N/A";
                  break;
              }
            }
            // extracted = extracted.concat(extractPlaceholders(subHeadingText));
            extracted = subHeadingText;
          }
          setSqlQueryPlaceholders(extracted);

          // Logo
          if (activeCfg?.Logo) {
            setLogo(activeCfg.Logo);
            setIsLogoEnabled(true);
          }

          // Get the current language code (e.g., "en", "si")

          console.log(
            "activeCfg?.fields?.include:",
            activeCfg?.fields?.include
          );

          // Build MRT columns
          const includeFields = (activeCfg?.fields?.include || [])
            .map((f) => {
              console.log(
                "Processing field f:",
                f,
                "currentLanguage:",
                currentLanguage
              );

              // Always use the English name for accessorKey (database field name)
              const englishName = typeof f === "string" ? f : f.name_en || "";

              // Get the translated name for the header display
              let displayName;
              switch (currentLanguage) {
                case "en":
                  displayName = typeof f === "string" ? f : f.name_en || "";
                  break;
                case "si":
                  displayName =
                    typeof f === "string" ? f : f.name_si || f.name_en || "";
                  break;
                case "ta":
                  displayName =
                    typeof f === "string" ? f : f.name_ta || f.name_en || "";
                  break;
                case "tl":
                  displayName =
                    typeof f === "string" ? f : f.name_tl || f.name_en || "";
                  break;
                case "th":
                  displayName =
                    typeof f === "string" ? f : f.name_th || f.name_en || "";
                  break;
                default:
                  displayName = typeof f === "string" ? f : f.name_en || "";
                  break;
              }

              console.log(
                "English name:",
                englishName,
                "Display name:",
                displayName
              );

              const fieldName =
                englishName && englishName.includes(".")
                  ? englishName.split(".").pop()
                  : englishName;
              const accessorKey = displayName ? toAccessorKey(displayName) : "";
              console.log(
                "Generated accessorKey:",
                accessorKey,
                "from field:",
                displayName
              );

              // Skip columns with empty accessorKey
              if (!accessorKey || accessorKey.trim() === "") {
                console.warn(
                  "Skipping column with empty accessorKey, field:",
                  f
                );
                return null;
              }

              // Ensure headerText is a valid string
              const headerText =
                displayName &&
                typeof displayName === "string" &&
                displayName.trim() !== ""
                  ? displayName
                  : (fieldName || englishName || "Column")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

              console.log(
                "Setting headerText:",
                JSON.stringify(headerText, null, 2)
              );

              return {
                id: accessorKey,
                accessorKey: accessorKey,
                header: headerText,
                enableColumnOrdering: true,
                enableHiding: !!(typeof f === "object" && f.isRemovable),
              };
            })
            .filter((col) => col !== null);

          // Store all column headers with language info
          const columnsData = (activeCfg?.fields?.include || [])
            .map((f) => ({
              name_en: typeof f === "string" ? f : f.name_en || "",
              name_si: typeof f === "string" ? f : f.name_si || "",
              name_ta: typeof f === "string" ? f : f.name_ta || "",
              name_tl: typeof f === "string" ? f : f.name_tl || "",
              name_th: typeof f === "string" ? f : f.name_th || "",
              id: typeof f === "object" ? f.id : null,
            }))
            .filter((col) => col.name_en); // Filter out invalid entries

          columnsDataRef.current = columnsData;

          setColumnHeaders({
            language: currentLanguage,
            columns: columnsData,
          });

          // Validate that columns have valid accessorKeys
          const validColumns = includeFields.filter(
            (col) => col && col.accessorKey && col.accessorKey.trim() !== ""
          );
          console.log(
            "Valid columns after filtering:",
            validColumns.length,
            "out of",
            includeFields.length
          );

          if (validColumns.length > 0) {
            //setColumns(validColumns);
            setColumnOrder(validColumns.map((c) => c.accessorKey));
          } else {
            console.warn(
              "No valid columns generated from config, will infer from data"
            );
            setColumns([]);
          }

          // Column visibility
          const initialVisibility = {};
          validColumns.forEach((c) => {
            if (c.accessorKey) {
              initialVisibility[c.accessorKey] = true;
            }
          });
          setColumnVisibility(initialVisibility);

          // Headings
          const newHeadings = [];
          if (activeCfg?.heading) {
            let mainHeading = activeCfg.heading;
            if (typeof mainHeading === "object") {
              switch (currentLanguage) {
                case "en":
                  mainHeading = mainHeading.heading_en || "N/A";
                  break;
                case "si":
                  mainHeading = mainHeading.heading_si || "N/A";
                  break;
                case "ta":
                  mainHeading = mainHeading.heading_ta || "N/A";
                  break;
                case "th":
                  mainHeading = mainHeading.heading_th || "N/A";
                  break;
                default:
                  mainHeading = mainHeading.heading_en || "N/A";
                  break;
              }
            }
            newHeadings.push({
              id: "main-heading",
              content: mainHeading,
              include: true,
            });
          }
          if (activeCfg?.subHeading) {
            let subHeading = activeCfg.subHeading;
            if (typeof subHeading === "object") {
              switch (currentLanguage) {
                case "en":
                  subHeading = subHeading.subHeading_en || "N/A";
                  break;
                case "si":
                  subHeading = subHeading.subHeading_si || "N/A";
                  break;
                case "ta":
                  subHeading = subHeading.subHeading_ta || "N/A";
                  break;
                case "th":
                  subHeading = subHeading.subHeading_th || "N/A";
                  break;
                default:
                  subHeading = subHeading.subHeading_en || "N/A";
                  break;
              }
            }
            newHeadings.push({
              id: "sub-heading",
              content: subHeading,
              include: true,
            });
          }

          if (
            Array.isArray(activeCfg?.headings) &&
            activeCfg.headings.length > 0
          ) {
            console.log("AAAAAAAAAAAAAAAAAAAAActive headings:");
            setHeadings(
              activeCfg.headings.map((h, idx) => ({
                id: `heading-${idx + 1}`,
                content: typeof h === "string" ? h : h.text || "",
                include:
                  typeof h === "object" && typeof h.include === "boolean"
                    ? h.include
                    : true,
                meta: h,
              }))
            );
          } else if (newHeadings.length > 0) {
            console.log("SSSSSSSSSSSSSSSSSSSSetting headings:", newHeadings);
            setHeadings(newHeadings);
          }

          // Footer
          if (activeCfg?.footer) {
            let footerContent = activeCfg.footer;
            if (typeof footerContent === "object") {
              switch (currentLanguage) {
                case "en":
                  footerContent = footerContent.footer_en || "N/A";
                  break;
                case "si":
                  footerContent = footerContent.footer_si || "N/A";
                  break;
                case "ta":
                  footerContent = footerContent.footer_ta || "N/A";
                  break;
                case "th":
                  footerContent = footerContent.footer_th || "N/A";
                  break;
                default:
                  footerContent = footerContent.footer_en || "N/A";
                  break;
              }
            }
            setFooter(footerContent);
          }

          // Search fields
          if (
            Array.isArray(activeCfg?.fields?.search) &&
            activeCfg.fields.search.length > 0
          ) {
            console.log("Running 2");
            const sf = activeCfg.fields.search.map((f, idx) => {
              console.log("Running 23");
              // const accessorKey = toAccessorKey(f);
              // console.log("Running 24", accessorKey);
              let originalName;
              switch (currentLanguage) {
                case "en":
                  originalName = typeof f === "string" ? f : f.name_en || "";
                  break;
                case "si":
                  originalName =
                    typeof f === "string" ? f : f.name_si || f.name_en || "";
                  break;
                case "ta":
                  originalName =
                    typeof f === "string" ? f : f.name_ta || f.name_en || "";
                  break;
                case "tl":
                  originalName =
                    typeof f === "string" ? f : f.name_tl || f.name_en || "";
                  break;
                case "th":
                  originalName =
                    typeof f === "string" ? f : f.name_th || f.name_en || "";
                  break;
                default:
                  originalName = typeof f === "string" ? f : f.name || "";
                  break;
              }
              console.log("Running 25", originalName);
              // if (!originalName) {
              //   console.log("No original name found for field:", f);
              //   //originalName = "unknown_field";
              // }
              const accessorKey = toAccessorKey(originalName);
              // Generate unique ID using timestamp and index to avoid duplicate keys
              return {
                id: `${Date.now()}-${idx}`,
                column: accessorKey,
                value: "",
              };
            });
            //setSearchFields(sf);
          } else {
            // setSearchFields([{ id: "1", column: "qq", value: "" }]);
          }
        } else {
          console.warn("⚠️ No valid configs returned from backend");

          setError("No configurations found for this report.");
        }
      } catch (err) {
        console.error("❌ Error loading config:", err);

        setError("Failed to load report config.");
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [reportId]);

  useEffect(() => {
    setColumnHeaders({
      language: currentLanguage,
      columns: columnsDataRef.current,
    });

    setSearchFields([]);

    if (!selectedConfig?.activeCfg) return;

    const activeCfg = selectedConfig.activeCfg;
    console.log("activeCfgssss", activeCfg);

    const searchArray = activeCfg.fields?.search || [];
    setSearchValues(searchArray); // keeps the 5 you saw above
    console.log("searchAvsbdrray", searchArray);

    // Rebuild UI from activeCfg
    const extractPlaceholders = (text) => {
      const matches = text?.matchAll(/{([^}]+)}/g);
      return matches ? Array.from(matches).map((match) => match[1].trim()) : [];
    };

    let extracted = [];
    if (activeCfg?.heading) {
      let headingText = activeCfg.heading;
      if (typeof headingText === "object") {
        switch (currentLanguage) {
          case "en":
            headingText = headingText.heading_en || "N/A";
            break;
          case "si":
            headingText = headingText.heading_si || "N/A";
            break;
          case "ta":
            headingText = headingText.heading_ta || "N/A";
            break;
          case "th":
            headingText = headingText.heading_th || "N/A";
            break;
          default:
            headingText = headingText.heading_en || "N/A";
            break;
        }
      }
      extracted = extracted.concat(extractPlaceholders(headingText));
    }
    if (activeCfg?.subHeading) {
      let subHeadingText = activeCfg.subHeading;
      if (typeof subHeadingText === "object") {
        switch (currentLanguage) {
          case "en":
            subHeadingText = subHeadingText.subHeading_en || "N/A";
            break;
          case "si":
            subHeadingText = subHeadingText.subHeading_si || "N/A";
            break;
          case "ta":
            subHeadingText = subHeadingText.subHeading_ta || "N/A";
            break;
          case "th":
            subHeadingText = subHeadingText.subHeading_th || "N/A";
            break;
          default:
            subHeadingText = subHeadingText.subHeading_en || "N/A";
            break;
        }
      }
      extracted = extracted.concat(extractPlaceholders(subHeadingText));
    }
    setSqlQueryPlaceholders(extracted);

    if (activeCfg?.Logo) {
      setLogo(activeCfg.Logo);
      setIsLogoEnabled(true);
    } else {
      setIsLogoEnabled(false);
    }

    // Build columns
    // In useEffect
    const includeFields = (activeCfg?.fields?.include || [])
      .map((f) => {
        // ALWAYS use English name for accessorKey (this never changes)
        const englishName = typeof f === "string" ? f : f.name_en || "";

        // Get translated name for DISPLAY only
        let displayName;
        switch (currentLanguage) {
          case "en":
            displayName = typeof f === "string" ? f : f.name_en || "";
            break;
          case "si":
            displayName =
              typeof f === "string" ? f : f.name_si || f.name_en || "";
            break;
          case "ta":
            displayName =
              typeof f === "string" ? f : f.name_ta || f.name_en || "";
            break;
          case "tl":
            displayName =
              typeof f === "string" ? f : f.name_tl || f.name_en || "";
            break;
          case "th":
            displayName =
              typeof f === "string" ? f : f.name_th || f.name_en || "";
            break;
          default:
            displayName = typeof f === "string" ? f : f.name_en || "";
            break;
        }
        console.log("dddd", displayName);

        if (!englishName) {
          return null;
        }

        // Use ENGLISH name for accessorKey (stable, never changes)
        const accessorKey = toAccessorKey(englishName);
        console.log("dddssssd", accessorKey);
        // Skip columns with empty accessorKey
        if (!accessorKey || accessorKey.trim() === "") {
          console.warn(
            "Skipping column with empty accessorKey in useEffect, field:",
            f
          );
          return null;
        }

        // Use TRANSLATED name for header display
        //const headerText = displayName || englishName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const headerText = displayName;

        console.log(
          "AccessorKey (stable):",
          accessorKey,
          "Header (translated):",
          headerText
        );

        return {
          id: accessorKey,
          accessorKey: accessorKey, // Always English-based, stable
          header: headerText, // Translated, changes with language
          enableColumnOrdering: true,
          enableHiding: !!(typeof f === "object" && f.isRemovable),
        };
      })
      .filter((col) => col !== null);
    console.log(
      "Setting columns (useEffect):",
      JSON.stringify(includeFields, null, 2)
    );
    if (dataDoneLoading === true) {
      setColumns(includeFields);
      setColumnOrder(includeFields.map((c) => c.accessorKey));
    }

    const initialVisibility = {};
    includeFields.forEach((c) => {
      initialVisibility[c.accessorKey] = true;
    });
    setColumnVisibility(initialVisibility);

    // Headings
    const newHeadings = [];
    if (activeCfg?.heading) {
      let mainHeading = activeCfg.heading;
      if (typeof mainHeading === "object") {
        switch (currentLanguage) {
          case "en":
            mainHeading = mainHeading.heading_en || "N/A";
            break;
          case "si":
            mainHeading = mainHeading.heading_si || "N/A";
            break;
          case "ta":
            mainHeading = mainHeading.heading_ta || "N/A";
            break;
          case "th":
            mainHeading = mainHeading.heading_th || "N/A";
            break;
          default:
            mainHeading = mainHeading.heading_en || "N/A";
            break;
        }
      }
      newHeadings.push({
        id: "main-heading",
        content: mainHeading,
        include: true,
      });
    }
    if (activeCfg?.subHeading) {
      // Handle multiple subheadings (array) or single subheading (object)
      if (Array.isArray(activeCfg.subHeading)) {
        activeCfg.subHeading.forEach((sub, index) => {
          let subHeadingContent = sub;
          if (typeof sub === "object") {
            switch (currentLanguage) {
              case "en":
                subHeadingContent = sub.subHeading_en;
                break;
              case "si":
                subHeadingContent = sub.subHeading_si;
                break;
              case "ta":
                subHeadingContent = sub.subHeading_ta;
                break;
              case "th":
                subHeadingContent = sub.subHeading_th;
                break;
              default:
                subHeadingContent = sub.subHeading_en;
                break;
            }
          }

          // Skip if it’s the 3rd subheading and content is missing
          if (
            index === 1 &&
            (!subHeadingContent || subHeadingContent.trim() === "")
          ) {
            return; // skip this iteration
          }

          // Default fallback if content is missing (except 3rd one skipped above)
          if (!subHeadingContent || subHeadingContent.trim() === "") {
            subHeadingContent = "N/A";
          }

          newHeadings.push({
            id: `sub-heading-${index + 1}`,
            content: subHeadingContent,
            include: true,
          });
        });
      } else {
        // Single subheading
        let subHeading = activeCfg.subHeading;
        if (typeof subHeading === "object") {
          switch (currentLanguage) {
            case "en":
              subHeading = subHeading.subHeading_en || "N/A";
              break;
            case "si":
              subHeading = subHeading.subHeading_si || "N/A";
              break;
            case "ta":
              subHeading = subHeading.subHeading_ta || "N/A";
              break;
            case "th":
              subHeading = subHeading.subHeading_th || "N/A";
              break;
            default:
              subHeading = subHeading.subHeading_en || "N/A";
              break;
          }
        }
        newHeadings.push({
          id: "sub-heading",
          content: subHeading,
          include: true,
        });
      }
    }

    if (Array.isArray(activeCfg?.headings) && activeCfg.headings.length > 0) {
      setHeadings(
        activeCfg.headings.map((h, idx) => ({
          id: `heading-${idx + 1}`,
          content: typeof h === "string" ? h : h.text || "",
          include:
            typeof h === "object" && typeof h.include === "boolean"
              ? h.include
              : true,
          meta: h,
        }))
      );
    } else if (newHeadings.length > 0) {
      setHeadings(newHeadings);
    }

    //change the setInstitute names here again with the language chnages

    if (activeCfg?.it_institute_header) {
      let instituteHeader = activeCfg.it_institute_header;
      console.log("instituteHeader", instituteHeader);

      if (typeof instituteHeader === "string") {
        instituteHeader = JSON.parse(instituteHeader);

        switch (currentLanguage) {
          case "en":
            setInstituteName(instituteHeader.header_en || "N/A");
            break;
          case "si":
            setInstituteName(instituteHeader.header_si || "N/A");
            break;
          case "ta":
            setInstituteName(instituteHeader.header_ta || "N/A");
            break;
          case "th":
            setInstituteName(instituteHeader.header_th || "N/A");
            break;
          default:
            setInstituteName(instituteHeader.header_en || "N/A");
            break;
        }
      } else {
        // If already parsed (not string)
        switch (currentLanguage) {
          case "en":
            setInstituteName(instituteHeader.header_en || "N/A");
            break;
          case "si":
            setInstituteName(instituteHeader.header_si || "N/A");
            break;
          case "ta":
            setInstituteName(instituteHeader.header_ta || "N/A");
            break;
          case "th":
            setInstituteName(instituteHeader.header_th || "N/A");
            break;
          default:
            setInstituteName(instituteHeader.header_en || "N/A");
            break;
        }
      }
    }

    // Populate headingsData from activeCfg
    if (activeCfg?.heading || activeCfg?.subHeading || activeCfg?.footer) {
      const newHeadingsData = {
        heading: (() => {
          const headingObj = activeCfg.heading || {};
          // Preserve all language fields if they exist
          const result = {};
          ["en", "si", "ta", "th", "tl"].forEach((lang) => {
            if (headingObj[`heading_${lang}`] !== undefined) {
              result[`heading_${lang}`] = headingObj[`heading_${lang}`];
            }
          });
          // If no languages found, create with current language
          if (Object.keys(result).length === 0) {
            const currentLanguage = i18n.language;
            result[`heading_${currentLanguage}`] = "";
          }
          return result;
        })(),
        subHeading: (() => {
          if (Array.isArray(activeCfg.subHeading)) {
            return activeCfg.subHeading.map((sub) => {
              // Preserve all language fields for each subheading
              const result = {};
              ["en", "si", "ta", "th", "tl"].forEach((lang) => {
                if (sub[`subHeading_${lang}`] !== undefined) {
                  result[`subHeading_${lang}`] = sub[`subHeading_${lang}`];
                }
              });
              return result;
            });
          } else if (activeCfg.subHeading) {
            // Single subheading case - preserve all languages
            const result = {};
            ["en", "si", "ta", "th", "tl"].forEach((lang) => {
              if (activeCfg.subHeading[`subHeading_${lang}`] !== undefined) {
                result[`subHeading_${lang}`] =
                  activeCfg.subHeading[`subHeading_${lang}`];
              }
            });
            return [result];
          }
          return [];
        })(),
        footer: (() => {
          const footerObj = activeCfg.footer || {};
          // Preserve all language fields if they exist
          const result = {};
          ["en", "si", "ta", "th", "tl"].forEach((lang) => {
            if (footerObj[`footer_${lang}`] !== undefined) {
              result[`footer_${lang}`] = footerObj[`footer_${lang}`];
            }
          });
          // If no languages found, create with current language
          if (Object.keys(result).length === 0) {
            const currentLanguage = i18n.language;
            result[`footer_${currentLanguage}`] = "";
          }
          return result;
        })(),
      };
      setHeadingsData(newHeadingsData);
    }

    // Footer
    if (activeCfg?.footer) {
      let footerContent = activeCfg.footer;
      if (typeof footerContent === "object") {
        switch (currentLanguage) {
          case "en":
            footerContent = footerContent.footer_en || "N/A";
            break;
          case "si":
            footerContent = footerContent.footer_si || "N/A";
            break;
          case "ta":
            footerContent = footerContent.footer_ta || "N/A";
            break;
          case "th":
            footerContent = footerContent.footer_th || "N/A";
            break;
          default:
            footerContent = footerContent.footer_en || "N/A";
            break;
        }
      }
      setFooter(footerContent);
    }

    if (!activeCfg?.footer) {
      setFooter("");
    }

    // Search fields - Auto-populate from UISearch if available
    if (Array.isArray(activeCfg?.UISearch) && activeCfg.UISearch.length > 0) {
      console.log("Loading UISearch data:", activeCfg.UISearch);
      // Map UISearch array to search fields with column and value
      const uiSearchFields = activeCfg.UISearch.map((item, idx) => {
        const accessorKey = toAccessorKey(item.column);
        return {
          id: `${Date.now()}-${idx}`,
          column: accessorKey,
          value: item.value || "",
        };
      });
      setSearchFields(uiSearchFields);
      console.log(
        "Auto-populated search fields from UISearch:",
        uiSearchFields
      );
    }

    if (
      Array.isArray(activeCfg?.fields?.search) &&
      activeCfg.fields.search.length > 0
    ) {
      console.log("Running 3");
      const sf = activeCfg.fields.search.map((f, idx) => {
        console.log("Running 31");
        let name;
        switch (currentLanguage) {
          case "en":
            name = typeof f === "string" ? f : f.name_en || "";
            break;
          case "si":
            name = typeof f === "string" ? f : f.name_si || f.name_en || "";
            break;
          case "ta":
            name = typeof f === "string" ? f : f.name_ta || f.name_en || "";
            break;
          case "tl":
            name = typeof f === "string" ? f : f.name_tl || f.name_en || "";
            break;
          case "th":
            name = typeof f === "string" ? f : f.name_th || f.name_en || "";
            break;
          default:
            name = typeof f === "string" ? f : f.name_en || "";
            break;
        }
        // if (!name) {
        //   name = "unknown_field";
        // }

        console.log("Running 32", name);
        const accessorKey = toAccessorKey(name);
        // Generate unique ID using timestamp and index to avoid duplicate keys
        return { id: `${Date.now()}-${idx}`, column: accessorKey, value: "" };
      });
      //setSearchFields(sf);
    }

    // Clear loading state after configuration is processed
    setIsLoadingConfig(false);
  }, [selectedConfig, currentLanguage]);

  useEffect(() => {
    if (
      selectedConfig?.activeCfg?.columnVisibility &&
      Object.keys(selectedConfig.activeCfg.columnVisibility).length > 0 &&
      columns.length > 0 // <-- ensures columns are ready
    ) {
      const activeCfg = selectedConfig.activeCfg;
      console.log("activeCfg.columnVisibility 1", activeCfg.columnVisibility);

      const merged = {
        ...Object.fromEntries(columns.map((col) => [col.accessorKey, true])),
        ...activeCfg.columnVisibility,
      };

      console.log("activeCfg.columnVisibility 2", merged);
      setColumnVisibility(merged);
    }

    if (
      selectedConfig?.activeCfg?.columnOrder &&
      Object.keys(selectedConfig.activeCfg.columnOrder).length > 0 &&
      columns.length > 0 // <-- ensures columns are ready
    ) {
      const activeCfg = selectedConfig.activeCfg;
      console.log("activeCfg.columnOrder 1", activeCfg.columnOrder);

      const merged = {
        ...Object.fromEntries(columns.map((col) => [col.accessorKey, true])),
        ...activeCfg.columnOrder,
      };

      console.log("activeCfg.columnOrder 2", merged);
      setColumnVisibility(merged);
    }
  }, [selectedConfig, columns]);

  // handle input changes forsa each pair
  const handleInputChange = (name, field, newValue) => {
    // Update filters state (if still used elsewhere)
    setFilters((prev) => {
      const updated = [...prev];

      // Find by name if index is not reliable
      const targetIndex = updated.findIndex(
        (f) => f.name?.trim().toLowerCase() === name?.trim().toLowerCase()
      );

      if (targetIndex !== -1) {
        updated[targetIndex][field] = newValue;
      } else {
        updated.push({ name, [field]: newValue });
      }

      // ✅ Update filterFields to attach or update the value
      setFilterFields((prevFields) => {
        const filtersCopy = (Array.isArray(prevFields) ? prevFields : []).map(
          (f) => {
            if (
              f.name_en?.trim().toLowerCase() === name?.trim().toLowerCase()
            ) {
              return { ...f, value: newValue }; // update or add value
            }
            return f;
          }
        );

        // Optional: if not found, add new entry
        const found = filtersCopy.some(
          (f) => f.name_en?.trim().toLowerCase() === name?.trim().toLowerCase()
        );
        if (!found) {
          filtersCopy.push({
            name_en: name,
            value: newValue,
            isRemovable: true,
          });
        }

        console.log("✅ Updated filterFields:", filtersCopy);
        return [...filtersCopy]; // return new reference
      });

      return updated;
    });
  };

  useEffect(() => {
    console.log("filterFields state changed:", filterFields);
  }, [filterFields]);

  useEffect(() => {
    console.log("filterFisdhtjelds:", filterFields);
  }, [filterFields]);

  // add new name-value couple
  const addFilterPair = () => {
    setFilters((prev) => [...prev, { name: "", value: "" }]);
  };

  // remove filter pair by index
  const removeFilterPair = (index) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const getActiveSearchNames = () => {
    if (!selectedConfig?.activeCfg) {
      console.warn("No activeCfg found");
      return [];
    }

    const activeCfg = selectedConfig.activeCfg;

    const names = Array.isArray(activeCfg.fields?.search)
      ? activeCfg.fields.search
          .filter((item) => item.isRemovable === true) // ✅ only take removable ones
          .map((item) => item.name_en)
          .filter(Boolean) // make sure name_en is not empty
      : [];

    console.log("Runningssds", names);

    return names;
  };

  useEffect(() => {
    if (selectedConfig?.activeCfg?.fields?.search) {
      const searchArray = selectedConfig.activeCfg.fields.search.map((f) => ({
        ...f,
      }));
      setFilterFields(searchArray); // set initial array once
      console.log("Initialized filterFields:", searchArray);
    }
  }, [selectedConfig?.activeCfg]);

  const generateAndSendSQL = async (selectedConfig, filters) => {
    console.log("genaratingthings 0: Start function");

    if (!selectedConfig?.activeCfg?.modifiedQuery) {
      console.error(
        "genaratingthings 1: No modifiedQuery found in selectedConfig"
      );
      return;
    }

    let { modifiedQuery } = selectedConfig.activeCfg;
    console.log("genaratingthings 2: modifiedQuery:", modifiedQuery);

    let upperSql = modifiedQuery.toUpperCase();
    console.log("genaratingthings 3: upperSql:", upperSql);

    const whereIndex = upperSql.indexOf("WHERE");
    if (whereIndex === -1) {
      console.error(
        "genaratingthings 4: SQL has no WHERE clause — cannot append filters properly"
      );
      return;
    }
    console.log("genaratingthings 5: whereIndex:", whereIndex);

    // Detect positions for GROUP BY / ORDER BY / LIMIT
    const groupIndex = upperSql.indexOf("GROUP BY");
    const orderIndex = upperSql.indexOf("ORDER BY");
    const limitIndex = upperSql.indexOf("LIMIT");
    console.log(
      "genaratingthings 6: groupIndex:",
      groupIndex,
      "orderIndex:",
      orderIndex,
      "limitIndex:",
      limitIndex
    );

    // find nearest clause position after WHERE
    const nextClauseIndex =
      [groupIndex, orderIndex, limitIndex]
        .filter((i) => i !== -1)
        .sort((a, b) => a - b)[0] || modifiedQuery.length;
    console.log("genaratingthings 7: nextClauseIndex:", nextClauseIndex);

    const beforeWhere = modifiedQuery.slice(0, whereIndex + 5);
    const whereToNextClause = modifiedQuery.slice(
      whereIndex + 5,
      nextClauseIndex
    );
    const afterNextClause = modifiedQuery.slice(nextClauseIndex);
    console.log("genaratingthings 8: beforeWhere:", beforeWhere);
    console.log("genaratingthings 9: whereToNextClause:", whereToNextClause);
    console.log("genaratingthings 10: afterNextClause:", afterNextClause);

    // Build AND conditions
    const additional = filters
      .filter((f) => f.name && f.value)
      .map((f) => ` ${f.name} = '${f.value}'`)
      .join(" AND ");
    console.log(
      "genaratingthings 11: additional filter conditions:",
      additional
    );

    const hasExisting = whereToNextClause.trim().length > 0;
    console.log("genaratingthings 12: hasExisting:", hasExisting);

    const finalSQL = `${beforeWhere} ${whereToNextClause.trim()}${hasExisting ? " AND " : ""}${additional} ${afterNextClause}`;
    console.log("genaratingthings 13: finalSQL:", finalSQL);

    console.log("genaratingthings 14:", filters);

    try {
      const reportData = await generateReport();

      if (reportData) {
        console.error("genaratingthings 15", reportData);
      }
    } catch (err) {
      console.error("genaratingthings 16: Error sending SQL:", err);
    }

    console.log("genaratingthings 17: End function");
  };

  const fetchData = useCallback(
    async (options = {}, cfg = null) => {
      // options: { pageIndex, pageSize, filters, sorting, columnOrder }

      setIsLoadingData(true);
      setError(null);

      try {
        let payload, params;
        if (options?.sqlData && Array.isArray(options.sqlData)) {
          // Filter out null, undefined, or empty string values
          params = options.sqlData.filter(
            (item) =>
              item?.value !== null &&
              item?.value !== undefined &&
              item?.value !== ""
          );
        }
        console.log("options.sqlData", params);
        payload = {
          params: params,
          reportID: Number(reportId),
        };

        console.log("jsoedfjn", payload);
        // Fetch data using centralized API client (server expects POST to /table_data with body)
        let json = await post("/dynamic-ui/table_data", payload);

        if (json?.columns && json?.table_data?.length) {
          const orderedData = json.table_data.map((row) => {
            const orderedRow = {};
            json.columns.forEach((col) => {
              orderedRow[col] = row[col];
            });
            return orderedRow;
          });

          json.table_data = orderedData; // store back to same object
        }

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
          total = typeof json.total === "number" ? json.total : rows.length;
        }
        console.log("rows", rows[0]);
        console.log("reportConfig", reportConfig);
        console.log("columns", columns);

        const activeCfg = selectedConfig.activeCfg;

        let columnsToUse = columns;

        if (columns.length === 0 && rows.length > 0) {
          const inferred = Object.keys(rows[0]).map((k) => {
            // Always match against English name (since SQL returns English keys)
            const englishKey = k.split(".").slice(-1)[0] || k;

            // Correct path: reportConfig is already an array!
            const fieldsInclude = reportConfig?.[0]?.cfg?.fields?.include || [];

            // Find config using the English key
            const fieldConfig = fieldsInclude.find(
              (include) => include.name_en === englishKey
            );

            console.log("fieldCosaaaaaaaaanfig", fieldConfig);

            // Get the translated header based on current language
            let header;
            if (fieldConfig) {
              switch (currentLanguage) {
                case "si":
                  header =
                    fieldConfig.name_si || fieldConfig.name_en || englishKey;
                  break;
                case "ta":
                  header =
                    fieldConfig.name_ta || fieldConfig.name_en || englishKey;
                  break;
                case "tl":
                  header =
                    fieldConfig.name_tl || fieldConfig.name_en || englishKey;
                  break;
                case "th":
                  header =
                    fieldConfig.name_th || fieldConfig.name_en || englishKey;
                  break;
                default: // "en"
                  header = fieldConfig.name_en || englishKey;
              }
            } else {
              // Fallback: format the English key nicely
              header = englishKey
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
            }

            console.log("header", header);
            const isRemovable = fieldConfig ? fieldConfig.isRemovable : true;
            const accessorKey = toAccessorKey(k);

            return {
              id: accessorKey,
              accessorKey: accessorKey,
              header: header,
              enableColumnOrdering: true,
              enableHiding: isRemovable,
              isRemovable: isRemovable,

              muiTableBodyCellProps: {
                align: fieldConfig?.alignment || "left",
              },
            };
          });

          const filteredInferred = inferred.filter(
            (col) =>
              !Array.isArray(sqlQueryPlaceholders) ||
              !sqlQueryPlaceholders.includes(fromAccessorKey(col.accessorKey))
          );

          console.log(
            "Setting inferred columns:",
            JSON.stringify(filteredInferred, null, 2)
          );
          setColumns(filteredInferred);
          console.log("filteredInferred", filteredInferred);

          const initialVisibility = {};
          filteredInferred.forEach(
            (c) => (initialVisibility[c.accessorKey] = true)
          );
          setColumnVisibility(initialVisibility);

          if (selectedConfig?.activeCfg?.columnOrder) {
            console.log("SELECTED CONFIG RUNNING!");
            setColumnOrder(selectedConfig?.activeCfg?.columnOrder);
          } else {
            console.log("SELECTED CONFIG NOT RUNNING!");
            setColumnOrder(filteredInferred.map((c) => c.accessorKey));
          }

          // Use the inferred columns for distinct values calculation
          columnsToUse = filteredInferred;
        }
        // Map server row fields (with dots) into accessorKey fields for table
        const mappedRows = rows.map((r) => {
          const mapped = {};
          // prefer config.fields.include order if available
          const useFields =
            reportConfig?.fields?.include && reportConfig.fields.include.length
              ? reportConfig.fields.include
              : Object.keys(r);
          useFields.forEach((f) => {
            let originalName;
            switch (currentLanguage) {
              case "en":
                originalName = typeof f === "string" ? f : f.name_en || "";
                break;
              case "si":
                originalName =
                  typeof f === "string" ? f : f.name_si || f.name_en || "";
                break;
              case "ta":
                originalName =
                  typeof f === "string" ? f : f.name_ta || f.name_en || "";
                break;
              case "tl":
                originalName =
                  typeof f === "string" ? f : f.name_tl || f.name_en || "";
                break;
              case "th":
                originalName =
                  typeof f === "string" ? f : f.name_th || f.name_en || "";
                break;
            }

            const accessor = toAccessorKey(originalName);
            const val =
              getValueByPath(r, originalName) ??
              r[originalName] ??
              (() => {
                // fallback: try direct key if server used same accessor
                return r[accessor] ?? "";
              })();
            mapped[accessor] = val;
          });

          // Also include any other keys not in include list
          Object.keys(r).forEach((k) => {
            const accessor = toAccessorKey(k);
            if (!(accessor in mapped)) mapped[accessor] = r[k];
          });

          return mapped;
        });
        console.log("Mapped Rows:", mappedRows);

        // Format date values in mappedRows to YYYY-MM-DD
        const formattedRows = mappedRows.map((row) => {
          const newRow = { ...row };
          for (const key in newRow) {
            if (
              typeof newRow[key] === "string" &&
              moment(newRow[key], moment.ISO_8601, true).isValid()
            ) {
              newRow[key] = moment(newRow[key]).format("YYYY-MM-DD");
            }
          }
          return newRow;
        });

        console.log("Formatted Rows:", formattedRows);
        setTableData(formattedRows);
        setTotalRows(total);

        // Calculate and set distinct values for each column (use columnsToUse which may be inferred)
        const newColumnDistinctValues = {};
        columnsToUse.forEach((col) => {
          console.log("[fetchData] columnss:", columnsToUse);
          const accessorKey = col.accessorKey;
          const distincts = [
            ...new Set(
              formattedRows
                .map((row) => row[accessorKey])
                .filter(
                  (val) => val !== undefined && val !== null && val !== ""
                )
            ),
          ].sort();
          newColumnDistinctValues[accessorKey] = distincts;
          console.log(
            "[fetchData] Column:",
            accessorKey,
            "Distincts:",
            distincts
          );
        });

        // Merge new distinct values instead of replacing to preserve any API-fetched values
        setColumnDistinctValues((prev) => ({
          ...prev,
          ...newColumnDistinctValues,
        }));
        console.log(
          "[fetchData] columnDistinctValues:",
          newColumnDistinctValues
        );

        return formattedRows;
      } catch (err) {
        console.error("fetchData error", err);
        setError(err.message || "Failed to fetch data");
      } finally {
        setIsLoadingData(false);
        setDataDoneLoading(true);
      }
    },
    [
      reportConfig,
      columnOrder,
      columns,
      pagination.pageSize,
      pagination.pageIndex,
      sorting,
    ]
  );

  console.log("setColumnHeaders", columnHeaders);

  // Function to fetch distinct values for a given column
  const fetchDistinctValues = useCallback(async (columnName) => {
    if (!columnName) return;
    try {
      // Use centralized GET client
      const json = await get(
        `/dynamic-ui/distinct_values/1?column=${columnName}`
      );

      setColumnDistinctValues((prev) => ({
        ...prev,
        [columnName]: json.distinctValues || [],
      }));
    } catch (err) {
      console.error(`Error fetching distinct values for ${columnName}:`, err);
      setError(null);
      setError(
        err.message || `Failed to fetch distinct values for ${columnName}`
      );
    }
  }, []);

  let globalRes = null;

  // Build filters (accessorKey -> value) from searchFields
  const buildFilterPayloadFromSearchFields = () => {
    const payload = {};
    searchFields.forEach((f) => {
      if (f.column && f.value !== undefined && f.value !== "") {
        payload[f.column] = f.value;
      }
    });
    return payload;
  };

  // Utility: get selected columns except current
  // const getSelectedColumns = (currentId) => {
  //   return searchFields
  //     .filter(field => field.id !== currentId && field.column)
  //     .map(field => field.column);
  // };

  const getSelectedColumns = (currentId) => {
    return searchFields
      .filter((field) => field.id !== currentId && field.column)
      .map((field) => field.column);
  };

  // Add / remove / change search fields
  const addSearchField = () => {
    const newId = Date.now().toString();
    setSearchFields((prev) => [...prev, { id: newId, column: "", value: "" }]);
  };
  const removeSearchField = (id) => {
    setSearchFields((prev) => prev.filter((f) => f.id !== id));
  };
  const resetSearchFields = () => {
    setSearchFields([]);
    setError(null);
    setSuccess(null);
  };
  const handleColumnSelect = (id, accessorKey) => {
    console.log("[handleColumnSelect] Selected column:", accessorKey);
    setSearchFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, column: accessorKey, value: "" } : f
      )
    );
    console.log(
      "[handleColumnSelect] columnDistinctValues:",
      columnDistinctValues[accessorKey]
    );
    // Now columnDistinctValues[accessorKey] will exist
    //fetchDistinctValues(accessorKey);
  };

  const handleValueChange = (id, value) => {
    setSearchFields((prev) => {
      const updatedFields = prev.map((f) =>
        f.id === id ? { ...f, value } : f
      );
      // Trigger filter application immediately
      applyFilters(updatedFields); // Pass updated fields directly
      return updatedFields;
    });
  };

  const isBackendFilterPreferred = useCallback(
    (currentSearchFields = searchFields) => {
      if (totalRows >= BACKEND_THRESHOLD) return true;

      const dateField = currentSearchFields.find(
        (sf) => /date/i.test(sf.column || "") && sf.value
      );
      if (dateField && typeof dateField.value === "string") {
        // check if they entered a range "start|end" or "start - end"
        const v = dateField.value;
        const parts = v
          .split(/[-|,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          try {
            const d0 = new Date(parts[0]),
              d1 = new Date(parts[1]);
            if (!isNaN(d0) && !isNaN(d1) && d1 - d0 > DATE_RANGE_BACKEND_MS)
              return true;
          } catch (e) {}
        }
      }

      return false;
    },
    [totalRows, BACKEND_THRESHOLD]
  );

  const applyFilters = useCallback(
    async (currentSearchFields = searchFields) => {
      setError(null);
      setSuccess(null);

      const filtersPayload = currentSearchFields.reduce((acc, f) => {
        if (f.column && f.value !== undefined && f.value !== "") {
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
          const fetchOptions =
            Object.keys(filtersPayload).length > 0
              ? {
                  pageIndex: 0,
                  pageSize: pagination.pageSize,
                  filters: filtersPayload,
                  sorting,
                  columnOrder,
                }
              : {
                  pageIndex: 0,
                  pageSize: pagination.pageSize,
                  sorting,
                  columnOrder,
                };
          await fetchData(fetchOptions);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        } catch (err) {
          console.error(err);
          setError(err.message || "Server filtering failed");
        } finally {
          setIsLoadingData(false);
        }
      } else {
        // client-side filtering is handled by the filteredData useMemo hook
        // No explicit action needed here other than ensuring searchFields state is updated
        // The filteredData useMemo hook will react to changes in searchFields and tableData
      }
    },
    [
      setError,
      setSuccess,
      isBackendFilterPreferred,
      reportId,
      fetchData,
      setTableData,
      setTotalRows,
      setIsLoadingData,
      columns,
      columnOrder,
      sorting,
      pagination,
      setPagination,
    ]
  );

  const handleExport = async (format) => {
    setShowExportDropdown(false);
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, headers } = getExportableData();

      switch (format) {
        case "csv":
          // `react-csv` handles this beautifully with a component
          // You'll need to change the implementation slightly for CSV. See below.
          break;

        case "xlsx":
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
          XLSX.writeFile(
            workbook,
            `report_${new Date().toISOString().slice(0, 10)}.xlsx`
          );
          break;

        case "pdf":
          const doc = new jsPDF();
          autoTable(doc, {
            head: [headers],
            body: data.map(Object.values),
          });
          doc.save(`report_${new Date().toISOString().slice(0, 10)}.pdf`);
          break;

        case "doc":
          // Word export is more complex on the client-side.
          // It generally involves generating an HTML table and then using a library like docx or docx-templates.
          // A simpler, but less robust, approach is to create a simple HTML string and download it as a .doc file.
          // This is a basic example and might not preserve complex styles.
          const htmlTable = `
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  ${Object.values(row)
                    .map((value) => `<td>${value}</td>`)
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `;
          const blob = new Blob([htmlTable], { type: "application/msword" });
          saveAs(blob, `report_${new Date().toISOString().slice(0, 10)}.doc`);
          break;

        default:
          throw new Error("Unsupported export format");
      }

      // toast.success('Export successful!');
    } catch (err) {
      console.error(err);
      setError(err.message || "Export failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = async (options) => {
    setGenarateDone(false);
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    console.log("generateReportoptions:", options);

    try {
      console.log("fetchedDassssssssssssssta", filters);
      // 1. Await the data and store it in a variable.
      const fetchedData = await fetchData({
        sqlData: filters,
        reportid: reportId,
      });

      const firstRowData = fetchedData.length > 0 ? fetchedData[0] : {};

      // 2. Populate a new headings array using the new data.
      const updatedHeadings = headings.map((h) => ({
        ...h,
        content: populatePlaceholders(h.content, firstRowData),
      }));

      console.log("headingsinfetch", updatedHeadings);

      // 3. MOST IMPORTANT STEP: Update the state that the UI is bound to.
      setHeadings(updatedHeadings);

      // 4. Populate and update the footer state as well.
      const updatedFooter = populatePlaceholders(footer, firstRowData);
      setFooter(updatedFooter);

      setGenarateDone(true);

      setReportData({
        fetchedData,
        updatedHeadings,
        updatedFooter,
      });
      console.log("repoaaaaaaaaaaaaaaaaaaaaaaaaaaaartData", reportData);

      return reportData;
    } catch (err) {
      console.error(err);
      setError(err.message || "Report generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  let getExportableData = () => {
    // Get the data that is currently displayed in the table (after filters and sorting)
    const dataToExport = filteredData || tableData;

    // Get the columns that are currently visible and in the correct order
    const visibleColumns = columnOrder
      .map((key) => columns.find((c) => c.accessorKey === key))
      .filter((c) => columnVisibility[c.accessorKey]);

    // Map the data to a new array of objects, with only the visible columns
    const formattedData = dataToExport.map((row) => {
      const newRow = {};
      visibleColumns.forEach((col) => {
        newRow[col.header] = row[col.accessorKey];
      });
      return newRow;
    });

    return {
      data: formattedData,
      headers: visibleColumns.map((col) => col.header),
    };
  };

  // Sync widths for cards (your existing logic)
  useEffect(() => {
    const syncWidths = () => {
      const tableCard = document.querySelector(".table-card");
      const searchCard = document.querySelector(".search-card");
      const headercard = document.querySelector(".headings-card");

      if (tableCard && searchCard) {
        const tableCardWidth = tableCard.offsetWidth;
        searchCard.style.width = `${tableCardWidth}px`;
        searchCard.style.maxWidth = "100%";
      }
    };
    syncWidths();
    const handleResize = () => syncWidths();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdowns when clicking outside (export and column filter)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        columnFilterRef.current &&
        !columnFilterRef.current.contains(event.target)
      ) {
        setShowColumnFilter(false);
      }
      if (
        exportButtonRef.current &&
        !exportButtonRef.current.contains(event.target)
      ) {
        setShowExportDropdown(false);
      }
    };
    if (showColumnFilter || showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

    return tableData.filter((row) => {
      return searchFields.every((field) => {
        if (!field.column || !field.value) return true;
        const cellValue = String(row[field.column] ?? "").trim();
        const searchValue = String(field.value).trim();
        return cellValue.startsWith(searchValue);
      });
    });
  }, [
    tableData,
    searchFields,
    reportConfig,
    columns,
    isBackendFilterPreferred,
  ]);

  // initial columnVisibility defaults (if not set)
  useEffect(() => {
    if (!columns || columns.length === 0) return;
    setColumnVisibility((prev) => {
      const next = { ...prev };
      columns.forEach((c) => {
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

  const getCanvasOffset = () => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  };

  // Start dragging from toolbox
  const handleToolDragStart = (tool) => (e) => {
    e.dataTransfer.setData("text/plain", tool.type);
    setDraggingTool(tool.type);
  };

  const handleToolDragEnd = () => setDraggingTool(null);

  // Drop new widget onto canvas
  const handleCanvasDrop = useCallback(
    (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("text/plain") || draggingTool;
      if (!type) return;

      // TODO: logic to add widget
      console.log("Dropped widget type:", type);

      const { left, top } = getCanvasOffset();
      const canvasWidth =
        currentPreset.width === "auto" ? canvasSize.width : currentPreset.width;
      const canvasHeight =
        currentPreset.height === "auto"
          ? canvasSize.height
          : currentPreset.height;

      let x = snap((e.pageX - left) / scale);
      let y = snap((e.pageY - top) / scale);

      const id = Date.now().toString();

      let baseSize;
      switch (type) {
        case "line":
          baseSize = { width: 120, height: 2 };
          break;
        case "textbox":
          baseSize = { width: 200, height: 40 };
          break;
        case "header":
          baseSize = { width: 200, height: 40 };
          break;
        case "footer":
          baseSize = { width: 200, height: 40 };
          break;
        case "data-table":
          baseSize = { width: 200, height: 65 };
          break;
        default:
          baseSize = { width: 160, height: 100 };
      }

      // Snap headers and footers to predefined positions
      if (type === "header") {
        // Align to top center
        x = snap((canvasWidth - snap(baseSize.width)) / 2);
        y = 0;
      } else if (type === "footer") {
        // Align to bottom center
        x = snap((canvasWidth - snap(baseSize.width)) / 2);
        y = snap(canvasHeight - snap(baseSize.height));
      } else if (type === "data-table") {
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
        text: type === "textbox" ? "Text" : "",
        imageSrc: null,
        altText: "",
        opacity: 100,
        borderWidth: 0,
        borderColor: "#000000",
        borderRadius: 0,
        shadow: "none",
        shadowColor: "#000000",
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        filter: "none",
        filterIntensity: 100,
        responsive: { desktop: true, tablet: true, mobile: true },
        alignment: "left",
        objectFit: "fill",
        rotation: 0,
        // Text-specific properties
        fontFamily: "Arial",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        textColor: "#000000",
        backgroundColor: "transparent",
        textAlign: "left",
        lineHeight: 1.5,
        letterSpacing: 0,
      };

      setWidgets((prev) => [...prev, newWidget]);
      setActiveId(id);

      // Auto-open image properties sidebar for image widgets
      if (type === "image") {
        setSelectedImageWidget(newWidget);
        setShowImageSidebar(true);
      }

      // Auto-open text properties sidebar for text widgets
      if (type === "textbox") {
        setSelectedTextWidget(newWidget);
        setShowTextSidebar(true);
      }
    },
    [
      draggingTool,
      currentPreset,
      canvasSize,
      scale,
      snap,
      getCanvasOffset,
      setWidgets,
      setActiveId,
    ]
  );

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

    const canvasWidth =
      currentPreset.width === "auto" ? canvasSize.width : currentPreset.width;
    const canvasHeight =
      currentPreset.height === "auto"
        ? canvasSize.height
        : currentPreset.height;

    const onMove = (e) => {
      let dx = (e.pageX - startX) / scale;
      let dy = (e.pageY - startY) / scale;

      let newX = snap(widget.x + dx);
      let newY = snap(widget.y + dy);

      // Snap headers and footers to predefined positions
      if (widget.type === "header") {
        // Snap to top center
        newX = snap((canvasWidth - widget.width) / 2);
        newY = 0;
      } else if (widget.type === "footer") {
        // Snap to bottom center
        newX = snap((canvasWidth - widget.width) / 2);
        newY = snap(canvasHeight - widget.height);
      }

      setWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, x: newX, y: newY } : w))
      );
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
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
      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          let x = startWidget.x,
            y = startWidget.y,
            width = startWidget.width,
            height = startWidget.height;
          if (dir.includes("e"))
            width = Math.max(GRID_SIZE, snap(startWidget.width + dx));
          if (dir.includes("s"))
            height = Math.max(GRID_SIZE, snap(startWidget.height + dy));
          if (dir.includes("w")) {
            const newW = Math.max(GRID_SIZE, snap(startWidget.width - dx));
            x = snap(startWidget.x + (startWidget.width - newW));
            width = newW;
          }
          if (dir.includes("n")) {
            const newH = Math.max(GRID_SIZE, snap(startWidget.height - dy));
            y = snap(startWidget.y + (startWidget.height - newH));
            height = newH;
          }
          return { ...w, x, y, width, height };
        })
      );
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Rotation handle
  const startRotate = (id, startEvent) => {
    startEvent.stopPropagation();
    const startWidget = widgets.find((w) => w.id === id);
    if (!startWidget) return;

    const centerX = startWidget.x + startWidget.width / 2;
    const centerY = startWidget.y + startWidget.height / 2;
    const startAngle = Math.atan2(
      startEvent.pageY - centerY,
      startEvent.pageX - centerX
    );

    const onMove = (e) => {
      const currentAngle = Math.atan2(e.pageY - centerY, e.pageX - centerX);
      let rotation = (currentAngle - startAngle) * (180 / Math.PI);
      rotation = Math.round(rotation);
      setWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, rotation } : w))
      );
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const removeWidget = (id) =>
    setWidgets((prev) => prev.filter((w) => w.id !== id));

  const handleImagePropertyChange = (key, value) => {
    if (!selectedImageWidget) return;
    setSelectedImageWidget((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextPropertyChange = (key, value) => {
    if (!selectedTextWidget) return;
    setSelectedTextWidget((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageSave = (properties) => {
    if (selectedImageWidget) {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === selectedImageWidget.id ? { ...w, ...properties } : w
        )
      );
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
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === selectedTextWidget.id ? { ...w, ...properties } : w
        )
      );
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
      const filename = `canvas-design-${new Date().toISOString().split("T")[0]}.json`;
      const result = downloadCanvasFile(widgets, filename, {
        pretty: true,
        pageKey: pageKey,
        pageWidth:
          currentPreset.width === "auto"
            ? canvasSize.width
            : currentPreset.width,
        pageHeight:
          currentPreset.height === "auto"
            ? canvasSize.height
            : currentPreset.height,
        pageLabel: currentPreset.label,
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
      const val = storeCanvasFile(
        widgets,
        userId,
        branchId,
        reportStructureId,
        reportName,
        is_active,
        created_at,
        updated_at
      );
      console.log("val", val);
      if (val.success) {
        console.log("Canvas stored successfully");
      } else {
        console.error("Failed to store canvas:", val.error);
      }

      if (result.success) {
        console.log("Canvas saved successfully");
        toast.success("Canvas saved successfully!");
      } else {
        console.error("Failed to save canvas:", result.error);
        toast.error("Failed to save canvas: " + result.error);
      }
    } catch (error) {
      console.error("Error saving canvas:", error);
      toast.error("Error saving canvas: " + error.message);
    }
  };

  const handleLoadCanvas = async (design_json_param) => {
    try {
      let fileString = design_json_param;
      console.log("fileString", fileString);
      if (fileString.startsWith('"') && fileString.endsWith('"')) {
        fileString = fileString.slice(1, -1).replace(/\\"/g, '"');
      }

      const result = await deserializeCanvas(fileString);
      console.log("result", result);
      designJsonToSend = JSON.parse(fileString);

      if (result.success) {
        setWidgets(result.elements);
        console.log(`Loaded ${result.totalElements} elements from canvas file`);

        // Restore page configuration if available
        if (result.pageConfig) {
          const { key, width, height, label } = result.pageConfig;

          // Check if the page preset exists
          const existingPreset = PAGE_PRESETS.find((p) => p.key === key);
          if (existingPreset) {
            setPageKey(key);
            console.log("Restored page configuration:", key, label);
          } else {
            // Handle custom page size
            console.log("Loaded custom page size:", width, "x", height, label);
            setCanvasSize({ width: parseInt(width), height: parseInt(height) });
            setScale(1); // Reset scale for custom sizes
          }
        }

        if (result.metadata) {
          console.log("Canvas metadata:", result.metadata);
        }
      } else {
        console.error("Failed to load canvas:", result.error);
        toast.error("Failed to load canvas: " + result.error);
      }
    } catch (error) {
      console.error("Error loading canvas:", error);
      toast.error("Error loading canvas: " + error.message);
    }

    // Reset file input to allow loading the same file again
  };

  const handleExportCanvas = () => {
    try {
      const jsonString = serializeCanvas(widgets, {
        pretty: true,
        pageKey: pageKey,
        pageWidth:
          currentPreset.width === "auto"
            ? canvasSize.width
            : currentPreset.width,
        pageHeight:
          currentPreset.height === "auto"
            ? canvasSize.height
            : currentPreset.height,
        pageLabel: currentPreset.label,
      });

      // Copy to clipboardxport
      navigator.clipboard
        .writeText(jsonString)
        .then(() => {
          toast.success("Canvas data copied to clipboard!");
        })
        .catch(() => {
          // Fallback: show in modal or download
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "canvas-design-export.json";
          link.click();
          URL.revokeObjectURL(url);
          toast.info("Canvas data downloaded as file.");
        });
    } catch (error) {
      console.error("Error exporting canvas:", error);
      toast.error("Error exporting canvas: " + error.message);
    }
  };

  // Open image properties when clicking on an image widget
  const handleImageClick = (widget) => {
    if (widget.type === "image") {
      setSelectedImageWidget(widget);
      setShowImageSidebar(true);
    }
  };

  // Open text properties when clicking on a text widget
  const handleTextClick = (widget) => {
    if (widget.type === "textbox") {
      setSelectedTextWidget(widget);
      setShowTextSidebar(true);
    }
  };

  // Align helpers (for active widget)
  const alignActive = (direction) => {
    if (!activeId) return;
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== activeId) return w;
        switch (direction) {
          case "left":
            return { ...w, x: 0 };
          case "center":
            return {
              ...w,
              x: snap(
                ((currentPreset.width === "auto"
                  ? canvasSize.width
                  : currentPreset.width) -
                  w.width) /
                  2
              ),
            };
          case "right":
            return {
              ...w,
              x: snap(
                (currentPreset.width === "auto"
                  ? canvasSize.width
                  : currentPreset.width) - w.width
              ),
            };
          case "top":
            return { ...w, y: 0 };
          case "middle":
            return {
              ...w,
              y: snap(
                ((currentPreset.height === "auto"
                  ? canvasSize.height
                  : currentPreset.height) -
                  w.height) /
                  2
              ),
            };
          case "bottom":
            return {
              ...w,
              y: snap(
                (currentPreset.height === "auto"
                  ? canvasSize.height
                  : currentPreset.height) - w.height
              ),
            };
          default:
            return w;
        }
      })
    );
  };

  // Build ticks for rulers based on actual canvasRef size
  const hTicks = Array.from(
    { length: Math.ceil(canvasSize.width / GRID_SIZE) + 1 },
    (_, i) => i
  );
  const vTicks = Array.from(
    { length: Math.ceil(canvasSize.height / GRID_SIZE) + 1 },
    (_, i) => i
  );

  // Toolbar handlers
  const handleZoomIn = () =>
    setScale((s) => Math.min(2, parseFloat((s + 0.1).toFixed(2))));
  const handleZoomOut = () =>
    setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))));
  const handleZoomSelect = (e) => setScale(parseFloat(e.target.value));

  // Toggle function
  const toggleView = () => {
    setShowReportView((prev) => !prev);
  };

  // Memoize table columns to prevent re-rendering MaterialReactTable on every state change
  const memoizedColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      header: col.header
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [columns]);

  // Memoize all table props to prevent MaterialReactTable re-renders
  const tableState = useMemo(
    () => ({
      columnVisibility,
      pagination,
      columnOrder,
      columnFilters,
      sorting,
      density: "comfortable",
      columnSizing: {},
      columnPinning: {},
      showColumnFilters: false,
      showGlobalFilter: false,
      showColumnActions: false,
    }),
    [columnVisibility, pagination, columnOrder, columnFilters, sorting]
  );

  const muiTableContainerProps = useMemo(
    () => ({
      sx: {
        maxHeight: "calc(100vh - 300px)",
        tableLayout: "fixed",
      },
    }),
    []
  );

  const muiTablePaperProps = useMemo(
    () => ({
      elevation: 0,
      sx: {
        border: "1px solid var(--border)",
        boxShadow: "none",
      },
    }),
    []
  );

  const muiTableHeadCellProps = useMemo(
    () => ({
      sx: {
        fontWeight: 600,
        backgroundColor: "var(--bg)",
        borderRight: "none",
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.02)",
        },
        "& .Mui-TableHeadCell-Content": {
          justifyContent: "space-between",
        },
      },
    }),
    []
  );

  const muiTableBodyCellProps = useMemo(
    () => ({
      sx: (theme) => ({
        padding: "0.75rem 1rem",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        "&:last-child": { borderRight: "none" },
        "&:hover": { backgroundColor: theme.palette.action.hover },
      }),
    }),
    []
  );

  const muiTableBodyProps = useMemo(
    () => ({
      sx: (theme) => ({
        "& tr:nth-of-type(odd)": { backgroundColor: "var(--card-bg)" },
        "& tr:nth-of-type(even)": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
        "& tr:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
        "& tr:last-child td": { borderBottom: "none" },
      }),
    }),
    []
  );

  const displayColumnDefOptions = useMemo(
    () => ({
      "mrt-row-expand": { size: 0 },
    }),
    []
  );

  // Memoize event handlers to prevent MaterialReactTable re-renders
  const handleColumnOrderChange = useCallback((order) => {
    setColumnOrder(order);
  }, []);

  const handleColumnFiltersChange = useCallback((cf) => {
    setColumnFilters(cf);
  }, []);

  const handleSortingChange = useCallback((s) => {
    setSorting(s);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const handlePaginationChange = useCallback((p) => {
    setPagination(p);
  }, []);

  const handleColumnVisibilityChange = useCallback((v) => {
    setColumnVisibility(v);
  }, []);

  const handleRowClick = useCallback((row) => {
    console.log("Row clicked:", row.original);
  }, []);

  const muiTableBodyRowProps = useCallback(
    ({ row }) => ({
      onClick: () => handleRowClick(row),
      sx: {
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    }),
    [handleRowClick]
  );

  useEffect(() => {
    // Generate current date-time in readable format
    const now = new Date();
    const formatted = now.toISOString().slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm"

    setNewConfigName(formatted);
  }, [showSaveModal]); // runs once when component mounts

  return (
    <div className="report-design-page-container">
      {/* Toast notifications container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Top-right Save Template button */}
      {hasChanges && (
        <div className="top-right-actions">
          <button
            className="save-template-topright"
            onClick={() => setShowSaveModal(true)}
            disabled={isSaving}
          >
            <FaSave className="button-icon" />{" "}
            {t("components.reportPage.save_configuration")}
          </button>
        </div>
      )}

      <div className="toggle-button-container">
        <h3 className="templates-title">Templates:</h3>
        {/* <button 
          onClick={toggleView} 
          className={`switch-view-button ${showReportView ? 'report-view-active' : 'design-view-active'}`}
        >
          <i className={`fas fa-${showReportView ? 'paint-brush' : 'table'}`} />
          {showReportView ? t('components.reportPage.report_headings') : t('components.reportPage.report_data')}
        </button> */}
        <select
          className="report-config-dropdown"
          value={selectedConfig?.name || ""}
          onChange={(e) => {
            const selectedName = e.target.value;
            const cfgObj = reportConfigs.find((c) => c.name === selectedName);

            if (cfgObj) {
              // Clear table data, columns, and show loading state when configuration changes
              setTableData([]);
              setColumns([]);
              setColumnOrder([]);
              setColumnVisibility({});
              setTotalRows(0);
              setDataDoneLoading(false);
              setIsLoadingConfig(true);

              setSelectedConfig({
                name: cfgObj.name,
                activeCfg: cfgObj.cfg, // Directly use cfg
              });
            }
          }}
        >
          {reportConfigs.map((config, index) => (
            <option key={`${config.name}-${index}`} value={config.name}>
              {config.name}
            </option>
          ))}
        </select>
      </div>
      {showReportView ? (
        // ReportPage UI goes here
        <div className="report-view">
          {/* <h1>Report View</h1> */}
          <div className="report-page">
            {/* --- START PREVIEW MODAL --- */}
            {showPreviewModal &&
              createPortal(
                <div className="preview-modal-overlay">
                  <div className="preview-modal-content">
                    <div className="preview-modal-header">
                      <h4>{t("components.reportPage.report_preview")}</h4>
                      <button
                        className="preview-modal-close"
                        onClick={() => setShowPreviewModal(false)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <div className="preview-modal-body">
                      {/* Split data into pages of 12 rows */}
                      {Array.from(
                        { length: Math.ceil(filteredData.length / 12) },
                        (_, pageIndex) => {
                          const pageData = filteredData.slice(
                            pageIndex * 12,
                            pageIndex * 12 + 12
                          );

                          return (
                            <div key={pageIndex} className="preview-page">
                              {/* Headings only on first page */}
                              {pageIndex === 0 && (
                                <div className="preview-headings">
                                  <div className="heading-row">
                                    {/* <img src="/logoReport.png" alt="Company Logo" className="heading-logo" /> */}
                                    <div className="heading-texts">
                                      {headings
                                        .filter((h) => h.include)
                                        .map((heading, index) => (
                                          <h1 key={index}>
                                            {populatePlaceholders(
                                              heading.content,
                                              previewData[0]
                                            )}
                                          </h1>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Table rows for this page */}
                              {/* Table rows for this page */}
                              <div className="preview-table-container">
                                <style jsx>{`
                                  /* Status badge styling */
                                  .status-badge {
                                    display: inline-block;
                                    padding: 4px 12px;
                                    border-radius: 12px;
                                    font-size: 12px;
                                    font-weight: bold;
                                  }
                                  .status-active {
                                    background-color: #c8e6c9;
                                    color: #2e7d32;
                                  }
                                  .status-pending {
                                    background-color: #fff9c4;
                                    color: #f57f17;
                                  }
                                  .status-inactive {
                                    background-color: #ffcdd2;
                                    color: #c62828;
                                  }
                                  .status-closed {
                                    background-color: #e1e1e1;
                                    color: #616161;
                                  }
                                  
                                  /* Table row hover effect */
                                  tbody tr:hover {
                                    background-color: #f5f5f5;
                                  }
                                `}</style>
                                <MaterialReactTable 
                                  columns={columns}
                                  data={pageData || tableData}
                                  state={{
                                    columnVisibility,
                                    columnOrder,
                                    sorting,
                                  }}
                                  enableColumnOrdering={true}
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
                                  // 4. Preserve your styling
                                  muiTableBodyCellProps={{
                                    sx: {
                                      borderRight: "1px solid #ccc",
                                      "&:last-of-type": { borderRight: "none" },
                                    },
                                  }}
                                  muiTableHeadCellProps={{
                                    sx: {
                                      borderRight: "1px solid #ccc",
                                      "&:last-of-type": { borderRight: "none" },
                                    },
                                  }}
                                  muiTableContainerProps={{
                                    sx: {
                                      maxHeight: "none",
                                      overflowY: "visible",
                                    },
                                  }}
                                />
                              </div>

                              {/* Footer with dividers + page number */}
                              <div className="preview-footer">
                                <div className="footer-content">
                                  {includeFooter && (
                                    <div
                                      className="footer-html"
                                      dangerouslySetInnerHTML={{
                                        __html: footer || "",
                                      }}
                                    />
                                  )}
                                  <div className="page-number">
                                    {t("components.reportPage.page_of", {
                                      page: pageIndex + 1,
                                      total: Math.ceil(previewData.length / 12),
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )}

            {/* Logo Modal */}
            {showLogoModal && fullScreenLogo && (
              <div
                className="logo-modal-overlay"
                onClick={() => setShowLogoModal(false)}
              >
                <div
                  className="logo-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="logo-modal-close"
                    onClick={() => setShowLogoModal(false)}
                  >
                    <FaTimes size={20} />
                  </button>
                  <img
                    src={fullScreenLogo}
                    alt="Full Screen Logo"
                    className="logo-modal-image"
                  />
                </div>
              </div>
            )}

            {/* Logo Card */}
            {isLogoEnabled && logo && (
              <div className="logo-card">
                <img
                  src={logo}
                  alt={t("components.logoUpload.alt_logo")}
                  className="logo-preview"
                />
                <button
                  onClick={() => {
                    setFullScreenLogo(logo);
                    setShowLogoModal(true);
                  }}
                  className="logo-preview-button"
                >
                  {t("components.reportPage.preview_logo_button")}
                </button>
              </div>
            )}

            {/* Header & Subheading Section */}
            <div className="headings-card">
              <div className="header-section">
                <h3 className="section-title">
                  {t("components.reportPage.report_headings")}
                </h3>
              </div>

              <div className="headings-container">
                <div className="institute-name-wrapper">
                  <label className="institute-name-label">
                    {t("components.reportPage.institute_name")}
                  </label>
                  <span className="institute-name-value">
                    {instituteName || "N/A"}
                  </span>
                </div>

                {headings.map((heading, index) => (
                  <div key={heading.id} className="heading-item">
                    <div className="heading-checkbox-wrapper">
                      <input
                        type="checkbox"
                        id={`heading-${heading.id}`}
                        checked={heading.include}
                        onChange={() => {
                          const updated = [...headings];
                          updated[index].include = !updated[index].include;
                          setHeadings(updated);
                        }}
                        className="heading-checkbox-input"
                      />
                    </div>

                    {heading.include && (
                      <div className="heading-editor-wrapper">
                        <HeadingEditor
                          showToolbar={false}
                          value={heading.content}
                          onChange={(content) => {
                            setHeadings((prevHeadings) => {
                              const updated = [...prevHeadings];
                              updated[index] = { ...updated[index], content };
                              return updated;
                            });
                          }}
                          onBlur={(content) => {
                            setHeadingsData((prev) => {
                              if (index === 0) {
                                return {
                                  ...prev,
                                  heading: {
                                    ...prev.heading,
                                    [`heading_${currentLanguage}`]: content,
                                  },
                                };
                              } else {
                                const subHeadingIndex = index - 1;
                                const updatedSubHeadings = [
                                  ...(prev.subHeading || []),
                                ];
                                updatedSubHeadings[subHeadingIndex] = {
                                  ...updatedSubHeadings[subHeadingIndex],
                                  [`subHeading_${currentLanguage}`]: content,
                                };
                                return {
                                  ...prev,
                                  subHeading: updatedSubHeadings,
                                };
                              }
                            });
                          }}
                          onRemove={
                            headings.length > 1 && index > 0
                              ? () => {
                                  setHeadings(
                                    headings.filter((_, i) => i !== index)
                                  );
                                  setHeadingsData((prev) => {
                                    const subHeadingIndex = index - 1;
                                    const updatedSubHeadings = [
                                      ...(prev.subHeading || []),
                                    ];
                                    updatedSubHeadings.splice(
                                      subHeadingIndex,
                                      1
                                    );
                                    return {
                                      ...prev,
                                      subHeading: updatedSubHeadings,
                                    };
                                  });
                                }
                              : null
                          }
                          showRemove={index > 0}
                          placeholder={t(
                            "components.headingEditor.placeholder"
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {headings.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeadings([
                        ...headings,
                        { id: Date.now(), content: "", include: true },
                      ]);

                      setHeadingsData((prev) => {
                        const currentLanguage = i18n.language;
                        const updatedSubHeadings = [...(prev.subHeading || [])];
                        const newSubHeadingIndex = updatedSubHeadings.length;

                        updatedSubHeadings[newSubHeadingIndex] = {
                          [`subHeading_${currentLanguage}`]: "",
                        };

                        return {
                          ...prev,
                          subHeading: updatedSubHeadings,
                        };
                      });
                    }}
                    className="add-heading-button"
                    disabled={headings.length >= 3}
                  >
                    <FaPlus /> {t("components.reportPage.add_heading")}
                  </button>
                )}
              </div>
            </div>

            {/* Filters Section */}
            <FiltersSection
              t={t}
              searchFields1={searchFields}
              searchFields2={searchFields} // You may want to create separate state for tab2
              availableColumns={availableColumns}
              tableData={tableData}
              columnDistinctValues={columnDistinctValues}
              resetSearchFields1={resetSearchFields}
              resetSearchFields2={resetSearchFields} // You may want to create separate function for tab2
              addSearchField1={addSearchField}
              addSearchField2={addSearchField} // You may want to create separate function for tab2
              handleColumnSelect={handleColumnSelect}
              handleValueChange={handleValueChange}
              removeSearchField={removeSearchField}
              getSelectedColumns={getSelectedColumns}
              filters={filters}
              selectedConfig={selectedConfig}
              handleInputChange={handleInputChange}
              removeFilterPair={removeFilterPair}
              addFilterPair={addFilterPair}
              getActiveSearchNames={getActiveSearchNames}
              generateAndSendSQL={generateAndSendSQL}
              filterFields={filterFields}
              isConfigUpdate={isConfigUpdate}
              hasPresetValues={hasPresetValues}
              presetItems={presetItems}
              setHasPresetValues={setHasPresetValues}
              setPresetItems={setPresetItems}
            />

            {/* Table Section */}
            <div className="table-section">
              <div className="table-card">
                <div className="table-header">
                  <div className="table-left">
                    <h3 className="table-title">
                      {t("components.reportPage.report_data")}
                    </h3>
                  </div>
                  <div className="table-actions">
                    <button
                      className="load-data-button"
                      onClick={generateReport}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <svg
                            className="button-icon spinning"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {t("components.reportPage.generating_report")}
                        </>
                      ) : (
                        <>
                          <svg
                            className="button-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 16V17C4 17.5304 4.21071 18.0391 4.58579 18.4142C4.96086 18.7893 5.46957 19 6 19H18C18.5304 19 19.0391 18.7893 19.4142 18.4142C19.7893 18.0391 20 17.5304 20 17V16M16 12L12 16M12 16L8 12M12 16V4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {t("components.reportPage.load_data")}
                        </>
                      )}
                    </button>
                    <PreviewWithDesignButton
                      reportId={reportId}
                      reportData={{ ...reportData, rows: filteredData }}
                      columnVisibility={columnVisibility}
                      headings={headings}
                      footer={footer}
                      sorting={sorting}
                      columnOrder={columnOrder}
                      columnHeaders={columnHeaders}
                      activeconfig={reportConfig}
                      instituteName={instituteName}
                    />
                    <div className="column-filter" ref={columnFilterRef}>
                      <button
                        className="filter-dropdown-button"
                        disabled={
                          !columns.some((column) => column.enableHiding)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColumnFilter(!showColumnFilter);
                        }}
                      >
                        <FiFilter /> {t("components.reportPage.table_columns")}
                      </button>

                      {showColumnFilter && (
                        <div className="column-dropdown">
                          {columns
                            .filter((column) => column.enableHiding)
                            .map((column) => (
                              <div
                                key={column.accessorKey}
                                className="filter-dropdown-item"
                              >
                                <input
                                  type="checkbox"
                                  id={`col-${column.accessorKey}`}
                                  checked={
                                    !!columnVisibility[column.accessorKey]
                                  }
                                  onChange={() => {
                                    setColumnVisibility((prev) => ({
                                      ...prev,
                                      [column.accessorKey]:
                                        !prev[column.accessorKey],
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

                <DataTableSection
                  memoizedColumns={memoizedColumns}
                  filteredData={filteredData}
                  tableData={tableData}
                  displayColumnDefOptions={displayColumnDefOptions}
                  muiTableContainerProps={muiTableContainerProps}
                  muiTableBodyRowProps={muiTableBodyRowProps}
                  muiTablePaperProps={muiTablePaperProps}
                  muiTableHeadCellProps={muiTableHeadCellProps}
                  muiTableBodyCellProps={muiTableBodyCellProps}
                  muiTableBodyProps={muiTableBodyProps}
                  handleColumnOrderChange={handleColumnOrderChange}
                  handleColumnFiltersChange={handleColumnFiltersChange}
                  handleSortingChange={handleSortingChange}
                  handlePaginationChange={handlePaginationChange}
                  handleColumnVisibilityChange={handleColumnVisibilityChange}
                  tableState={tableState}
                />
              </div>

              {/* Report Table Footer - placed UNDER table card as separate element */}
              {tableData.length > 0 && (
                <div className="report-table-footer">
                  <div className="table-footer-content">
                    {/* Left side - Include summary statistics checkbox */}
                    <div className="footer-checkbox-wrapper">
                      <input
                        type="checkbox"
                        id="include-summary"
                        checked={isSummaryPreview}
                        onChange={(e) => setIsSummaryPreview(e.target.checked)}
                      />
                      <label htmlFor="include-summary">
                        {t("components.reportPage.include_summary")}
                      </label>
                    </div>

                    {/* Right side - Pagination controls */}
                    <div className="footer-pagination">
                      <div className="rows-per-page">
                        <span>Rows per page:</span>
                        <select
                          value={pagination.pageSize}
                          onChange={(e) =>
                            setPagination((prev) => ({
                              ...prev,
                              pageSize: Number(e.target.value),
                              pageIndex: 0,
                            }))
                          }
                        >
                          <option value="15">15</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>

                      <div className="pagination-info">
                        {pagination.pageIndex * pagination.pageSize + 1}-
                        {Math.min(
                          (pagination.pageIndex + 1) * pagination.pageSize,
                          totalRows
                        )}{" "}
                        of {totalRows}
                      </div>

                      <div className="pagination-controls">
                        <button
                          className="pagination-button"
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              pageIndex: Math.max(0, prev.pageIndex - 1),
                            }))
                          }
                          disabled={pagination.pageIndex === 0}
                          aria-label="Previous page"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15 18L9 12L15 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="pagination-button"
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              pageIndex: prev.pageIndex + 1,
                            }))
                          }
                          disabled={
                            (pagination.pageIndex + 1) * pagination.pageSize >=
                            totalRows
                          }
                          aria-label="Next page"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 18L15 12L9 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Section */}
            <div className="footer-card">
              <div className="footer-section">
                <div className="footer-header">
                  <h3 className="section-title">
                    {t("components.reportPage.report_footer")}
                  </h3>
                </div>
                <div className="footer-content">
                  <div className="footer-item">
                    <div className="footer-checkbox">
                      <input
                        type="checkbox"
                        id="include-footer"
                        checked={includeFooter}
                        onChange={() => setIncludeFooter((v) => !v)}
                        className="hidden-checkbox"
                      />
                      <label htmlFor="include-footer">
                        {includeFooter ? (
                          <FaCheckSquare className="checked-icon" />
                        ) : (
                          <FaRegSquare className="unchecked-icon" />
                        )}
                      </label>
                    </div>
                    <div className="footer-editor-wrapper">
                      <HeadingEditor
                        showToolbar={false}
                        value={footer} // Use local footer state for UI
                        onChange={(content) => {
                          // Only update UI state for responsive typing
                          setFooter(content);
                        }}
                        onBlur={(content) => {
                          // Update data state only when user finishes editing (onBlur)
                          setHeadingsData((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              [`footer_${currentLanguage}`]: content,
                            },
                          }));
                        }}
                        placeholder={t(
                          "components.reportPage.click_to_edit_footer"
                        )}
                        showRemove={false}
                      />
                    </div>
                    {/* <FaEdit
  className="edit-icon"
  style={{ cursor: 'pointer', marginLeft: '8px' }}
  onClick={() => {
    setEditModalType('footer');
    setEditModalContent(
      headingsData.footer[`footer_${currentLanguage}`] ||
      selectedConfig?.activeCfg?.footer?.[`footer_${currentLanguage}`] ||
      ''
    );
    setEditModalOpen(true);
  }}
/> */}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              {/* <PreviewWithDesignButton 
          reportId={reportId} 
          reportData={{ ...reportData, rows: filteredData }} 
          columnVisibility={columnVisibility} 
          headings={headings} 
          footer={footer} 
          sorting={sorting} 
          columnOrder={columnOrder} 
          columnHeaders={columnHeaders}
          activeconfig={reportConfig} 
        /> */}
              {/* --- ADD THE PREVIEW BUTTON HERE --- */}
              {/* <button
    className="preview-button"
    onClick={handlePreviewReport}
    disabled={!genarateDone || isLoadingData || isLoadingConfig}
  >
  <FaEye /> {t('components.reportPage.preview')}
  </button> */}

              {/* <button
    className="preview-button"
    onClick={handlePreviewReportSummary}
    disabled={!genarateDone || isLoadingData || isLoadingConfig}
  >
  <FaEye /> {t('components.reportPage.preview_as_summary')}
  </button> */}
              {/* --- END ADDITION --- */}
            </div>

            {showSaveModal && (
              <div
                className="modal-backdrop"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  zIndex: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="modal relative"
                  style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    width: "90%",
                    maxWidth: "400px",
                    position: "relative",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <h3>{t("components.reportPage.save_new_configuration")}</h3>

                  {/* Configuration Name Input and Logic */}
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    {t("components.reportPage.configuration_name_label")}
                  </label>
                  <div style={{ position: "relative", marginBottom: "16px" }}>
                    <input
                      type="text"
                      value={newConfigName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewConfigName(value);

                        // Filter list instantly while typing
                        const filtered = reportConfigs.filter((c) =>
                          c.name.toLowerCase().includes(value.toLowerCase())
                        );
                        setFilteredConfigs(filtered);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => {
                        // Show all configs when focused
                        setFilteredConfigs(reportConfigs);
                        setShowSuggestions(true);
                      }}
                      onBlur={() => {
                        // Delay to let click register
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder={t(
                        "components.reportPage.configuration_name_placeholder"
                      )}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        boxSizing: "border-box",
                        fontSize: "14px",
                      }}
                    />

                    {/* 🔍 Suggestions dropdown / Available Configurations List */}
                    {showSuggestions && (
                      <ul
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          marginTop: "4px",
                          width: "100%",
                          maxHeight: "180px",
                          overflowY: "auto",
                          boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          zIndex: 1000,
                          listStyleType: "none",
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        <li
                          style={{
                            padding: "8px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#4b5563",
                            borderBottom: "1px solid #e5e7eb",
                            backgroundColor: "#f9fafb",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          {t("components.reportPage.available_configurations")}
                        </li>

                        {/* Map over filtered configurations */}
                        {filteredConfigs
                          .filter(
                            (config) => config.name !== "Original Configuration"
                          )
                          .filter((config) =>
                            newConfigName.trim()
                              ? config.name
                                  .toLowerCase()
                                  .includes(newConfigName.toLowerCase())
                              : true
                          )
                          .map((config, index) => (
                            <li
                              key={index}
                              // No inline style for hover in React, use onMouseEnter/onMouseLeave for the hover effect
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: "13px",
                                borderBottom: "1px solid #f3f4f6",
                                transition: "background-color 0.15s ease", // Added for smooth transition
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#eff6ff")
                              } // Corresponds to hover:bg-blue-50
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "white")
                              }
                              onClick={() => setNewConfigName(config.name)}
                            >
                              <span
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  color: "#1f2937",
                                }}
                              >
                                {config.name}
                              </span>

                              {/* Delete Icon Button */}
                              {/* Delete Icon Button - NOW CALLS openConfirmModal */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent the parent <li> onClick (setting config name) from firing
                                  openConfirmModal(config); // <--- CHANGE IS HERE
                                }}
                                style={{
                                  padding: "4px",
                                  borderRadius: "4px",
                                  transition: "background-color 0.15s ease",
                                  flexShrink: 0,
                                  border: "none",
                                  backgroundColor: "transparent",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#fee2e2")
                                } // Corresponds to hover:bg-red-100
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "transparent")
                                }
                                title="Delete configuration"
                              >
                                <svg
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    color: "#ef4444",
                                  }} // Corresponds to w-4 h-4 text-red-500
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = "#b91c1c")
                                  } // Corresponds to hover:text-red-700
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = "#ef4444")
                                  }
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </li>
                          ))}

                        {/* Empty state (when the list is filtered down to zero) */}
                        {/* {filteredConfigs
                          .filter((config) => config.name !== "Original Configuration")
                          .filter((config) => newConfigName.trim() ? config.name.toLowerCase().includes(newConfigName.toLowerCase()) : true)
                          .length === 0 && (
                            <li style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                              No configurations available
                            </li>
                          )} */}
                      </ul>
                    )}
                  </div>

                  {/* ⚠️ Error and Success Messages */}
                  {error && (
                    <p
                      className="error-text"
                      style={{
                        color: "#ef4444",
                        marginTop: "8px",
                        fontSize: "13px",
                        marginBottom: "0",
                      }}
                    >
                      {error}
                    </p>
                  )}
                  {success && (
                    <p
                      className="success-text"
                      style={{
                        color: "#16a34a",
                        marginTop: "8px",
                        fontSize: "13px",
                        marginBottom: "0",
                      }}
                    >
                      {success}
                    </p>
                  )}

                  {/* 🧭 Action Buttons */}
                  <div
                    className="modal-actions"
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "10px",
                      marginTop: "32px",
                      paddingTop: "20px",
                    }}
                  >
                    <button
                      className="cancel-button"
                      onClick={() => setShowSaveModal(false)}
                      disabled={isSaving}
                      style={{
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "500",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e5e7eb";
                        e.currentTarget.style.borderColor = "#9ca3af";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                    >
                      {t("components.reportPage.cancel")}
                    </button>
                    <button
                      className="confirm-button"
                      onClick={saveNewConfiguration}
                      disabled={isSaving}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        padding: "8px 20px",
                        fontSize: "13px",
                        fontWeight: "600",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        opacity: isSaving ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSaving) {
                          e.currentTarget.style.backgroundColor = "#1d4ed8";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isSaving
                        ? t("components.reportPage.saving")
                        : t("components.reportPage.save_configuration")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- Confirmation Delete Modal --- */}
            {showConfirmDeleteModal && configToDelete && (
              <div
                className="modal-backdrop"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  zIndex: 100, // Higher Z-index
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="modal relative"
                  style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    width: "90%",
                    maxWidth: "350px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  <h4 style={{ color: "#dc2626", marginBottom: "12px" }}>
                    Confirm Deletion
                  </h4>
                  <p style={{ color: "#4b5563", marginBottom: "20px" }}>
                    Are you sure you want to delete the configuration named{" "}
                    <strong style={{ color: "#1f2937" }}>
                      "{configToDelete.name}"
                    </strong>
                    ? This action cannot be undone.
                  </p>

                  <div
                    className="modal-actions"
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() => setShowConfirmDeleteModal(false)}
                      style={{
                        backgroundColor: "#f3f4f6",
                        color: "#1f2937",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e5e7eb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                      }
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#b91c1c")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#dc2626")
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

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
            {/* {showPreviewModal && (
  <div className="preview-modal-overlay">
    <div className="preview-modal-content">
      <div className="preview-modal-header">
  <h3>{t('components.reportPage.report_preview')}</h3>
        <button
          className="preview-modal-close"
          onClick={() => setShowPreviewModal(false)}
        >
          &times;
        </button>
      </div>
      <div className="preview-modal-body">
        {isLoadingData ? (
          <p>{t('components.reportPage.loading_preview')}</p>
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
)} */}
          </div>
        </div>
      ) : (
        // DesignReport UI goes here
        <div className="design-view">
          {/* <h1>Design View</h1> */}
          <div className="report-view">
            {/* <h1>Report View</h1> */}
            <div className="design-report-page">
              <div className="design-toolbar">
                <div className="toolbar-group">
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.new")}
                  >
                    <FiPlus />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.save")}
                    onClick={handleSaveCanvas}
                  >
                    <FiSave />
                  </button>
                  {/* <button className="tb-btn" title={t('components.reportPage.load')} onClick={() => fileInputRef.current?.click()}><FiUpload /></button> */}
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.load")}
                    onClick={handleLoadCanvas}
                  >
                    <FiUpload />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.export")}
                    onClick={handleExportCanvas}
                  >
                    <FiDownload />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.cut")}
                  >
                    <FiScissors />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.copy")}
                  >
                    <FiCopy />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.delete")}
                    onClick={() => activeId && removeWidget(activeId)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
                <div className="toolbar-group">
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.undo")}
                  >
                    <FiRotateCcw />
                  </button>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.redo")}
                  >
                    <FiRotateCw />
                  </button>
                </div>
                <div className="toolbar-group">
                  <label className="label">
                    {t("components.reportPage.page_label")}
                  </label>
                  <select
                    className="page-select"
                    value={pageKey}
                    onChange={(e) => setPageKey(e.target.value)}
                  >
                    {PAGE_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="toolbar-group">
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.zoom_out")}
                    onClick={handleZoomOut}
                  >
                    <FiZoomOut />
                  </button>
                  <select
                    className="zoom-select"
                    value={scale}
                    onChange={handleZoomSelect}
                  >
                    <option value={0.5}>50%</option>
                    <option value={0.75}>75%</option>
                    <option value={1}>100%</option>
                    <option value={1.25}>125%</option>
                    <option value={1.5}>150%</option>
                  </select>
                  <button
                    className="tb-btn"
                    title={t("components.reportPage.zoom_in")}
                    onClick={handleZoomIn}
                  >
                    <FiZoomIn />
                  </button>
                </div>
                <div className="toolbar-group">
                  <div className="dropdown">
                    <div className="dropdown-menu">
                      <button onClick={() => alignActive("left")}>
                        {t("components.reportPage.align_left")}
                      </button>
                      <button onClick={() => alignActive("center")}>
                        {t("components.reportPage.align_center")}
                      </button>
                      <button onClick={() => alignActive("right")}>
                        {t("components.reportPage.align_right")}
                      </button>
                      <hr />
                      <button onClick={() => alignActive("top")}>
                        {t("components.reportPage.align_top")}
                      </button>
                      <button onClick={() => alignActive("middle")}>
                        {t("components.reportPage.align_middle")}
                      </button>
                      <button onClick={() => alignActive("bottom")}>
                        {t("components.reportPage.align_bottom")}
                      </button>
                    </div>
                  </div>
                  <div className="dropdown">
                    <div className="dropdown-menu">
                      <span className="hint-item">
                        {t("components.reportPage.coming_soon")}
                      </span>
                    </div>
                  </div>
                  <div className="dropdown">
                    <div className="dropdown-menu">
                      <span className="hint-item">
                        {t("components.reportPage.grid_rulers")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="toolbar-right">
                  <button
                    className="tb-btn preview-btn"
                    style={{
                      background: "#635bff",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      boxShadow: "0 1px 4px 0 rgba(99,91,255,0.10)",
                      width: "160px",
                      padding: "0 20px",
                      fontSize: "14px",
                    }}
                    onClick={() => setShowPreview(true)}
                  >
                    <FiEye style={{ marginRight: 10 }} />{" "}
                    {t("components.reportPage.preview")}
                  </button>
                </div>
              </div>

              <div className="work-area">
                <div className="design-sidebar">
                  <div className="report-dropdown-container">
                    <label
                      htmlFor="report-design-select"
                      className="design-sidebar-title"
                    >
                      {t("components.reportPage.report_designs")}
                    </label>
                    <select
                      id="report-design-select"
                      className="report-dropdown"
                      value={selectedReportDesign}
                      onChange={(e) => {
                        const selectedId = parseInt(e.target.value, 10);
                        setSelectedReportDesign(selectedId);

                        const selectedDesign = reportDesigns.find(
                          (design) => design.id === selectedId
                        );
                        if (selectedDesign) {
                          handleLoadCanvas(selectedDesign.json);
                        }
                      }}
                    >
                      <option value="">
                        {t("components.reportPage.select_report_design")}
                      </option>
                      {reportDesigns.map((design) => (
                        <option key={design.id} value={design.id}>
                          {design.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <h3 className="design-sidebar-title">
                    {t("components.reportPage.basic_items")}
                  </h3>
                  <ul className="toolbox">
                    {initialToolbox.map((tool) => (
                      <li
                        key={tool.type}
                        draggable
                        onDragStart={handleToolDragStart(tool)}
                        onDragEnd={handleToolDragEnd}
                        className={`tool ${draggingTool === tool.type ? "dragging" : ""}`}
                      >
                        {t(`components.reportPage.toolbox.${tool.type}`)}
                      </li>
                    ))}
                  </ul>

                  <h3 className="design-sidebar-title">
                    {t("components.reportPage.headers_and_footers")}
                  </h3>
                  <ul className="toolbox">
                    {headerFooterToolbox.map((tool) => (
                      <li
                        key={tool.type}
                        draggable
                        onDragStart={handleToolDragStart(tool)}
                        onDragEnd={handleToolDragEnd}
                        className={`tool ${draggingTool === tool.type ? "dragging" : ""}`}
                      >
                        {t(`components.reportPage.toolbox.${tool.type}`)}
                      </li>
                    ))}
                  </ul>
                  <h3 className="design-sidebar-title">
                    {t("components.reportPage.data")}
                  </h3>
                  <ul className="toolbox">
                    <li
                      key="data-table"
                      draggable
                      onDragStart={handleToolDragStart({
                        type: "data-table",
                        label: "Data Table",
                      })}
                      onDragEnd={handleToolDragEnd}
                      className={`tool ${draggingTool === "data-table" ? "dragging" : ""}`}
                    >
                      {t("components.reportPage.toolbox.data_table")}
                    </li>
                  </ul>
                  <div className="hint">
                    {t("components.reportPage.drag_item_canvas")}
                  </div>
                </div>

                <div className="design-canvas-wrapper">
                  <div
                    className="canvas-area"
                    style={{ "--ruler-thickness": `${RULER_THICKNESS}px` }}
                  >
                    {/* Top Ruler */}
                    <div className="ruler horizontal">
                      {hTicks.map((i) => {
                        const px = i * GRID_SIZE;
                        const isMajor = i % LABEL_EVERY_CELLS === 0;
                        const isMedium = i % 5 === 0;
                        return (
                          <div
                            key={`h-${i}`}
                            className={`tick ${isMajor ? "major" : isMedium ? "medium" : "minor"}`}
                            style={{ left: px }}
                          >
                            {isMajor && (
                              <span className="label">{i * GRID_SIZE}</span>
                            )}
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
                          <div
                            key={`v-${i}`}
                            className={`tick ${isMajor ? "major" : isMedium ? "medium" : "minor"}`}
                            style={{ top: px }}
                          >
                            {isMajor && (
                              <span className="label">{i * GRID_SIZE}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div
                      ref={canvasRef}
                      className="design-canvas"
                      onDrop={handleCanvasDrop}
                      onDragOver={handleCanvasDragOver}
                      style={{
                        width:
                          currentPreset.width === "auto"
                            ? "100%"
                            : currentPreset.width,
                        height:
                          currentPreset.height === "auto"
                            ? "100%"
                            : currentPreset.height,
                      }}
                    >
                      <div
                        className="canvas-zoom"
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: "top left",
                        }}
                      >
                        {widgets.map((w) => (
                          <div
                            key={w.id}
                            className={`widget ${w.type} ${activeId === w.id ? "active" : ""}`}
                            style={{
                              left: w.x,
                              top: w.y,
                              width: w.width,
                              height: w.height,
                              transform: `rotate(${w.rotation || 0}deg)`,
                              transformOrigin: "center",
                            }}
                            onMouseDown={() => {
                              setActiveId(w.id);
                              if (w.type === "image") {
                                setSelectedImageWidget(w);
                                setShowImageSidebar(true);
                              } else if (w.type === "textbox") {
                                setSelectedTextWidget(w);
                                setShowTextSidebar(true);
                              }
                            }}
                          >
                            {/* Move handle */}
                            {activeId === w.id && (
                              <button
                                className="move-handle"
                                title={t("components.reportPage.move")}
                                onMouseDown={(e) => startMove(w.id, e)}
                              >
                                <FiMove size={14} />
                              </button>
                            )}
                            {/* Rotation handle */}
                            {activeId === w.id && (
                              <button
                                className="rotate-handle"
                                title={t("components.reportPage.rotate")}
                                onMouseDown={(e) => startRotate(w.id, e)}
                              >
                                <FiRotateCw size={14} />
                              </button>
                            )}
                            {w.type === "textbox" && (
                              <textarea
                                className="widget-textarea"
                                value={w.text}
                                onChange={(e) =>
                                  handleTextChange(w.id, e.target.value)
                                }
                                style={{
                                  fontFamily: w.fontFamily || "Arial",
                                  fontSize: `${w.fontSize || 16}px`,
                                  fontWeight: w.fontWeight || "normal",
                                  fontStyle: w.fontStyle || "normal",
                                  textDecoration: w.textDecoration || "none",
                                  color: w.textColor || "#000000",
                                  backgroundColor:
                                    w.backgroundColor || "transparent",
                                  textAlign: w.textAlign || "left",
                                  lineHeight: w.lineHeight || 1.5,
                                  letterSpacing: `${w.letterSpacing || 0}px`,
                                  border:
                                    w.borderWidth > 0
                                      ? `${w.borderWidth}px solid ${w.borderColor}`
                                      : "none",
                                  borderRadius: `${w.borderRadius || 0}px`,
                                  boxShadow:
                                    w.shadow !== "none"
                                      ? w.shadow === "custom"
                                        ? `${w.shadowOffsetX}px ${w.shadowOffsetY}px ${w.shadowBlur}px ${w.shadowColor}`
                                        : w.shadow === "small"
                                          ? "0 1px 3px rgba(0,0,0,0.12)"
                                          : w.shadow === "medium"
                                            ? "0 4px 6px rgba(0,0,0,0.1)"
                                            : "0 10px 15px rgba(0,0,0,0.1)"
                                      : "none",
                                  opacity: (w.opacity || 100) / 100,
                                }}
                              />
                            )}
                            {w.type === "rectangle" && (
                              <div className="rectangle-shape" />
                            )}
                            {w.type === "line" && (
                              <div className="line-shape" />
                            )}
                            {w.type === "dashline" && (
                              <div className="dashline-shape" />
                            )}
                            {w.type === "image" &&
                              (w.imageSrc ? (
                                <img
                                  src={w.imageSrc}
                                  alt={w.altText || "Image"}
                                  style={{
                                    opacity: w.opacity / 100,
                                    border:
                                      w.borderWidth > 0
                                        ? `${w.borderWidth}px solid ${w.borderColor}`
                                        : "none",
                                    borderRadius: `${w.borderRadius}px`,
                                    boxShadow:
                                      w.shadow !== "none"
                                        ? w.shadow === "custom"
                                          ? `${w.shadowOffsetX}px ${w.shadowOffsetY}px ${w.shadowBlur}px ${w.shadowColor}`
                                          : w.shadow === "small"
                                            ? "0 1px 3px rgba(0,0,0,0.12)"
                                            : w.shadow === "medium"
                                              ? "0 4px 6px rgba(0,0,0,0.1)"
                                              : "0 10px 15px rgba(0,0,0,0.1)"
                                        : "none",
                                    filter:
                                      w.filter !== "none"
                                        ? `${w.filter}(${w.filterIntensity}%)`
                                        : "none",
                                    objectFit: w.objectFit || "fill",
                                    width: "100%",
                                    height: "100%",
                                  }}
                                  className="image-widget"
                                />
                              ) : (
                                <div className="image-placeholder">Image</div>
                              ))}
                            {w.type === "header" && (
                              <div className="header-placeholder">
                                <div className="widget-dropdown">
                                  <button className="dropdown-toggle">
                                    Header ▼
                                  </button>
                                  <div className="dropdown-content">
                                    <button className="dropdown-item">
                                      Existing Headers
                                    </button>
                                    <button className="dropdown-item add-new">
                                      + Add Header
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {w.type === "footer" && (
                              <div className="footer-placeholder">
                                <div className="widget-dropdown">
                                  <button className="dropdown-toggle">
                                    Footer ▼
                                  </button>
                                  <div className="dropdown-content">
                                    <button className="dropdown-item">
                                      Existing Footers
                                    </button>
                                    <button className="dropdown-item add-new">
                                      + Add Footer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {w.type === "data-table" && (
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
                                <div
                                  className="rz rz-nw"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "nw", e)
                                  }
                                />
                                <div
                                  className="rz rz-n"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "n", e)
                                  }
                                />
                                <div
                                  className="rz rz-ne"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "ne", e)
                                  }
                                />
                                <div
                                  className="rz rz-e"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "e", e)
                                  }
                                />
                                <div
                                  className="rz rz-se"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "se", e)
                                  }
                                />
                                <div
                                  className="rz rz-s"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "s", e)
                                  }
                                />
                                <div
                                  className="rz rz-sw"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "sw", e)
                                  }
                                />
                                <div
                                  className="rz rz-w"
                                  onMouseDown={(e) =>
                                    startResizeDir(w.id, "w", e)
                                  }
                                />
                              </>
                            )}
                            {/* Coordinate Label */}
                            <div className="coordinate-label">
                              ({Math.round(w.x + w.width)},{" "}
                              {Math.round(w.y + w.height)})
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
                <div
                  className="preview-overlay"
                  onClick={() => setShowPreview(false)}
                >
                  <div
                    className="preview-modal"
                    style={{ padding: 0, background: "#f5f5f5" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="preview-header">
                      <span>{t("components.reportPage.grid_preview")}</span>
                      <button
                        className="close-btn"
                        onClick={() => setShowPreview(false)}
                      >
                        {t("components.reportPage.close")}
                      </button>
                    </div>
                    <div
                      className="preview-canvas"
                      style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        background: "#fff",
                        margin: 0,
                      }}
                    >
                      {/* Render rulers and widgets only, no sidebar or toolbar */}
                      {/* Top Ruler */}
                      <div className="ruler horizontal">
                        {hTicks.map((i) => {
                          const px = i * GRID_SIZE;
                          const isMajor = i % LABEL_EVERY_CELLS === 0;
                          const isMedium = i % 5 === 0;
                          return (
                            <div
                              key={`h-${i}`}
                              className={`tick ${isMajor ? "major" : isMedium ? "medium" : "minor"}`}
                              style={{ left: px }}
                            >
                              {isMajor && (
                                <span className="label">{i * GRID_SIZE}</span>
                              )}
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
                            <div
                              key={`v-${i}`}
                              className={`tick ${isMajor ? "major" : isMedium ? "medium" : "minor"}`}
                              style={{ top: px }}
                            >
                              {isMajor && (
                                <span className="label">{i * GRID_SIZE}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="canvas-zoom"
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: "top left",
                          width: "100%",
                          height: "100%",
                          position: "relative",
                        }}
                      >
                        {widgets.map((w) => (
                          <div
                            key={`quick-${w.id}`}
                            className={`widget ${w.type}`}
                            style={{
                              left: w.x,
                              top: w.y,
                              width: w.width,
                              height: w.height,
                              transform: `rotate(${w.rotation || 0}deg)`,
                              transformOrigin: "center",
                            }}
                          >
                            {w.type === "textbox" && (
                              <div className="text-preview">{w.text}</div>
                            )}
                            {w.type === "rectangle" && (
                              <div className="rectangle-shape" />
                            )}
                            {w.type === "line" && (
                              <div className="line-shape" />
                            )}
                            {w.type === "image" && (
                              <div className="image-placeholder">Image</div>
                            )}
                            {w.type === "header" && (
                              <div className="header-placeholder">Header</div>
                            )}
                            {w.type === "footer" && (
                              <div className="footer-placeholder">Footer</div>
                            )}
                            {w.type === "data-table" && (
                              <div className="data-table-placeholder">
                                Data Table
                              </div>
                            )}
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
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "30px 40px",
              textAlign: "center",
              maxWidth: "400px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ marginBottom: "20px", color: "#d9534f" }}>Error</h2>
            <p style={{ marginBottom: "25px", fontSize: "16px" }}>
              {errorMessage ||
                "Something went wrong while loading the configuration."}
            </p>
            <button
              //onClick={() => window.location.href = "/"} // Redirect to home page
              onClick={() => setShowErrorPopup(false)}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>
              {editModalType === "footer"
                ? t("Edit Footer")
                : editModalType === "heading"
                  ? t("Edit Heading")
                  : t("Edit Subheading")}
            </h3>
            <textarea
              value={editModalContent}
              onChange={(e) => setEditModalContent(e.target.value)}
              rows={5}
              style={{ width: "100%" }}
            />
            <div
              className="edit-modal-actions"
              style={{ marginTop: "10px", textAlign: "right" }}
            >
              <button
                onClick={() => {
                  // Save changes
                  if (editModalType === "footer") {
                    setHeadingsData((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        [`footer_${currentLanguage}`]: editModalContent,
                      },
                    }));
                    setFooter(editModalContent);
                  } else {
                    const key = editModalType; // 'heading' or 'subHeading'
                    const idx = editModalIndex;
                    setHeadingsData((prev) => ({
                      ...prev,
                      [key]: {
                        ...prev[key],
                        [`${key}_${currentLanguage}`]: editModalContent,
                      },
                    }));

                    const updatedHeadings = [...headings];
                    updatedHeadings[idx].content = editModalContent;
                    setHeadings(updatedHeadings);
                  }
                  setEditModalOpen(false);
                }}
              >
                {t("Save")}
              </button>

              <button
                onClick={() => {
                  // Revert to original value
                  let originalValue = "";
                  if (editModalType === "footer") {
                    originalValue =
                      selectedConfig?.activeCfg?.footer?.[
                        `footer_${currentLanguage}`
                      ] || "";
                  } else if (editModalType === "heading") {
                    originalValue =
                      selectedConfig?.activeCfg?.heading?.[
                        `heading_${currentLanguage}`
                      ] || "";
                  } else if (editModalType === "subHeading") {
                    originalValue =
                      selectedConfig?.activeCfg?.subHeading?.[
                        `subHeading_${currentLanguage}`
                      ] || "";
                  }
                  setEditModalContent(originalValue);
                }}
                style={{ marginLeft: "8px" }}
              >
                {t("Revert")}
              </button>

              <button
                onClick={() => setEditModalOpen(false)}
                style={{ marginLeft: "8px" }}
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
