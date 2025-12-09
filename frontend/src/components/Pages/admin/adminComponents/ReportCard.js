import React from "react";

export default function ReportCard({
    t,
    i18n,
    formData,
    getCurrentHeading,
    getCurrentSubHeading,
    getCurrentFooter,
    handleInputChange,
    normalizeLanguageCode
}) {
    return (
        <div className="card reports-card">
            <div className="card-header">
                <h3>{t("admin.report")}</h3>
            </div>
            <div className="card-body">
                {/* Horizontal inputs container */}
                <div className="report-inputs-container">
                    {/* Report Name */}
                    <div className="report-input-item">
                        <div className="form-group">
                            <label>{t("admin.report_name")}</label>
                            <input
                                type="text"
                                name="report_name"
                                className="form-control"
                                placeholder="Enter Report Name"
                                value={formData.report_name}
                                disabled
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="report-input-item">
                        <div className="form-group">
                            <label>
                                {t("admin.heading")} (
                                {normalizeLanguageCode(i18n.language).toUpperCase()})
                            </label>
                            <input
                                type="text"
                                name="heading"
                                className="form-control"
                                placeholder="Enter Report Heading"
                                value={getCurrentHeading()}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* Sub-heading */}
                    <div className="report-input-item">
                        <div className="form-group">
                            <label>
                                {t("admin.sub_heading")} (
                                {normalizeLanguageCode(i18n.language).toUpperCase()})
                            </label>
                            <input
                                type="text"
                                name="subHeading"
                                className="form-control"
                                placeholder="Enter Report Sub Heading"
                                value={getCurrentSubHeading()}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="report-input-item">
                        <div className="form-group">
                            <label>
                                {t("admin.footer")} (
                                {normalizeLanguageCode(i18n.language).toUpperCase()})
                            </label>
                            <textarea
                                name="footer"
                                className="form-control footer-textarea"
                                placeholder="Enter Report Footer"
                                value={getCurrentFooter()}
                                onChange={handleInputChange}
                                rows="1"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
