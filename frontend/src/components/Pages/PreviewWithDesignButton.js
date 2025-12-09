import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import htmlToPdfmake from "html-to-pdfmake";
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts"; // pdfMake needs fonts
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/api";
import { post } from "../../clients/apiClient";

pdfMake.vfs = pdfFonts && pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : {};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
console.log(API_BASE_URL);

/**
 * Utility: convert page-config units (if needed)
 * If your design JSON uses px already, leave as-is.
 * If it uses mm/cm you can convert: mm -> px (96dpi -> 1mm = 3.779527559px)
 */
const mmToPx = (mm) => mm * 3.7795275591;

/**
 * Inline computed styles on a cloned DOM tree so converters capture exact look.
 * We clone the node to avoid mutating the visible DOM.
 */
function cloneAndInlineComputedStyles(node) {
  const clone = node.cloneNode(true);

  const walkOrig = [];
  const walkClone = [];

  // BFS both originals and clones in parallel
  walkOrig.push(node);
  walkClone.push(clone);

  while (walkOrig.length) {
    const origEl = walkOrig.shift();
    const cloneEl = walkClone.shift();

    if (origEl.nodeType === Node.ELEMENT_NODE) {
      const computed = window.getComputedStyle(origEl);

      // Keep a short set of properties needed for fidelity.
      // Add more if needed.
      const propsToCopy = [
        "position",
        "left",
        "top",
        "right",
        "bottom",
        "width",
        "height",
        "padding",
        "margin",
        "font-size",
        "font-family",
        "font-weight",
        "line-height",
        "color",
        "background-color",
        "border",
        "border-radius",
        "text-align",
        "vertical-align",
        "display",
        "white-space",
        "overflow",
        "box-sizing",
      ];

      const styleTextParts = [];
      for (const p of propsToCopy) {
        try {
          const val = computed.getPropertyValue(p);
          if (val) styleTextParts.push(`${p}:${val};`);
        } catch (e) {
          /* some properties may error; ignore */
        }
      }

      // If element already had inline styles, preserve them (append)
      const prev = cloneEl.getAttribute("style") || "";
      cloneEl.setAttribute("style", prev + styleTextParts.join(""));
    }

    // push children
    const origChildren = origEl.children || [];
    const cloneChildren = cloneEl.children || [];
    for (let i = 0; i < origChildren.length; i++) {
      walkOrig.push(origChildren[i]);
      walkClone.push(cloneChildren[i]);
    }
  }

  return clone;
}

// --- Helper Functions ---
// Dummy fallback design
const DUMMY_DESIGN_JSON = {
  version: "1.0.0",
  elements: [
    {
      id: "header-1",
      type: "textbox",
      x: 50,
      y: 20,
      width: 200,
      height: 40,
      text: "Sample Report Title",
    },
  ],
};

const fetchDesignJSON = async (reportId) => {
  console.log(`Fetching design for report ID: ${reportId}...`);

  try {
    const payload = {
      it_user_master_id: 1,
      it_report_structure_id: 7,
    };

    // Use centralized API client (credentials sent automatically)
    const data = await post("/report-design/json_load", payload);

    let fileString = data.data[0].report_design_json;
    console.log("Raw design JSON:", data);

    // Clean wrapping quotes and escaped quotes if necessary
    if (fileString.startsWith('"') && fileString.endsWith('"')) {
      fileString = fileString.slice(1, -1).replace(/\\"/g, '"');
    }

    const designJson = JSON.parse(fileString);
    console.log("Parsed design JSON:", designJson);

    return designJson;
  } catch (error) {
    console.error("Error fetching design JSON, using dummy:", error);
    return DUMMY_DESIGN_JSON; // fallback
  }
};

const DUMMY_REPORT_DATA = {
  columns: [
    { key: "product", label: "Product" },
    { key: "sales", label: "Sales ($)" },
    { key: "units", label: "Units Sold" },
  ],
  rows: [
    { product: "Product A", sales: 1500, units: 300 },
    { product: "Product B", sales: 2200, units: 450 },
    { product: "Product C", sales: 900, units: 180 },
    { product: "Product D", sales: 3100, units: 600 },
  ],
};

const fetchReportData = async (reportData, columnVisibility) => {
  console.log(`Fetching report data...`, reportData);
  console.log("Column visibility:", columnVisibility);

  try {
    const result = reportData;
    console.log("Result from generateReport:", result);

    // Get all columns from the first row of data
    const allColumns =
      result.fetchedData && result.fetchedData.length > 0
        ? Object.keys(result.fetchedData[0])
        : [];
    console.log("showcolumnthings 1:", allColumns);
    // Filter columns based on visibility
    const visibleColumns = allColumns.filter(
      (column) => columnVisibility[column] === true
    );
    console.log("showcolumnthings 2:", visibleColumns);
    // Filter rows to only include visible columns
    let filteredRows;
    if (result.fetchedData.length > (result.rows?.length || 0)) {
      filteredRows = (result.rows || []).map((row) => {
        const filteredRow = {};
        visibleColumns.forEach((column) => {
          filteredRow[column] = row[column];
        });
        return filteredRow;
      });
    } else {
      filteredRows = (result.fetchedData || []).map((row) => {
        const filteredRow = {};
        visibleColumns.forEach((column) => {
          filteredRow[column] = row[column];
        });
        return filteredRow;
      });
    }
    console.log("showcolumnthings 3:", filteredRows);
    const footer = result.updatedFooter || "";
    const headings = result.updatedHeadings || [];

    const data = {
      columns: visibleColumns,
      rows: filteredRows,
      footer,
      headings,
    };

    console.log("Data returned by fetchReportData:", data);
    return data;
  } catch (error) {
    console.error("Error fetching report data:", error);
    return DUMMY_REPORT_DATA;
  }
};

const sortData = (data, sorting) => {
  if (!sorting || sorting.length === 0) {
    return data;
  }

  return [...data].sort((a, b) => {
    for (let i = 0; i < sorting.length; i++) {
      const { id, desc } = sorting[i];
      const aValue = a[id];
      const bValue = b[id];

      if (aValue === bValue) {
        continue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return desc
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      return desc ? bValue - aValue : aValue - bValue;
    }
    return 0;
  });
};

/**
 * renderPreview function - renders paginated preview
 */
const renderPreview = (
  designJSON,
  reportData,
  headings,
  footer,
  columnHeaders,
  instituteName,
  alignmentMap
) => {
  console.log("Column headers:", columnHeaders);
  const { pageConfig, elements } = designJSON;
  const { rows } = reportData;

  const pageWidth = pageConfig.width;
  const pageHeight = pageConfig.height;

  const pageStyle = {
    position: "relative",
    width: `100%`,
    minHeight: `500px`,
    margin: "0 auto 20px",
    border: "1px solid #ddd",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
    overflow: "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px",
  };

  // Helper function to get translated column name - only for columns that exist in rows
  const getTranslatedColumnName = (colName) => {
    if (
      !columnHeaders ||
      !columnHeaders.columns ||
      columnHeaders.columns.length === 0
    ) {
      return colName; // Return original if no headers available
    }

    const currentLang = columnHeaders.language;

    // Find the column in columnHeaders where the colName matches ANY language variant
    const columnData = columnHeaders.columns.find((col) => {
      // Check if colName matches any of the language variants
      return (
        col.name_en === colName ||
        col.name_si === colName ||
        col.name_ta === colName ||
        col.name_tl === colName ||
        col.name_th === colName
      );
    });

    if (!columnData) {
      return colName; // Return original if not found in columnHeaders
    }

    // Return the name in the current language
    switch (currentLang) {
      case "en":
        return columnData.name_en || colName;
      case "si":
        return columnData.name_si || columnData.name_en || colName;
      case "ta":
        return columnData.name_ta || columnData.name_en || colName;
      case "tl":
        return columnData.name_tl || columnData.name_en || colName;
      case "th":
        return columnData.name_th || columnData.name_en || colName;
      default:
        return columnData.name_en || colName;
    }
  };

  const renderElement = (element) => {
    const commonStyle = {
      position: "absolute",
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: element.width ? `${element.width}px` : "auto",
      height: element.height ? `${element.height}px` : "auto",
      boxSizing: "border-box",
      ...element.style,
    };

    switch (element.type) {
      case "textbox":
      case "header":
      case "footer":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              whiteSpace: element.wrap === false ? "nowrap" : "normal",
              overflow: "visible",
            }}
          >
            {element.text}
          </div>
        );
      case "rectangle":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: element.backgroundColor || "transparent",
              border: `${element.borderWidth || 0}px solid ${element.borderColor || "transparent"}`,
              borderRadius: `${element.borderRadius || 0}px`,
            }}
          />
        );
      case "image":
        return (
          <img
            key={element.id}
            src={element.imageSrc}
            alt={element.altText || ""}
            style={{ ...commonStyle, objectFit: element.objectFit || "cover" }}
          />
        );
      case "line":
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: element.backgroundColor || "#000",
              height: element.height ? `${element.height}px` : "1px",
            }}
          />
        );
      default:
        return null;
    }
  };

  const tableElement = elements.find((el) => el.type === "data-table");
  const otherElements = elements.filter((el) => el.type !== "data-table");

  // Get columns from actual row data (only existing columns)
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Calculate rows per page based on A4 page height
  // A4 is 297mm tall, with margins and headers we can fit approximately 40-45 rows
  const rowsPerA4Page = 40; // Adjusted for A4 page height
  const chunkSize = rowsPerA4Page;
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }

  const lastPageIndex = chunks.length - 1;
  const pages = chunks.map((chunk, idx) => {
    const isFirst = idx === 0;
    return (
      <div key={idx} className="page" style={pageStyle}>
{isFirst && (
  <div style={{ textAlign: "center", marginBottom: "20px" }}>
    {/* ✅ Institute Name (appears first, above headings) */}
    {instituteName && (
      <h2
        style={{
          margin: "0 0 10px 0",
          fontSize: "20px",
          fontWeight: "bold",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {instituteName}
      </h2>
    )}

    {/* Existing Headings */}
    {headings
      .filter((h) => h.include)
      .map((heading, index) => (
        <h2
          key={index}
          style={{
            margin: "5px 0",
            textAlign: "center",
          }}
        >
          {heading.content}
        </h2>
      ))}
  </div>
)}

        {isFirst && otherElements.map(renderElement)}
        <div
          style={{
            display: "flex",
            position: "relative",
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #eee",
            }}
          >
            <thead>
              <tr>
                {/* Only map columns that exist in rows data */}
                {cols.map((colName, colIndex) => (
                  <th
                    key={colIndex}
                    style={{
                      padding: "5px",
                      //border: "1px solid #eee",
                      backgroundColor: "#f9f9f9",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getTranslatedColumnName(colName)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chunk.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {cols.map((colName, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      style={{
                        padding: "8px",
                        // border: "1px solid #eee",
                        textAlign: alignmentMap[colName] || "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row[colName]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {idx === lastPageIndex && footer && (
          <div
            style={{ marginTop: "1px", textAlign: "center", fontSize: "12px" }}
          >
            <div dangerouslySetInnerHTML={{ __html: footer }} />
          </div>
        )}
      </div>
    );
  });

  return (
    <div
      className="pages-container"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {pages}
    </div>
  );
};
/**
 * PreviewWithDesignButton component - uses renderPreview and provides export functions
 */
let alignmentMap = {};
export const PreviewWithDesignButton = ({
  reportId,
  reportData,
  columnVisibility,
  headings,
  footer,
  sorting,
  columnOrder,
  columnHeaders,
  activeconfig,
  instituteName,
}) => {
  console.log("Column Headersaaaaaaaa:", activeconfig);
let originalConfig = null;

if (Array.isArray(activeconfig)) {
  originalConfig = activeconfig.find(c => c.name === "Original Configuration") || activeconfig[0];
} else {
  originalConfig = activeconfig;
}

const originalFields = originalConfig?.cfg?.fields?.include || [];

alignmentMap = {};
originalFields.forEach(f => {
  alignmentMap[f.name_en] = f.alignment || "left";
});


  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewComponent, setPreviewComponent] = useState(null);
  const [designJSON, setDesignJSON] = useState(null);
  const previewContainerRef = useRef(null);
  console.log("Column Visibility:", columnVisibility);

  // Handle click -> fetch design + data -> render preview DOM
  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const design = await fetchDesignJSON(reportId);
      const reportDataa = await fetchReportData(reportData, columnVisibility);

      setDesignJSON(design);
      // const restReportData = reportDataa;
      //const [headingData, ...restHeadingData] = headings;
      // Reorder rows based on columnOrder
      console.log("showcolumnthings 4:", reportDataa);
      console.log("showcolumnthings 5:", columnOrder);

      reportDataa.rows = reportDataa.rows.map((row) => {
        const newRow = {};
        columnOrder.forEach((key) => {
          if (key in row) {
            // only include keys that exist in the row
            newRow[key] = row[key];
          }
        });
        return newRow;
      });

      console.log("showcolumnthings 6:", reportDataa);
      // Create a React element (virtual). We will render to DOM inside modal.
      const preview = renderPreview(
        design,
        { ...reportDataa, rows: sortData(reportDataa.rows, sorting) },
        headings,
        footer,
        columnHeaders,
        instituteName,
        alignmentMap
      );
      setPreviewComponent(preview);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to load design/data:", err);
      alert(
        t("common.error") ||
          t("components.reportPage.loading") ||
          "Failed to load design or data. See console for details."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigate = useNavigate();
  const handlePreviewdesign = async () => {
    setIsLoading(true);

    try {
      // Instead of showing a modal, navigate to the design page
      navigate(`/design/${reportId}`);
    } catch (err) {
      console.error("Failed to navigate to design page:", err);
      alert("Failed to navigate to design page. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async (filename = `report-${reportId}.pdf`) => {
    if (!previewContainerRef.current || !designJSON)
      return alert("Preview not ready");
    const { pageConfig } = designJSON;
    const pageWidth = pageConfig.width;
    const pageHeight = pageConfig.height;

    const pageNodes = Array.from(
      previewContainerRef.current.querySelectorAll(".page")
    );
    const contents = [];
    for (const pageNode of pageNodes) {
      const cloned = cloneAndInlineComputedStyles(pageNode);
      const wrapper = document.createElement("div");
      wrapper.appendChild(cloned);
      const html = wrapper.innerHTML;
      const pdfContent = htmlToPdfmake(html, { window });
      contents.push(pdfContent);
    }

    let fullContent = [];
    contents.forEach((pageContent, idx) => {
      if (idx > 0 && pageContent.length > 0) {
        pageContent[0].pageBreak = "before";
      }
      fullContent = fullContent.concat(pageContent);
    });

    const docDefinition = {
      content: fullContent,
      pageSize: { width: pageWidth, height: pageHeight },
      pageMargins: [10, 10, 10, 10],
    };

    pdfMake.createPdf(docDefinition).download(filename);
  };

  const exportToWord = (filename = `report-${reportId}.docx`) => {
    if (!previewContainerRef.current || !designJSON)
      return alert("Preview not ready");
    const { pageConfig } = designJSON;
    const pageWidth = pageConfig.width;
    const pageHeight = pageConfig.height;

    const pageNodes = Array.from(
      previewContainerRef.current.querySelectorAll(".page")
    );
    const clonedPages = pageNodes.map(cloneAndInlineComputedStyles);
    const pagesHtml = clonedPages
      .map((cloned, idx) => {
        const style = idx > 0 ? "page-break-before:always;" : "";
        return `<div style="${style}">${cloned.outerHTML}</div>`;
      })
      .join("");

    const styles = `<style>
      @page Section1 { size: ${pageWidth}px ${pageHeight}px; margin: 10px; }
      div.Section1 { page: Section1; }
      body { margin:0; -webkit-print-color-adjust: exact; }
      </style>`;

    const html = `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body><div class="Section1">${pagesHtml}</div></body></html>`;

    // Convert to docx blob
    const blob = htmlDocx.asBlob(html);
    saveAs(blob, filename);
  };

  const exportToPrint = () => {
    if (!previewContainerRef.current || !designJSON)
      return alert("Preview not ready");

    const { elements } = designJSON;

    // Clone the entire preview container with all its elements
    const pageNodes = Array.from(
      previewContainerRef.current.querySelectorAll(".page")
    );

    // Get column count to determine orientation
    const firstPage = pageNodes[0];
    if (!firstPage) return alert("No content to print");

    const headerCells = firstPage.querySelectorAll("thead th");
    const columnCount = headerCells.length;
    const orientation = columnCount > 6 ? "landscape" : "portrait";

    // Calculate dynamic values
    const fontSize =
      columnCount > 80
        ? "3pt"
        : columnCount > 60
          ? "4pt"
          : columnCount > 40
            ? "5pt"
            : columnCount > 30
              ? "6pt"
              : columnCount > 20
                ? "7pt"
                : columnCount > 15
                  ? "8pt"
                  : columnCount > 10
                    ? "9pt"
                    : "10pt";
    const headingFontSize =
      columnCount > 50
        ? "8pt"
        : columnCount > 30
          ? "9pt"
          : columnCount > 20
            ? "10pt"
            : "12pt";
    const padding =
      columnCount > 50
        ? "0.5px"
        : columnCount > 30
          ? "1px"
          : columnCount > 15
            ? "1.5px"
            : "2px";

    // Calculate column width accounting for borders (1px total per cell = 0.5px left + 0.5px right)
    // Use calc() to subtract border widths from percentage
    const borderWidth = columnCount > 50 ? "0.5px" : "0.5px";
    const columnWidth = `calc(${100 / columnCount}% - 1px)`;

    const dateTime = new Date().toLocaleString();

    // Extract headings from the first page (shown once at top)
    const headings = Array.from(firstPage.querySelectorAll("h2"))
      .map((h) => h.outerHTML)
      .join("");

    // Build a single aggregated table that includes ALL rows from ALL pages
    const allTables = pageNodes
      .map((page) => page.querySelector("table"))
      .filter(Boolean);

    if (allTables.length === 0) return alert("No content to print");

    // Use the header from the first table
    const theadHTML = allTables[0].querySelector("thead")?.outerHTML || "";
    // Collect every row from every page's tbody
    const allRowsHTML = allTables
      .map((tbl) =>
        Array.from(tbl.querySelectorAll("tbody tr"))
          .map((tr) => tr.outerHTML)
          .join("")
      )
      .join("");


      const aggregatedTableHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        ${theadHTML}
        <tbody>
          ${allRowsHTML}
        </tbody>
      </table>
    `;

      const parser = new DOMParser();
      const doc = parser.parseFromString(aggregatedTableHTML, "text/html");

      // Apply alignment to each cell
      doc.querySelectorAll("tbody tr").forEach(row => {
        row.querySelectorAll("td").forEach((td, index) => {
          const colKey = headerCells[index]?.textContent?.trim();
          const alignment = alignmentMap[colKey] || "left";
          td.style.textAlign = alignment;
        });
      });

      const updatedTableHTML = doc.body.innerHTML;

    const pagesHtml = `
      <div class="print-page">
        ${headings ? `<div>${headings}</div>` : ""}
        <div>${updatedTableHTML}</div>
        ${footer ? `<div class="print-footer">${footer}</div>` : ""}
      </div>
    `;

    // Inline styles
    const styles = `
    <style>
      @page { 
        size: A4 ${orientation}; 
        margin: 15mm 10mm;
      }
      * {
        box-sizing: border-box;
      }
      html, body { 
        margin: 0; 
        padding: 0;
        width: 100%;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-page {
        width: 100%;
        overflow: visible;
        box-sizing: border-box;
        padding: 0 2mm;
      }
      .page { 
        width: 100%;
        max-width: 100%;
        display: block;
        overflow: visible;
        box-sizing: border-box;
      }
      /* Headings */
      .page > div:first-child {
        width: 100%;
      }
      .page > div:first-child h2 {
        margin: 3px 0;
        font-size: ${headingFontSize};
        text-align: center;
      }
      /* Table container */
      .page > div:nth-child(2),
      .page > div:nth-child(3) {
        width: 100%;
        max-width: 100%;
        overflow: visible;
        box-sizing: border-box !important;
      }
      table { 
        width: 99% !important; 
        max-width: 99% !important;
        //border-collapse: collapse !important; 
        table-layout: fixed !important;
        font-size: ${fontSize} !important;
        box-sizing: border-box !important;
        //border: 0.5px solid #333 !important;
        margin: 0 auto;
      }
      thead {
        display: table-header-group;
      }
      tbody {
        display: table-row-group;
      }
      thead th {
        padding: ${padding} !important;
        //border: 0.5px solid #333 !important;
        //border-right: 0.5px solid #333 !important;
        background-color: rgba(222, 218, 231, 1) !important;
        color: black !important;
        text-align: center !important;
        font-weight: bold !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: ${columnWidth} !important;
        width: ${columnWidth} !important;
        //box-sizing: border-box !important;
      }
      tbody td {
        padding: ${padding} !important;
        // border: 0.5px solid #333 !important;
        // border-right: 0.5px solid #333 !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: ${columnWidth} !important;
        width: ${columnWidth} !important;
        //box-sizing: border-box !important;
      }
      tbody tr {
        // border-right: 0.5px solid #333 !important;
      }
      tbody tr:nth-child(odd) {
        background-color: #f9f9f9 !important;
      }
      tbody tr:nth-child(even) {
        background-color: #ffffff !important;
      }
      /* Footer */
      .print-footer {
        width: 100%;
        margin-top: 5px;
        padding-top: 3px;
        text-align: center;
        font-size: 7pt;
      }
      
      /* Print-specific: ensure everything fits and paginates properly */
      @media print {
        @page {
          margin: 15mm 10mm;
          size: A4 ${orientation};
          @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-size: 8pt;
            color: #666;
          }
          @bottom-left {
            content: "${dateTime}";
            font-size: 8pt;
            color: #666;
          }
          @top-left {
            content: none;
          }
          @top-center {
            content: none;
          }
          @top-right {
            content: none;
          }
        }
        html, body {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        table {
          page-break-inside: auto !important;
          //border: 0.5px solid #333 !important;
          //border-right: 0.5px solid #333 !important;
        }
        thead {
          display: table-header-group !important;
        }
        tbody {
          display: table-row-group !important;
        }
        tr {
          page-break-inside: avoid !important;
          page-break-after: auto !important;
          //border-right: 0.5px solid #333 !important;
        }
        td, th {
          page-break-inside: avoid !important;
          //border-right: 0.5px solid #333 !important;
        }
      }
    </style>
  `;

    // Open new tab
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Preview Report</title>
      ${styles}
    </head>
    <body>${pagesHtml}</body>
    </html>
  `;

    // Create blob and object URL
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Open in new window
    const newWin = window.open(url, "_blank");
    if (!newWin) {
      URL.revokeObjectURL(url);
      return alert("Please allow popups for this site");
    }

    // Wait for content to load, then print
    newWin.onload = () => {
      setTimeout(() => {
        newWin.focus();
        newWin.print();
        // Clean up the object URL after printing
        newWin.onafterprint = () => {
          URL.revokeObjectURL(url);
        };
      }, 500);
    };
  };

  // Export to CSV function
  const exportToCSV = (filename = `report-${reportId}.csv`) => {
    if (!previewContainerRef.current || !designJSON)
      return alert("Preview not ready");

    // Get table data from the preview
    const pageNodes = Array.from(
      previewContainerRef.current.querySelectorAll(".page")
    );
    const tableData = [];
    const headers = [];

    // Extract headers from the first page
    if (pageNodes.length > 0) {
      const headerCells = pageNodes[0].querySelectorAll("thead th");
      headerCells.forEach((cell) => {
        headers.push(cell.textContent.trim());
      });

      // Extract data from all pages
      pageNodes.forEach((page) => {
        const rows = page.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const rowData = [];
          const cells = row.querySelectorAll("td");
          cells.forEach((cell) => {
            rowData.push(cell.textContent.trim());
          });
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        });
      });
    }

    // Convert to CSV format
    let csvContent = headers.join(",") + "\n";
    tableData.forEach((row) => {
      // Escape commas and quotes in cell values
      const escapedRow = row.map((cell) => {
        // If cell contains commas, quotes, or newlines, wrap in quotes and escape any quotes
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
      csvContent += escapedRow.join(",") + "\n";
    });

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  };

  return (
    <div>
      <button
        className="preview-report-button"
        onClick={handlePreview}
        disabled={isLoading}
      >
        {isLoading ? (
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
            {t("components.reportPage.loading")}
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
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                ry="2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="16"
                y1="2"
                x2="16"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="8"
                y1="2"
                x2="8"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="3"
                y1="10"
                x2="21"
                y2="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("components.reportPage.preview")}
          </>
        )}
      </button>
      {/* <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }} 
      onClick={handlePreviewdesign} 
      disabled={isLoading}>{isLoading ? "Loading..." : "Preview with Design"}</button> */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              width: "95%",
              height: "80%",
              background: "#fff",
              overflow: "auto",
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {/* Conditionally render PDF export button based on activeconfig */}
              {activeconfig?.[0]?.cfg?.exportOptions?.pdf === true && (
                <button
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={() => exportToPDF()}
                >
                  {t("components.reportPage.export_pdf")}
                </button>
              )}

              {/* Conditionally render Word export button based on activeconfig */}
              {activeconfig?.[0]?.cfg?.exportOptions?.doc === true && (
                <button
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#2196F3",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={() => exportToWord()}
                >
                  {t("components.reportPage.export_word")}
                </button>
              )}

              {/* Conditionally render CSV export button based on activeconfig */}
              {activeconfig?.[0]?.cfg?.exportOptions?.csv === true && (
                <button
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#FF9800",
                    color: "white",
                    cursor: "pointer",
                  }}
                  onClick={() => exportToCSV()}
                >
                  {t("components.reportPage.export_csv") || "Export CSV"}
                </button>
              )}

              {/* Print button is always available */}
              <button
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#FFC107",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => exportToPrint()}
              >
                {t("components.reportPage.export_print")}
              </button>

              <button
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#f44336",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowModal(false);
                  setIsLoading(false);
                }}
              >
                {t("common.cancel") || "Close"}
              </button>
            </div>

            {/* Preview container: render the React preview here */}
            <div
              ref={previewContainerRef}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "10px",
                // Provide a neutral background so inlined styles match screen
                background: "#f0f0f0",
              }}
            >
              {/* The rendered previewComponent is a React element representing the page */}
              {previewComponent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewWithDesignButton;
