from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from service.chat import ChatService
import logging


chat_bp = Blueprint('chat', __name__)
chat_service = ChatService()

@chat_bp.route('/languages', methods=['GET'])
@jwt_required()
def available_languages():
    """Get available languages and English prompt texts for language selection"""
    try:
        languages = chat_service.get_available_languages()
        english_prompts = chat_service.get_english_prompt_texts()
        
        return jsonify({
            'available_languages': languages,
            'english_prompt_texts': english_prompts
        })
    except Exception as e:
        logging.error(f"Error getting available languages: {e}")
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/quick-prompts/<language>', methods=['GET'])
@jwt_required()
def quick_prompts_by_language(language):
    """Get quick prompts for a specific language"""
    try:
        prompts = chat_service.get_prompts_by_language(language)
        
        return jsonify({
            'language': language,
            'prompts': prompts
        })
    except Exception as e:
        logging.error(f"Error getting prompts for language {language}: {e}")
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/prompt-placeholders/<int:prompt_id>', methods=['GET'])
@jwt_required()
def prompt_placeholders(prompt_id):
    """Get placeholder information for a specific prompt"""
    try:
        placeholder_info = chat_service.get_prompt_placeholders(prompt_id)
        
        if not placeholder_info:
            return jsonify({'error': 'Prompt not found'}), 404
            
        return jsonify(placeholder_info)
    except Exception as e:
        logging.error(f"Error getting placeholders for prompt {prompt_id}: {e}")
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/send', methods=['POST'])
@jwt_required()
def send_chat():
    data = request.json
    prompt_id = data.get('prompt_id')
    user_message = data.get('user_message')
    selected_language = data.get('selected_language')
    form_data = data.get('form_data', {})

    if not selected_language:
        return jsonify({'error': 'selected_language is required'}), 400

    # Must have either prompt_id or user_message
    if not prompt_id and not user_message:
        return jsonify({'error': 'Either prompt_id or user_message is required'}), 400

    try:
        if user_message:
            result = chat_service.get_ai_response_for_user_message(user_message, selected_language)
        else:
            result = chat_service.get_ai_response_for_quick_prompt(prompt_id, selected_language, form_data)
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error in chat send: {e}")
        return jsonify({'error': str(e)}), 500
    

@chat_bp.route('/send-stream', methods=['POST'])
@jwt_required()
def send_chat_stream():
    """Send chat with streaming response"""
    data = request.json
    prompt_id = data.get('prompt_id')
    user_message = data.get('user_message')
    selected_language = data.get('selected_language')
    form_data = data.get('form_data', {})

    if not selected_language:
        return jsonify({'error': 'selected_language is required'}), 400

    # Must have either prompt_id or user_message
    if not prompt_id and not user_message:
        return jsonify({'error': 'Either prompt_id or user_message is required'}), 400

    try:
        def generate():
            if user_message:
                # Pass as dict to support streaming for user-typed message
                yield from chat_service.get_ai_streaming_response({
                    'user_message': user_message,
                    'selected_language': selected_language,
                    'form_data': form_data
                }, selected_language, form_data)
            else:
                yield from chat_service.get_ai_streaming_response(prompt_id, selected_language, form_data)

        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            }
        )
    except Exception as e:
        logging.error(f"Error in chat stream: {e}")
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/translate', methods=['POST', 'OPTIONS'])
def translate_text():
    """Translate a given text into multiple target languages using AI provider

    Accepts POST with JSON { text: string, targets: ["Sinhala","Tamil",...] }
    """
    if request.method == 'OPTIONS':
        return (jsonify({'status': 'ok'}), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        })

    try:
        data = request.json or {}
        text = data.get('text')
        targets = data.get('targets', [])

        if not text:
            return jsonify({'error': 'text is required'}), 400
        if not targets or not isinstance(targets, list):
            return jsonify({'error': 'targets must be a list of language names'}), 400

        result = chat_service.translate_text(text, targets)
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error in translate_text: {e}")
        return jsonify({'error': str(e)}), 500