/**
 * Helper utility functions for Admin component
 */

/**
 * Format field name for display - extracts alias or removes table prefix
 * @param {string} fieldName - Full field name (e.g., "tt.pl_account_id AS pl_account_id")
 * @returns {string} - Formatted name (e.g., "pl_account_id")
 */
export const formatFieldDisplayName = (fieldName) => {
    if (!fieldName) return '';
    
    // Extract alias if exists
    // Handles: AS "Customer Number", AS 'Customer Number', AS Customer_Number
    const aliasMatch = fieldName.match(/AS\s+["']?([^"']+?)["']?$/i);
    if (aliasMatch) {
        return aliasMatch[1].trim();
    }
    
    // Remove table prefix (e.g., "tt.pl_account_id" → "pl_account_id")
    return fieldName.replace(/^\w+\./, '');
};

/**
 * Remove table prefix if exists (e.g., 'pl_account.ci_customer_id' -> 'ci_customer_id')
 */
export const normalizeFieldName = (fieldName) => {
    return fieldName.includes(".") ? fieldName.split(".")[1] : fieldName;
};

/**
 * Normalize language code (remove region suffix like -US, -GB)
 * This will convert "en-US" to "en", "si-LK" to "si", etc.
 */
export const normalizeLanguageCode = (langCode) => {
    return langCode.split("-")[0];
};

/**
 * Extract field mappings from SELECT clause
 */
export const extractFieldMappings = (query) => {
    const selectMatch = query.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
    if (!selectMatch) return {};

    const selectClause = selectMatch[1];
    const fieldMappings = {};

    // Split by comma but handle nested functions and expressions
    const fields = selectClause.split(/,(?![^()]*\))/);

    fields.forEach((field) => {
        const trimmedField = field.trim();
        // Match pattern: "expression AS alias" or just "field_name"
        // Handles quoted aliases: AS "Customer Number", AS 'Customer Number'
        const asMatch = trimmedField.match(/^(.+)\s+AS\s+["']?([^"']+?)["']?$/i);
        if (asMatch) {
            const alias = asMatch[2].trim();
            fieldMappings[alias] = trimmedField;
        } else {
            // If no AS clause, use the field name as both key and value
            const fieldName = trimmedField.replace(/^\w+\./g, ""); // Remove table prefix if any
            fieldMappings[fieldName] = trimmedField;
        }
    });

    return fieldMappings;
};

/**
 * Helper function to extract alias from field expression
 * Match pattern: "expression AS alias"
 */
export const extractAliasFromExpression = (expression) => {
    // Handles: AS "Customer Number", AS 'Customer Number', AS Customer_Number
    const asMatch = expression.match(/\s+AS\s+["']?([^"']+?)["']?$/i);
    if (asMatch) {
        return asMatch[1].trim(); // Return the alias part (e.g., "Customer Number")
    }

    // If no AS clause, return the original expression (e.g., "tt.amount")
    return expression;
};

/**
 * Format SQL query with proper indentation
 */
export const formatSQL = (sql) => {
    if (!sql) return "";

    let formatted = sql
        .replace(
            /\b(SELECT|FROM|WHERE|AND|OR|INNER JOIN|LEFT JOIN|RIGHT JOIN|JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET)\b/gi,
            "\n$1\n"
        )
        .replace(/\n\s*\n/g, "\n")
        .replace(/,/g, ",\n    ");

    let indentLevel = 0;
    const lines = formatted.split("\n");

    return lines
        .map((line) => {
            line = line.trim();
            if (!line) return "";

            if (
                line.match(
                    /^(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN)/i
                )
            ) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            const indentedLine = "  ".repeat(indentLevel) + line;

            if (
                line.match(
                    /^(SELECT|FROM|WHERE|AND|OR|JOIN|GROUP BY|ORDER BY|HAVING)/i
                )
            ) {
                indentLevel++;
            }

            return indentedLine;
        })
        .filter((line) => line.trim() !== "")
        .join("\n");
};

/**
 * Get current language button ID
 */
export const getCurrentLanguageButtonId = (language) => {
    return `lang-${normalizeLanguageCode(language)}`;
};

/**
 * Get column translation with fallback to formatted column name
 */
export const getColumnTranslation = (columnName, t) => {
    // Common transformations
    const formatted = columnName
        .toLowerCase()
        .replace(/_/g, " ") // Replace underscores with spaces
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    // Try to get translation, fall back to formatted column name
    return t(`table.columns.${columnName}`, { defaultValue: formatted });
};

/**
 * Get current heading for language
 */
export const getCurrentHeading = (headingTranslations, language, formDataHeading) => {
    const currentLang = normalizeLanguageCode(language);
    return (
        headingTranslations[`heading_${currentLang}`] ||
        headingTranslations[`heading_en`] ||
        formDataHeading
    );
};

/**
 * Get current sub-heading for language
 */
export const getCurrentSubHeading = (subHeadingTranslations, language, formDataSubHeading) => {
    const currentLang = normalizeLanguageCode(language);
    return (
        subHeadingTranslations[`subHeading_${currentLang}`] ||
        subHeadingTranslations[`subHeading_en`] ||
        formDataSubHeading
    );
};

/**
 * Get current footer for language
 */
export const getCurrentFooter = (footerTranslations, language, formDataFooter) => {
    const currentLang = normalizeLanguageCode(language);
    return (
        footerTranslations[`footer_${currentLang}`] ||
        footerTranslations[`footer_en`] ||
        formDataFooter
    );
};