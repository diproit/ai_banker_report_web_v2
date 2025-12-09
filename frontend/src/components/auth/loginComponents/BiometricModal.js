import React from 'react';
import { FaFingerprint } from 'react-icons/fa';

export default function BiometricModal({ show, isLoading }) {
    if (!show) return null;
    return (
        <div className="biometric-modal">
            <div className="biometric-content">
                <FaFingerprint className={`scanning-icon ${isLoading ? 'pulse' : ''}`} />
                <p>Scan your fingerprint</p>
                {isLoading && <div className="spinner"></div>}
            </div>
        </div>
    );
}
