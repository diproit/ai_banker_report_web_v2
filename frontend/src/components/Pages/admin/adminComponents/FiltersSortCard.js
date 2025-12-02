import React, { useState } from "react";
import { BsFileWord, BsTable, BsFilePdf } from "react-icons/bs";
import { formatFieldDisplayName } from "../utils/adminHelpers";

export default function FiltersSortCard({
    t,
    formData,
    exportFormats,
    selectFields,
    fieldAlignments,
    handleFilterChange,
    handleExportFormatChange,
    handleAlignmentChange,
    getIncludeFieldsState,
    toggleAllIncludeFields,
    toggleIncludeField,
    getSearchFieldsState,
    toggleAllSearchFields,
    toggleSearchField,
    updateSortOrder
}) {
    const [isAlignmentOpen, setIsAlignmentOpen] = useState(false);
    return (
        <div className="card filters-sort-card">
            <div className="card-header">
                <h3>{t("admin.filters_and_sort")}</h3>
            </div>
            <div className="card-body">
                <div className="filters-sort-combined">
                    {/* Filter Checkboxes */}
                    <div className="form-group">
                        <div className="filters-group">
                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={formData.isTransactionReport}
                                    onChange={() =>
                                        handleFilterChange("isTransactionReport")
                                    }
                                />
                                {t("admin.transaction_report")}
                            </label>
                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={formData.enableDateRange}
                                    onChange={() => handleFilterChange("enableDateRange")}
                                />
                                {t("admin.enable_date_range")}
                            </label>
                        </div>
                    </div>

                    {/* Set Alignment Dropdown */}
                    <div className="form-group alignment-dropdown-group" style={{ position: 'relative' }}>
                        <label style={{ marginBottom: '8px', display: 'block', fontWeight: '500' }}>
                            {t("admin.set_alignment")}
                        </label>
                        <div className="alignment-dropdown-wrapper" style={{ position: 'relative' }}>
                            <div 
                                className="alignment-dropdown-trigger"
                                onClick={() => setIsAlignmentOpen(!isAlignmentOpen)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>Select field to set alignment</span>
                                <span style={{ fontSize: '12px' }}>{isAlignmentOpen ? '▲' : '▼'}</span>
                            </div>
                            {isAlignmentOpen && (
                                <div 
                                    className="alignment-dropdown-content"
                                    style={{
                                        position: 'absolute',
                                        backgroundColor: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        marginTop: '4px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        width: '100%',
                                        zIndex: 1000,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {selectFields.map((field, index) => {
                                        const fieldKey = field.name_en; // Logic key - keep full expression
                                        const displayName = formatFieldDisplayName(field.name_en); // Display - alias only
                                        const currentAlignment = fieldAlignments[fieldKey] || field.alignment || 'left';
                                        
                                        return (
                                            <div 
                                                key={index} 
                                                className="alignment-item"
                                                style={{
                                                    padding: '10px 12px',
                                                    borderBottom: index < selectFields.length - 1 ? '1px solid #f0f0f0' : 'none'
                                                }}
                                            >
                                                <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '13px' }}>
                                                    {displayName}
                                                </div>
                                                <div 
                                                    className="alignment-radio-group"
                                                    style={{
                                                        display: 'flex',
                                                        gap: '12px',
                                                        paddingLeft: '10px'
                                                    }}
                                                >
                                                    {['left', 'center', 'right'].map((alignment) => (
                                                        <label 
                                                            key={alignment}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`alignment-${fieldKey}`}
                                                                value={alignment}
                                                                checked={currentAlignment === alignment}
                                                                onChange={() => handleAlignmentChange(fieldKey, alignment)}
                                                                style={{ marginRight: '4px' }}
                                                            />
                                                            {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export Options - horizontal line with compact spacing */}
                    <div className="form-group export-options-group">
                        <label>{t("admin.export_options")}</label>
                        <div className="export-options">
                            {[
                                {
                                    key: "word",
                                    label: "Word",
                                    icon: <BsFileWord size={14} color="#2b579a" />,
                                },
                                {
                                    key: "table",
                                    label: "Table",
                                    icon: <BsTable size={14} color="#6c757d" />,
                                },
                                {
                                    key: "pdf",
                                    label: "PDF",
                                    icon: <BsFilePdf size={14} color="#e74c3c" />,
                                },
                            ].map(({ key, label, icon }) => (
                                <label key={key} className="export-format">
                                    <input
                                        type="checkbox"
                                        checked={exportFormats[key]}
                                        onChange={() => handleExportFormatChange(key)}
                                    />
                                    {icon}
                                    <span>{t(`admin.export_${key}`)}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Include Properties */}
                    <div className="property-card">
                        <div
                            className="property-header"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                            }}
                        >
                            <h5 style={{ margin: 0 }}>
                                {t("admin.include_properties")}
                            </h5>
                            <label
                                className="select-all-checkbox"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={getIncludeFieldsState() === "all"}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate =
                                                getIncludeFieldsState() === "partial";
                                        }
                                    }}
                                    onChange={toggleAllIncludeFields}
                                    style={{ marginRight: "5px" }}
                                />
                                {getIncludeFieldsState() === "all"
                                    ? t("admin.deselect_all")
                                    : t("admin.select_all")}
                            </label>
                        </div>
                        <div className="properties-list">
                            <div className="properties-list-content">
                                {formData.includeFields.map((field, index) => (
                                    <div key={index} className="properties-item">
                                        <input
                                            type="checkbox"
                                            id={`include-${index}`}
                                            checked={!field.excluded}
                                            onChange={() => toggleIncludeField(index)}
                                        />
                                        <label
                                            htmlFor={`include-${index}`}
                                            className="truncate"
                                        >
                                            {formatFieldDisplayName(field.name)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Search Properties */}
                    <div className="property-card">
                        <div
                            className="property-header"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                            }}
                        >
                            <h5 style={{ margin: 0 }}>
                                {t("admin.search_properties")}
                            </h5>
                            <label
                                className="select-all-checkbox"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={getSearchFieldsState() === "all"}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate =
                                                getSearchFieldsState() === "partial";
                                        }
                                    }}
                                    onChange={toggleAllSearchFields}
                                    style={{ marginRight: "5px" }}
                                />
                                {getSearchFieldsState() === "all"
                                    ? t("admin.deselect_all")
                                    : t("admin.select_all")}
                            </label>
                        </div>
                        <div className="properties-list">
                            <div className="properties-list-content">
                                {formData.searchFields.map((field, index) => (
                                    <div key={index} className="properties-item">
                                        <input
                                            type="checkbox"
                                            id={`search-${index}`}
                                            checked={!field.excluded}
                                            onChange={() => toggleSearchField(index)}
                                        />
                                        <label
                                            htmlFor={`search-${index}`}
                                            className="truncate"
                                        >
                                            {formatFieldDisplayName(field.name)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sort Order */}
                    <div className="sort-container">
                        <h5>{t("admin.sort_order")}</h5>
                        {formData.sortFields.map((field, index) => (
                            <div key={index} className="sort-item">
                                <div className="sort-item-label truncate">
                                    {formatFieldDisplayName(field.name)}
                                </div>
                                <div className="sort-options">
                                    <label className="radio-group">
                                        <input
                                            type="radio"
                                            name={`sort-${index}`}
                                            checked={field.order === "ASC"}
                                            onChange={() => updateSortOrder(index, "ASC")}
                                        />
                                        {t("components.reportPage.sort_labels.asc")}
                                    </label>
                                    <label className="radio-group">
                                        <input
                                            type="radio"
                                            name={`sort-${index}`}
                                            checked={field.order === "DESC"}
                                            onChange={() => updateSortOrder(index, "DESC")}
                                        />
                                        {t("components.reportPage.sort_labels.desc")}
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}