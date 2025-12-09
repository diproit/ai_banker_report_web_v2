import { useState, useEffect } from "react";
import { post } from "../../../../clients/apiClient";
import { normalizeFieldName, extractAliasFromExpression } from "../utils/adminHelpers";

/**
 * Custom hook for managing admin report data fetching and state
 */
export const useAdminData = (reportId, i18n, normalizeLanguageCode) => {
    const [updatedJSON, setUpdatedJSON] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        baseQuery: "",
        originalQuery: "",
        report_name: "",
        heading: "",
        subHeading: "",
        footer: "",
        enableDateRange: false,
        isTransactionReport: false,
        includeFields: [],
        searchFields: [],
        sortFields: [],
        fieldAlignments: {},
    });
    const [exportFormats, setExportFormats] = useState({
        word: true,
        table: false,
        pdf: false,
    });
    const [filters, setFilters] = useState({
        transactionReport: false,
        enableDateRange: false,
    });
    const [queryResults, setQueryResults] = useState([]);
    const [queryColumns, setQueryColumns] = useState([]); // Store column order from backend
    const [editableHeaders, setEditableHeaders] = useState({});
    const [headingTranslations, setHeadingTranslations] = useState({});
    const [subHeadingTranslations, setSubHeadingTranslations] = useState({});
    const [fieldTranslations, setFieldTranslations] = useState({});
    const [footerTranslations, setFooterTranslations] = useState({});
    const [fieldAlignments, setFieldAlignments] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [modifiedQuery, setModifiedQuery] = useState("");

    // Fetch JRXML data
    useEffect(() => {
        const fetchJrxmlData = async () => {
            if (!reportId) return;

            setIsLoading(true);
            setError(null);
            setQueryResults([]);
            try {
                const result = await post('/report-structure/jrxml', { id: reportId });

                if (result.success && result.data) {
                    setUpdatedJSON(result.data);
                }
            } catch (err) {
                console.error("Error fetching JRXML data:", err);
                setError(err.message || 'Failed to fetch JRXML data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchJrxmlData();
    }, [reportId]);

    // Load updatedJSON into formData
    useEffect(() => {
        if (updatedJSON) {
            console.log("Loading updatedJSON:", updatedJSON);
            console.log(
                "select_fields sample:",
                updatedJSON.select_fields?.slice(0, 3)
            );

            const formDataToSet = {
                report_name: updatedJSON.report_name || "",
                baseQuery: updatedJSON.base_query || "",
                originalQuery: updatedJSON.base_query || "",
                heading: updatedJSON.headings?.main_heading?.placeholder || "",
                subHeading: updatedJSON.headings?.sub_heading?.placeholder || "",
                footer: updatedJSON.headings?.footer?.placeholder || "",
                enableDateRange: updatedJSON.enable_date_range || false,
                isTransactionReport: updatedJSON.is_transaction_report || false,
                includeFields: (updatedJSON.select_fields || []).map((field) => ({
                    name: field.name_en,
                    excluded: !field.isChecked,
                })),
                searchFields: (updatedJSON.search_fields || []).map((field) => ({
                    name: field.name_en,
                    excluded: !field.isChecked,
                })),
                sortFields: (updatedJSON.sort_fields || []).map((field) => ({
                    name: field.field,
                    order: field.direction,
                })),
                fieldAlignments: (updatedJSON.select_fields || []).reduce((acc, field) => {
                    // Extract the actual field name from expressions like "tt.pl_account_id AS pl_account_id"
                    const fieldName = field.name_en;
                    const alignment = field.alignment || 'left';
                    acc[fieldName] = alignment;
                    console.log(`📥 Loaded alignment for "${fieldName}": "${alignment}"`);
                    return acc;
                }, {}),
            };

            console.log("Setting formData:", {
                includeFieldsSample: formDataToSet.includeFields.slice(0, 3),
                searchFieldsSample: formDataToSet.searchFields.slice(0, 3),
                fieldAlignments: formDataToSet.fieldAlignments,
            });

            setFormData(formDataToSet);

            setFilters({
                transactionReport: updatedJSON.is_transaction_report || false,
                enableDateRange: updatedJSON.enable_date_range || false,
            });
        }
    }, [updatedJSON]);

    // Load translations when language changes
    useEffect(() => {
        const currentLang = normalizeLanguageCode(i18n.language);
        if (updatedJSON?.select_fields && currentLang !== "en") {
            const savedTranslations = {};
            updatedJSON.select_fields.forEach((field) => {
                const normalizedName = normalizeFieldName(field.name_en);
                const translationKey = `name_${currentLang}`;

                if (field.hasOwnProperty(translationKey)) {
                    savedTranslations[normalizedName] = field[translationKey];

                    const aliasName = extractAliasFromExpression(field.name_en);
                    if (aliasName !== field.name_en) {
                        savedTranslations[aliasName] = field[translationKey];
                    }
                }
            });
            setEditableHeaders(savedTranslations);
        } else {
            setEditableHeaders({});
        }
    }, [i18n.language, updatedJSON, normalizeLanguageCode]);

    // Load fieldTranslations into editableHeaders
    useEffect(() => {
        const currentLang = normalizeLanguageCode(i18n.language);
        if (Object.keys(fieldTranslations).length > 0 && currentLang !== "en") {
            setEditableHeaders((prev) => {
                const updatedHeaders = { ...prev };
                const translationKey = `name_${currentLang}`;

                Object.keys(fieldTranslations).forEach((normalizedName) => {
                    if (
                        fieldTranslations[normalizedName]?.hasOwnProperty(translationKey) &&
                        !updatedHeaders.hasOwnProperty(normalizedName)
                    ) {
                        updatedHeaders[normalizedName] =
                            fieldTranslations[normalizedName][translationKey];
                    }
                });

                return updatedHeaders;
            });
        }
    }, [fieldTranslations, i18n.language, normalizeLanguageCode]);

    // Load existing translations from updatedJSON
    useEffect(() => {
        if (updatedJSON?.headings) {
            const mainHeadingData = updatedJSON.headings.main_heading || {};
            const subHeadingData = updatedJSON.headings.sub_heading || {};
            const footerData = updatedJSON.headings.footer || {};

            setHeadingTranslations(mainHeadingData);
            setSubHeadingTranslations(subHeadingData);
            setFooterTranslations(footerData);

            const currentLang = normalizeLanguageCode(i18n.language);
            const currentHeading =
                mainHeadingData[`heading_${currentLang}`] ||
                mainHeadingData[`heading_en`] ||
                formData.heading;
            const currentSubHeading =
                subHeadingData[`subHeading_${currentLang}`] ||
                subHeadingData[`subHeading_en`] ||
                formData.subHeading;
            const currentFooter =
                footerData[`footer_${currentLang}`] ||
                footerData[`footer_en`] ||
                formData.footer;

            setFormData((prev) => ({
                ...prev,
                heading: currentHeading,
                subHeading: currentSubHeading,
                footer: currentFooter,
            }));
        }
    }, [updatedJSON, i18n.language, normalizeLanguageCode]);

    // Load existing field translations from updatedJSON
    useEffect(() => {
        if (updatedJSON?.select_fields) {
            const existingTranslations = {};

            updatedJSON.select_fields.forEach((field) => {
                const normalizedName = normalizeFieldName(field.name_en);

                const translations = {};
                Object.keys(field).forEach((key) => {
                    if (key.startsWith("name_") && key !== "name") {
                        translations[key] = field[key];
                    }
                });

                if (Object.keys(translations).length > 0) {
                    existingTranslations[normalizedName] = translations;
                }
            });

            setFieldTranslations(existingTranslations);
        }
    }, [updatedJSON]);

    return {
        updatedJSON,
        setUpdatedJSON,
        isLoading,
        setIsLoading,
        isQueryLoading,
        setIsQueryLoading,
        isSaving,
        setIsSaving,
        error,
        setError,
        formData,
        setFormData,
        exportFormats,
        setExportFormats,
        filters,
        setFilters,
        queryResults,
        setQueryResults,
        queryColumns,
        setQueryColumns,
        editableHeaders,
        setEditableHeaders,
        headingTranslations,
        setHeadingTranslations,
        subHeadingTranslations,
        setSubHeadingTranslations,
        fieldTranslations,
        setFieldTranslations,
        footerTranslations,
        setFooterTranslations,
        fieldAlignments,
        setFieldAlignments,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        modifiedQuery,
        setModifiedQuery,
    };
};
