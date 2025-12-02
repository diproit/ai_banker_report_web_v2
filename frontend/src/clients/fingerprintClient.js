// Fingerprint authentication client
// Communicates with Java fingerprint service on port 8082

const FINGERPRINT_BASE_URL = process.env.REACT_APP_FINGERPRINT_SERVICE_URL || 'http://localhost:8082';

/**
 * Check fingerprint device/service status
 * @returns {Promise<Object>} Status object with deviceAvailable, message, etc.
 */
export const checkStatus = async () => {
    try {
        const response = await fetch(`${FINGERPRINT_BASE_URL}/api/fingerprint/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            deviceAvailable: !!(data.deviceAvailable ?? data.success ?? false),
            message: data.message || data.reason || 'Status retrieved',
            captureAppExists: data.captureAppExists,
            verificationAppExists: data.verificationAppExists,
            verificationServerPortOpen: data.verificationServerPortOpen,
        };
    } catch (error) {
        console.error('Fingerprint status check failed:', error);
        return {
            success: false,
            deviceAvailable: false,
            message: 'Fingerprint service not reachable',
            error: error.message,
        };
    }
};

/**
 * Verify fingerprint (capture and authenticate)
 * @returns {Promise<Object>} Verification result with success, userId, message
 */
export const verify = async () => {
    try {
        const response = await fetch(`${FINGERPRINT_BASE_URL}/api/fingerprint/verify`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Verification failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: data.success || false,
            userId: data.it_user_master_id || data.userId || '',
            message: data.message || 'Verification complete',
        };
    } catch (error) {
        console.error('Fingerprint verification failed:', error);
        return {
            success: false,
            userId: '',
            message: error.message || 'Verification failed',
            error: error.message,
        };
    }
};

export default {
    checkStatus,
    verify,
};
