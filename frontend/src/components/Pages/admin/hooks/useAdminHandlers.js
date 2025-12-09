import { toast } from "react-toastify";
import { post, put } from "../../../../clients/apiClient";
import {
    extractFieldMappings,
    extractAliasFromExpression,
    normalizeFieldName,
    normalizeLanguageCode,
    getCurrentLanguageButtonId,
} from "../utils/adminHelpers";

/**
 * Custom hook for admin business logic handlers
 */
export const useAdminHandlers = ({
    formData,
    setFormData,
    exportFormats,
    setExportFormats,
    filters,
    setFilters,
    setHasUnsavedChanges,
    setQueryResults,
    setQueryColumns,
    setIsLoading,
    setIsQueryLoading,
    setIsSaving,
    setError,
    headingTranslations,
    setHeadingTranslations,
    subHeadingTranslations,
    setSubHeadingTranslations,
    footerTranslations,
    setFooterTranslations,
    fieldTranslations,
    editableHeaders,
    updatedJSON,
    reportId,
    t,
    i18n,
}) => {
    const toggleIncludeField = (index) => {
        setFormData((prev) => {
            const updatedFields = [...prev.includeFields];
            updatedFields[index] = {
                ...updatedFields[index],
                excluded: !updatedFields[index].excluded,
            };

            const fieldMappings = extractFieldMappings(prev.originalQuery);

            const selectedFields = updatedFields
                .filter((field) => !field.excluded)
                .map((field) => {
                    return fieldMappings[field.name] || field.name;
                });

            const selectClause =
                selectedFields.length > 0
                    ? `SELECT\n  ${selectedFields.join(",\n  ")}`
                    : "SELECT *";

            const selectEndMatch = prev.originalQuery.match(
                /SELECT\s+([\s\S]+?)\s+FROM/i
            );
            let fromClause = "FROM your_table";

            if (selectEndMatch) {
                const fromStartIndex = prev.originalQuery
                    .toLowerCase()
                    .indexOf("from", selectEndMatch.index + selectEndMatch[0].length - 4);
                if (fromStartIndex !== -1) {
                    const remainingQuery = prev.originalQuery.substring(fromStartIndex);
                    const fromEndMatch = remainingQuery.match(
                        /^FROM\s+([\s\S]+?)(?=\s+WHERE|\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT\s|\s*$)/i
                    );
                    if (fromEndMatch && fromEndMatch[1]) {
                        fromClause = `FROM\n  ${fromEndMatch[1].trim()}`;
                    }
                }
            }

            const whereMatch = prev.originalQuery.match(
                /WHERE\s+.+?(?=ORDER BY|GROUP BY|LIMIT|$)/is
            );
            const whereClause = whereMatch ? whereMatch[0] : "";

            const orderByMatch = prev.originalQuery.match(
                /ORDER BY\s+.+?(?=LIMIT|$)/i
            );
            const orderByClause = orderByMatch ? orderByMatch[0] : "";

            const newQuery = [selectClause, fromClause, whereClause, orderByClause]
                .filter(Boolean)
                .join(" ");

            return {
                ...prev,
                includeFields: updatedFields,
                baseQuery: newQuery,
            };
        });
        setHasUnsavedChanges(true);
    };

    const toggleSearchField = (index) => {
        setFormData((prev) => {
            const updatedFields = [...prev.searchFields];
            updatedFields[index] = {
                ...updatedFields[index],
                excluded: !updatedFields[index].excluded,
            };

            return {
                ...prev,
                searchFields: updatedFields,
            };
        });
        setHasUnsavedChanges(true);
    };

    const getIncludeFieldsState = () => {
        const selectedCount = formData.includeFields.filter(
            (field) => !field.excluded
        ).length;
        const totalCount = formData.includeFields.length;

        if (selectedCount === 0) return "none";
        if (selectedCount === totalCount) return "all";
        return "partial";
    };

    const getSearchFieldsState = () => {
        const selectedCount = formData.searchFields.filter(
            (field) => !field.excluded
        ).length;
        const totalCount = formData.searchFields.length;

        if (selectedCount === 0) return "none";
        if (selectedCount === totalCount) return "all";
        return "partial";
    };

    const toggleAllIncludeFields = () => {
        const currentState = getIncludeFieldsState();
        const shouldSelectAll =
            currentState === "none" || currentState === "partial";

        setFormData((prev) => {
            const updatedFields = prev.includeFields.map((field) => ({
                ...field,
                excluded: !shouldSelectAll,
            }));

            const fieldMappings = extractFieldMappings(prev.originalQuery);

            const selectedFields = updatedFields
                .filter((field) => !field.excluded)
                .map((field) => {
                    return fieldMappings[field.name] || field.name;
                });

            const selectClause =
                selectedFields.length > 0
                    ? `SELECT\n  ${selectedFields.join(",\n  ")}`
                    : "SELECT *";

            const selectEndMatch = prev.originalQuery.match(
                /SELECT\s+([\s\S]+?)\s+FROM/i
            );
            let fromClause = "FROM your_table";

            if (selectEndMatch) {
                const fromStartIndex = prev.originalQuery
                    .toLowerCase()
                    .indexOf("from", selectEndMatch.index + selectEndMatch[0].length - 4);
                if (fromStartIndex !== -1) {
                    const remainingQuery = prev.originalQuery.substring(fromStartIndex);
                    const fromEndMatch = remainingQuery.match(
                        /^FROM\s+([\s\S]+?)(?=\s+WHERE|\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT\s|\s*$)/i
                    );
                    if (fromEndMatch && fromEndMatch[1]) {
                        fromClause = `FROM\n  ${fromEndMatch[1].trim()}`;
                    }
                }
            }

            const whereMatch = prev.originalQuery.match(
                /WHERE\s+.+?(?=ORDER BY|GROUP BY|LIMIT|$)/is
            );
            const whereClause = whereMatch ? whereMatch[0] : "";

            const orderByMatch = prev.originalQuery.match(
                /ORDER BY\s+.+?(?=LIMIT|$)/i
            );
            const orderByClause = orderByMatch ? orderByMatch[0] : "";

            const newQuery = [selectClause, fromClause, whereClause, orderByClause]
                .filter(Boolean)
                .join(" ");

            return {
                ...prev,
                includeFields: updatedFields,
                baseQuery: newQuery,
            };
        });
        setHasUnsavedChanges(true);
    };

    const toggleAllSearchFields = () => {
        const currentState = getSearchFieldsState();
        const shouldSelectAll =
            currentState === "none" || currentState === "partial";

        setFormData((prev) => ({
            ...prev,
            searchFields: prev.searchFields.map((field) => ({
                ...field,
                excluded: !shouldSelectAll,
            })),
        }));
        setHasUnsavedChanges(true);
    };

    const updateSortOrder = (index, order) => {
        setFormData((prev) => {
            const updatedSortFields = [...prev.sortFields];
            updatedSortFields[index].order = order;

            const fieldMappings = extractFieldMappings(prev.originalQuery);

            const selectedFields = prev.includeFields
                .filter((field) => !field.excluded)
                .map((field) => {
                    return fieldMappings[field.name] || field.name;
                });

            const selectClause =
                selectedFields.length > 0
                    ? `SELECT\n  ${selectedFields.join(",\n  ")}`
                    : "SELECT *";

            const selectEndMatch = prev.originalQuery.match(
                /SELECT\s+([\s\S]+?)\s+FROM/i
            );
            let fromClause = "FROM your_table";

            if (selectEndMatch) {
                const fromStartIndex = prev.originalQuery
                    .toLowerCase()
                    .indexOf("from", selectEndMatch.index + selectEndMatch[0].length - 4);
                if (fromStartIndex !== -1) {
                    const remainingQuery = prev.originalQuery.substring(fromStartIndex);
                    const fromEndMatch = remainingQuery.match(
                        /^FROM\s+([\s\S]+?)(?=\s+WHERE|\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT\s|\s*$)/i
                    );
                    if (fromEndMatch && fromEndMatch[1]) {
                        fromClause = `FROM\n  ${fromEndMatch[1].trim()}`;
                    }
                }
            }

            const whereMatch = prev.originalQuery.match(
                /WHERE\s+.+?(?=ORDER BY|GROUP BY|LIMIT|$)/is
            );
            const whereClause = whereMatch ? whereMatch[0] : "";

            const orderByClause =
                updatedSortFields.length > 0
                    ? `ORDER BY\n            ${updatedSortFields
                        .map((f) => `${f.name} ${f.order}`)
                        .join(",\n            ")}`
                    : "";

            const newQuery = [selectClause, fromClause, whereClause, orderByClause]
                .filter(Boolean)
                .join("\n");

            return {
                ...prev,
                sortFields: updatedSortFields,
                baseQuery: newQuery,
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleExportFormatChange = (format) => {
        setExportFormats((prev) => ({ ...prev, [format]: !prev[format] }));
    };

    const handleFilterChange = (key) => {
        setFilters((prev) => {
            const newValue = !prev[key];
            setFormData((prevData) => ({
                ...prevData,
                [key]: newValue,
            }));
            return { ...prev, [key]: newValue };
        });
        setHasUnsavedChanges(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const currentLang = normalizeLanguageCode(i18n.language);

        if (name === "heading") {
            setHeadingTranslations((prev) => ({
                ...prev,
                [`heading_${currentLang}`]: value,
            }));
        } else if (name === "subHeading") {
            setSubHeadingTranslations((prev) => ({
                ...prev,
                [`subHeading_${currentLang}`]: value,
            }));
        } else if (name === "footer") {
            setFooterTranslations((prev) => ({
                ...prev,
                [`footer_${currentLang}`]: value,
            }));
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setHasUnsavedChanges(true);
    };

    const handleRunQuery = async () => {
        setIsQueryLoading(true);
        setError(null);

        try {
            const currentQuery = document.querySelector(
                'pre[contenteditable="true"]'
            ).textContent;

            const cleanedQuery = currentQuery.trim().replace(/;+$/, "");

            const requestBody = {
                query: cleanedQuery,
                limit: 10,
            };

            const result = await post('/sql_executor/runQuery', requestBody);

            // Extract data and columns from backend response
            const data = Array.isArray(result.data) ? result.data : [result.data];
            const columns = result.columns || []; // Backend provides column order
            
            setQueryResults(data);
            setQueryColumns(columns); // Store column order from backend
        } catch (err) {
            console.error("Error running query:", err);
            setError(err.response?.data?.error || "Failed to run query. Please try again.");
            setQueryResults([]); // Clear previous results when error occurs
            setQueryColumns([]); // Clear columns too
            toast.error(err.response?.data?.error || "Failed to run query. Please try again.");
        } finally {
            setIsQueryLoading(false);
        }
    };

    const handleQueryEdit = () => {
        setHasUnsavedChanges(true);
    };

    const handleAlignmentChange = (fieldName, alignment) => {
        console.log(`🎯 Alignment changed for "${fieldName}": ${alignment}`);
        
        setFormData((prev) => {
            const updatedAlignments = {
                ...prev.fieldAlignments,
                [fieldName]: alignment,
            };
            
            console.log('Updated fieldAlignments:', updatedAlignments);
            
            return {
                ...prev,
                fieldAlignments: updatedAlignments,
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleExport = async () => {
        const hasExportOption =
            exportFormats.word || exportFormats.table || exportFormats.pdf;

        if (!hasExportOption) {
            toast.error(t("admin.select_export_option"));
            return;
        }

        setIsSaving(true);

        const currentEditedQuery = document.querySelector(
            'pre[contenteditable="true"]'
        ).textContent;

        const currentLangId = getCurrentLanguageButtonId(i18n.language);
        const currentLang = normalizeLanguageCode(i18n.language);
        const isNonEnglish = currentLang !== "en";

        const updatedHeadingTranslations = {
            ...headingTranslations,
            [`heading_${currentLang}`]: formData.heading,
        };

        const updatedSubHeadingTranslations = {
            ...subHeadingTranslations,
            [`subHeading_${currentLang}`]: formData.subHeading,
        };

        const updatedFooterTranslations = {
            ...footerTranslations,
            [`footer_${currentLang}`]: formData.footer,
        };

        const fieldMappings = extractFieldMappings(formData.originalQuery);

        const includeFieldsWithTranslations = formData.includeFields.map(
            (field) => {
                const normalizedName = normalizeFieldName(field.name);
                const fullExpression = fieldMappings[field.name] || field.name;
                const aliasName = extractAliasFromExpression(fullExpression);

                console.log(
                    "aliases name in the includeFieldsWithTranslations",
                    aliasName
                );

                // Get alignment for this field - need to find matching field in updatedJSON
                const matchingField = updatedJSON.select_fields?.find(
                    f => f.name_en === field.name || extractAliasFromExpression(f.name_en) === aliasName
                );
                const fieldAlignment = formData.fieldAlignments?.[matchingField?.name_en] || 
                                      matchingField?.alignment || 
                                      'left';

                const baseField = {
                    name_en: aliasName,
                    isRemovable: !field.excluded,
                    alignment: fieldAlignment,
                };

                console.log("baseField created:", baseField);
                console.log("normalizedName:", normalizedName);
                console.log("field.name:", field.name);
                console.log("aliasName:", aliasName);
                console.log("fieldTranslations:", fieldTranslations);
                console.log("editableHeaders:", editableHeaders);

                const existingTranslations = fieldTranslations[normalizedName] || {};
                console.log(
                    "existingTranslations for",
                    normalizedName,
                    ":",
                    existingTranslations
                );

                const currentTranslations = { ...existingTranslations };

                if (isNonEnglish) {
                    if (editableHeaders[normalizedName]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[normalizedName];
                        console.log(
                            "Found translation with normalizedName:",
                            editableHeaders[normalizedName]
                        );
                    }

                    if (editableHeaders[field.name]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[field.name];
                        console.log(
                            "Found translation with field.name:",
                            editableHeaders[field.name]
                        );
                    }

                    if (editableHeaders[aliasName]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[aliasName];
                        console.log(
                            "Found translation with aliasName:",
                            editableHeaders[aliasName]
                        );
                    }

                    Object.keys(editableHeaders).forEach((headerKey) => {
                        if (
                            headerKey === normalizedName ||
                            headerKey === field.name ||
                            headerKey === aliasName
                        ) {
                            currentTranslations[`name_${currentLang}`] =
                                editableHeaders[headerKey];
                            console.log(
                                `Found translation with key ${headerKey}:`,
                                editableHeaders[headerKey]
                            );
                        }
                    });
                }

                console.log(
                    "currentTranslations after merging for",
                    field.name,
                    ":",
                    currentTranslations
                );

                Object.keys(currentTranslations).forEach((translationKey) => {
                    if (
                        currentTranslations[translationKey] &&
                        translationKey !== "name_en"
                    ) {
                        baseField[translationKey] = currentTranslations[translationKey];
                    }
                });

                console.log("Final baseField with translations:", baseField);

                return baseField;
            }
        );

        console.log(
            "Final includeFieldsWithTranslations:",
            includeFieldsWithTranslations
        );

        console.log('💾 Saving alignment data:', formData.fieldAlignments);

        const updatedConfig = {
            ...updatedJSON,
            report_name: formData.report_name,
            base_query: currentEditedQuery || updatedJSON.base_query,
            headings: {
                main_heading: updatedHeadingTranslations,
                sub_heading: updatedSubHeadingTranslations,
                footer: updatedFooterTranslations,
            },
            select_fields: updatedJSON.select_fields.map((field) => {
                const normalizedName = normalizeFieldName(field.name_en);
                const fullExpression = fieldMappings[field.name_en] || field.name_en;

                // Get alignment from formData using the exact field.name_en key
                const fieldAlignment = formData.fieldAlignments?.[field.name_en] || field.alignment || 'left';

                console.log(`📋 Field: "${field.name_en}" → Alignment: "${fieldAlignment}"`);

                const baseField = {
                    ...field,
                    name_en: fullExpression,
                    isChecked: !formData.includeFields.find(
                        (f) => f.name === field.name_en
                    )?.excluded,
                    alignment: fieldAlignment, // Use the alignment from formData or fallback to existing
                };

                const existingTranslations = fieldTranslations[normalizedName] || {};
                const currentTranslations = { ...existingTranslations };

                if (isNonEnglish) {
                    if (editableHeaders[normalizedName]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[normalizedName];
                    }

                    if (editableHeaders[field.name_en]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[field.name_en];
                    }

                    const aliasFromExpression =
                        extractAliasFromExpression(fullExpression);
                    if (editableHeaders[aliasFromExpression]) {
                        currentTranslations[`name_${currentLang}`] =
                            editableHeaders[aliasFromExpression];
                    }

                    Object.keys(editableHeaders).forEach((headerKey) => {
                        if (
                            headerKey === normalizedName ||
                            headerKey === field.name_en ||
                            headerKey === aliasFromExpression
                        ) {
                            currentTranslations[`name_${currentLang}`] =
                                editableHeaders[headerKey];
                        }
                    });
                }

                Object.keys(fieldTranslations).forEach((translationField) => {
                    if (translationField === normalizedName) {
                        Object.keys(fieldTranslations[translationField] || {}).forEach(
                            (langKey) => {
                                if (fieldTranslations[translationField][langKey]) {
                                    currentTranslations[langKey] =
                                        fieldTranslations[translationField][langKey];
                                }
                            }
                        );
                    }
                });

                Object.keys(currentTranslations).forEach((translationKey) => {
                    if (currentTranslations[translationKey]) {
                        baseField[translationKey] = currentTranslations[translationKey];
                    }
                });

                return baseField;
            }),
            search_fields:
                updatedJSON.search_fields?.map((field) => ({
                    ...field,
                    isChecked: !formData.searchFields.find(
                        (f) => f.name === field.name_en
                    )?.excluded,
                })) || [],
            sort_fields: formData.sortFields
                .filter((field) => !field.excluded)
                .map((field) => ({
                    field: field.name,
                    direction: field.order,
                })),
        };

        const config = {
            languageId: currentLangId,
            reportName: formData.report_name,
            heading: updatedHeadingTranslations,
            subHeading: updatedSubHeadingTranslations,
            footer: updatedFooterTranslations,
            isTransactionReport: formData.isTransactionReport,
            enableDateRange: formData.enableDateRange,
            fields: {
                include: includeFieldsWithTranslations,
                search: formData.searchFields.map((field) => {
                    const fullExpression = fieldMappings[field.name] || field.name;
                    const aliasName = extractAliasFromExpression(fullExpression);

                    return {
                        name_en: aliasName,
                        isRemovable: !field.excluded,
                    };
                }),
                sort: formData.sortFields.map((field) => {
                    const fullExpression = fieldMappings[field.name] || field.name;
                    const aliasName = extractAliasFromExpression(fullExpression);

                    return {
                        field: aliasName,
                        direction: field.order,
                    };
                }),
            },
            exportOptions: {
                pdf: exportFormats.pdf,
                csv: exportFormats.table,
                doc: exportFormats.word,
            },
            baseQuery: updatedJSON.optimized_base_query,
            originalBaseQuery: updatedJSON.original_base_query,
            modifiedQuery: currentEditedQuery,
            it_institute_header: updatedJSON.it_institute_header,

        };

        const payload = {
            config,
            updatedConfig,
        };

        console.log("Final config.fields.include:", config.fields.include);
        console.log(
            "Complete payload being sent:",
            JSON.stringify(payload, null, 2)
        );

        try {
            const data = await put(`/report-structure/${reportId}/config`, payload);

            if (data.success) {
                toast.success("Configuration saved successfully!");
                setHasUnsavedChanges(false);
            } else {
                toast.error(`Failed to save configuration: ${data.message}`);
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            toast.error("An error occurred while saving the configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    return {
        toggleIncludeField,
        toggleSearchField,
        getIncludeFieldsState,
        getSearchFieldsState,
        toggleAllIncludeFields,
        toggleAllSearchFields,
        updateSortOrder,
        handleExportFormatChange,
        handleFilterChange,
        handleInputChange,
        handleRunQuery,
        handleQueryEdit,
        handleExport,
        handleAlignmentChange,
    };
};
