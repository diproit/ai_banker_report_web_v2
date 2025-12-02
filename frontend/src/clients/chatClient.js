// Chat API client
// Helpers for standard and streaming chat requests

import { post, streamPost } from './apiClient';

/**
 * Send chat request (non-streaming) to the server.
 * Accepts either a quick-prompt payload or a user message payload.
 * @param {Object} payload
 * @param {number} [payload.prompt_id]
 * @param {string} [payload.user_message]
 * @param {string} payload.selected_language
 * @param {Object} [payload.form_data]
 * @returns {Promise<any>} Response data (full result)
 */
export function send(payload) {
    return post('/chat/send', payload);
}

/**
 * Send chat request with streaming response.
 * Emits chunks via onChunk callback and returns controls { abort, done }.
 * @param {Object} payload See send() payload
 * @param {(chunk: string) => void} onChunk Called for each streamed chunk
 * @returns {{ abort: () => void, done: Promise<void> }} Stream controls
 */
export function sendStream(payload, onChunk) {
    return streamPost('/chat/send-stream', payload, onChunk);
}

export default {
    send,
    sendStream,
};
