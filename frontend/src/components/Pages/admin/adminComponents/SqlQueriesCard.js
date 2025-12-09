import React from "react";

export default function SqlQueriesCard({
    t,
    formData,
    formatSQL,
    handleRunQuery,
    handleQueryEdit,
    isQueryLoading
}) {
    return (
        <div className="card sql-card">
            <div className="card-header header-with-action">
                <h3>{t("admin.sql_query")}</h3>
                <button
                    type="button"
                    className="btn run-btn header-run-btn"
                    onClick={handleRunQuery}
                    disabled={isQueryLoading}
                >
                    {isQueryLoading ? (
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
                            {t("admin.run_query_running")}
                        </>
                    ) : (
                        t("admin.run_query")
                    )}
                </button>
            </div>
            <div className="card-body">
                <div className="query-display-container">
                    {/* Original Query */}
                    <div
                        className="query-panel original-query"
                        style={{
                            resize: "both",
                            overflow: "auto",
                            minWidth: "400px",
                            minHeight: "200px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                        }}
                    >
                        <h4>{t("admin.original_query")}</h4>
                        <pre
                            style={{
                                margin: 0,
                                padding: "10px",
                                overflow: "auto",
                                height: "calc(100% - 40px)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {formatSQL(formData.originalQuery)}
                        </pre>
                    </div>

                    {/* Modified Query */}
                    <div
                        className="query-panel modified-query"
                        style={{
                            resize: "both",
                            overflow: "auto",
                            minWidth: "400px",
                            minHeight: "200px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                        }}
                    >
                        <div className="query-header">
                            <h4>{t("admin.modified_query")}</h4>
                        </div>
                        <pre
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onInput={handleQueryEdit}
                            style={{
                                outline: "none",
                                margin: 0,
                                padding: "10px",
                                overflow: "auto",
                                height: "calc(100% - 40px)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                background: "transparent",
                            }}
                        >
                            {formatSQL(formData.baseQuery)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
