import React from 'react';
import { FaFingerprint } from 'react-icons/fa';

export default function BiometricAuthButton({
    isLoading,
    isAvailable,
    status,
    onClick
}) {
    return (
        <div
            className={`biometric-auth ${isLoading ? 'loading' : ''}`}
            onClick={!isLoading && isAvailable ? onClick : undefined}
            title={!isAvailable ? (status || 'Fingerprint device not available') : undefined}
            style={!isAvailable ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
        >
            <FaFingerprint className="fingerprint-icon" />
            <span>
                {isLoading
                    ? 'Authenticating...'
                    : isAvailable
                        ? 'Sign in with fingerprint'
                        : 'Fingerprint not available'}
            </span>
            {isLoading && <div className="spinner small"></div>}
        </div>
    );
}
