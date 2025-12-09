import React from "react";
import { FiDownload } from "react-icons/fi";

export default function QueryResultsSection({
    t,
    i18n,
    error,
    isQueryLoading,
    isSaving,
    queryResults,
    queryColumns,
    editableHeaders,
    fieldTranslations,
    normalizeFieldName,
    normalizeLanguageCode,
    getColumnTranslation,
    setEditableHeaders,
    setFieldTranslations,
    handleExport
}) {
    // Use backend-provided column order, fallback to extracting from data if not available
    const columns = queryColumns && queryColumns.length > 0 
        ? queryColumns 
        : (queryResults.length > 0 ? Object.keys(queryResults[0]) : []);

    return (
        <div className="query-results">
            <div className="results-header">
                <h3>{t("admin.query_results")}</h3>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="results-table-container">
                {queryResults.length > 0 ? (
                    <table className="results-table">
                        <thead>
                            <tr>
                                {columns.map((key) => (
                                    <th key={key} className="truncate">
                                        {normalizeLanguageCode(i18n.language) !== "en" ? (
                                            <input
                                                type="text"
                                                value={
                                                    editableHeaders.hasOwnProperty(
                                                        normalizeFieldName(key)
                                                    )
                                                        ? editableHeaders[normalizeFieldName(key)]
                                                        : editableHeaders.hasOwnProperty(key)
                                                            ? editableHeaders[key]
                                                            : fieldTranslations[normalizeFieldName(key)]?.[
                                                            `name_${normalizeLanguageCode(
                                                                i18n.language
                                                            )}`
                                                            ] ||
                                                            fieldTranslations[key]?.[
                                                            `name_${normalizeLanguageCode(
                                                                i18n.language
                                                            )}`
                                                            ] ||
                                                            getColumnTranslation(key)
                                                }
                                                onChange={(e) => {
                                                    const normalizedKey = normalizeFieldName(key);
                                                    const currentLang = normalizeLanguageCode(
                                                        i18n.language
                                                    );
                                                    const value = e.target.value;

                                                    // Update editableHeaders for immediate display (store with both keys)
                                                    setEditableHeaders((prev) => ({
                                                        ...prev,
                                                        [normalizedKey]: value,
                                                        [key]: value, // Also store with original key for better lookup
                                                    }));

                                                    // Update fieldTranslations to preserve across language switches (store with both keys)
                                                    setFieldTranslations((prev) => ({
                                                        ...prev,
                                                        [normalizedKey]: {
                                                            ...prev[normalizedKey],
                                                            [`name_${currentLang}`]: value,
                                                        },
                                                        [key]: {
                                                            ...prev[key],
                                                            [`name_${currentLang}`]: value,
                                                        },
                                                    }));
                                                }}
                                                onFocus={(e) => {
                                                    // Ensure the field is marked as edited when focused
                                                    const normalizedKey = normalizeFieldName(key);
                                                    const currentLang = normalizeLanguageCode(
                                                        i18n.language
                                                    );

                                                    if (
                                                        !editableHeaders.hasOwnProperty(
                                                            normalizedKey
                                                        ) &&
                                                        !editableHeaders.hasOwnProperty(key)
                                                    ) {
                                                        // Check if translation exists in fieldTranslations first
                                                        const existingTranslation =
                                                            fieldTranslations[normalizedKey]?.[
                                                            `name_${currentLang}`
                                                            ] ||
                                                            fieldTranslations[key]?.[
                                                            `name_${currentLang}`
                                                            ] ||
                                                            getColumnTranslation(key);

                                                        setEditableHeaders((prev) => ({
                                                            ...prev,
                                                            [normalizedKey]: existingTranslation,
                                                            [key]: existingTranslation,
                                                        }));
                                                    }
                                                }}
                                                className="editable-header"
                                            />
                                        ) : (
                                            getColumnTranslation(key)
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {queryResults.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {columns.map((key, colIndex) => (
                                        <td
                                            key={`${rowIndex}-${colIndex}`}
                                            className="truncate"
                                            title={String(row[key])}
                                            style={{ textAlign: "left" }}
                                        >
                                            {String(row[key])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-results">
                        {isQueryLoading ? t("admin.loading_results") : t("admin.no_results")}
                    </div>
                )}
            </div>

            {/* Save Configuration button positioned at the bottom right */}
            <div className="save-section">
                <button
                    type="button"
                    className="btn btn-primary save-btn"
                    onClick={handleExport}
                    disabled={isSaving}
                >
                    <FiDownload size={16} /> {t("admin.save_configuration")}
                </button>
            </div>
        </div>
    );
}
