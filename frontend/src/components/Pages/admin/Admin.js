import React from "react";
import "react-toastify/dist/ReactToastify.css";
import "../../css/Admin.css";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReportCard from "./adminComponents/ReportCard";
import SqlQueriesCard from "./adminComponents/SqlQueriesCard";
import FiltersSortCard from "./adminComponents/FiltersSortCard";
import QueryResultsSection from "./adminComponents/QueryResultsSection";
import { useAdminData } from "./hooks/useAdminData";
import { useAdminHandlers } from "./hooks/useAdminHandlers";
import {
    normalizeLanguageCode,
    normalizeFieldName,
    formatSQL,
    getColumnTranslation,
    getCurrentHeading,
    getCurrentSubHeading,
    getCurrentFooter,
} from "./utils/adminHelpers";

export default function Admin() {
    const { t, i18n } = useTranslation();
    const { reportId } = useParams();

    // Use custom hooks for data and handlers
    const adminData = useAdminData(reportId, i18n, normalizeLanguageCode);

    const handlers = useAdminHandlers({
        ...adminData,
        reportId,
        t,
        i18n,
    });

    // Destructure all needed values from adminData
    const {
        updatedJSON,
        isLoading,
        isQueryLoading,
        isSaving,
        error,
        formData,
        exportFormats,
        queryResults,
        queryColumns,
        editableHeaders,
        headingTranslations,
        subHeadingTranslations,
        footerTranslations,
        fieldTranslations,
        fieldAlignments,
        setEditableHeaders,
        setFieldTranslations,
    } = adminData;

    // Helper functions that use current data
    const currentHeading = getCurrentHeading(headingTranslations, i18n.language, formData.heading);
    const currentSubHeading = getCurrentSubHeading(subHeadingTranslations, i18n.language, formData.subHeading);
    const currentFooter = getCurrentFooter(footerTranslations, i18n.language, formData.footer);

    if (isLoading && !updatedJSON) {
        return <div className="loading">{t("admin.loading_report")}</div>;
    }

    if (error && !updatedJSON) {
        return (
            <div className="error">
                {t("common.error_title")}: {error}
            </div>
        );
    }

    if (!updatedJSON) {
        return <div className="no-data">{t("admin.no_report_data")}</div>;
    }

    return (
        <div className="admin-container">
            <div className="content-header">
                <h1>{t("admin.title")}</h1>
            </div>

            <div className="form-container">
                {/* 4-Column Grid Layout */}
                <div className="grid-layout">
                    {/* Report Card with horizontal inputs */}
                    <ReportCard
                        t={t}
                        i18n={i18n}
                        formData={formData}
                        getCurrentHeading={() => currentHeading}
                        getCurrentSubHeading={() => currentSubHeading}
                        getCurrentFooter={() => currentFooter}
                        handleInputChange={handlers.handleInputChange}
                        normalizeLanguageCode={normalizeLanguageCode}
                    />

                    {/* SQL Queries Card */}
                    <SqlQueriesCard
                        t={t}
                        formData={formData}
                        formatSQL={formatSQL}
                        handleRunQuery={handlers.handleRunQuery}
                        handleQueryEdit={handlers.handleQueryEdit}
                        isQueryLoading={isQueryLoading}
                    />

                    {/* Combined Filters and Sort Card */}
                    <FiltersSortCard
                        t={t}
                        formData={formData}
                        exportFormats={exportFormats}
                        selectFields={updatedJSON?.select_fields || []}
                        fieldAlignments={formData.fieldAlignments}
                        handleFilterChange={handlers.handleFilterChange}
                        handleExportFormatChange={handlers.handleExportFormatChange}
                        handleAlignmentChange={handlers.handleAlignmentChange}
                        getIncludeFieldsState={handlers.getIncludeFieldsState}
                        toggleAllIncludeFields={handlers.toggleAllIncludeFields}
                        toggleIncludeField={handlers.toggleIncludeField}
                        getSearchFieldsState={handlers.getSearchFieldsState}
                        toggleAllSearchFields={handlers.toggleAllSearchFields}
                        toggleSearchField={handlers.toggleSearchField}
                        updateSortOrder={handlers.updateSortOrder}
                    />
                </div>

                {/* Query Results Section */}
                <QueryResultsSection
                    t={t}
                    i18n={i18n}
                    error={error}
                    isQueryLoading={isQueryLoading}
                    isSaving={isSaving}
                    queryResults={queryResults}
                    queryColumns={queryColumns}
                    editableHeaders={editableHeaders}
                    fieldTranslations={fieldTranslations}
                    normalizeFieldName={normalizeFieldName}
                    normalizeLanguageCode={normalizeLanguageCode}
                    getColumnTranslation={(columnName) => getColumnTranslation(columnName, t)}
                    setEditableHeaders={setEditableHeaders}
                    setFieldTranslations={setFieldTranslations}
                    handleExport={handlers.handleExport}
                />
            </div>
        </div>
    );
}
