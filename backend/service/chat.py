import re
import json
from datetime import datetime
from typing import List, Optional, Dict, Any, Generator
from sqlmodel import select
from config.config import Config
from config.database import get_session
from models.it_prompt_master import ItPromptMaster, PromptType
from models.it_language import ItLanguage
import logging
from .ai_providers import AIProviderFactory


class ChatService:
    def __init__(self):
        # Create config dictionary for AI provider
        ai_config = {
            'api_key': Config.GEMINI_API_KEY,  # For Gemini provider
            'model': Config.GEMINI_MODEL,      # For Gemini provider
            'url': Config.AI_CHAT_URL,         # For OpenAI provider
            'token': Config.AI_CHAT_TOKEN,     # For OpenAI provider
            'chat_model': Config.AI_CHAT_MODEL,# For OpenAI provider
            'system_prompt': Config.AI_SYSTEM_PROMPT
        }
        self.ai_provider = AIProviderFactory.create_provider(Config.AI_BACKEND, ai_config)
    

    def get_system_prompt(self, user_prompt: str = None) -> str:
        """
        Get system prompt from database with language adaptation
        """
        try:
            with get_session() as session:
                statement = select(ItPromptMaster.prompt).where(
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.system
                ).order_by(ItPromptMaster.sort_order.asc()).limit(1)
                
                result = session.exec(statement).first()
                base_prompt = result if result else Config.AI_SYSTEM_PROMPT
                
                # If user prompt is provided, you may add any custom logic here if needed
                return base_prompt
        except Exception as e:
            logging.error(f"Error fetching system prompt from database: {e}")
            # Return config fallback if database error occurs
            return Config.AI_SYSTEM_PROMPT
    

    def get_available_languages(self) -> List[str]:
        """
        Get available languages from database
        """
        try:
            with get_session() as session:
                statement = select(ItLanguage.display_name).where(
                    ItLanguage.is_active == True
                ).order_by(ItLanguage.id.asc())  # Order by ID to maintain insertion order
                
                results = session.exec(statement).all()
                return list(results)
        except Exception as e:
            logging.error(f"Error fetching available languages from database: {e}")
            return ["English"]  # Fallback to English only
    

    def get_english_prompt_texts(self) -> List[str]:
        """
        Get English prompt texts for language selection UI
        """
        try:
            with get_session() as session:
                statement = select(ItPromptMaster.prompt_text).where(
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.user,
                    ItPromptMaster.language_code == "english"
                ).order_by(ItPromptMaster.sort_order.asc())
                
                results = session.exec(statement).all()
                return list(results)
        except Exception as e:
            logging.error(f"Error fetching English prompt texts from database: {e}")
            return []


    def get_prompts_by_language(self, selected_language: str) -> List[Dict[str, Any]]:
        """
        Get prompts for specific language
        """
        try:
            # First get the language code from display name
            with get_session() as session:
                # Get language code from display name
                lang_statement = select(ItLanguage.language).where(
                    ItLanguage.display_name == selected_language,
                    ItLanguage.is_active == True
                )
                language_code = session.exec(lang_statement).first()
                
                if not language_code:
                    logging.warning(f"Language not found: {selected_language}")
                    return []
                
                statement = select(ItPromptMaster).where(
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.user,
                    ItPromptMaster.language_code == language_code
                ).order_by(ItPromptMaster.sort_order.asc())
                
                results = session.exec(statement).all()
                processed_prompts = []
                
                for prompt_data in results:
                    prompt_id = prompt_data.id
                    prompt_text = prompt_data.prompt_text
                    prompt = prompt_data.prompt
                    prompt_query = prompt_data.prompt_query
                    has_placeholders = prompt_data.has_placeholders
                    
                    # If prompt has placeholders and a query is provided, execute the query and replace placeholders
                    if has_placeholders and prompt_query and prompt_query.strip():
                        try:
                            from sqlmodel import text
                            # Use a separate session for dynamic query execution
                            with get_session() as query_session:
                                # Execute the prompt query to get dynamic values using text()
                                query_result = query_session.exec(text(prompt_query)).first()
                                
                                if query_result:
                                    # Handle SQLAlchemy Row object properly
                                    if hasattr(query_result, '_asdict'):
                                        # For SQLAlchemy Row objects, use _asdict()
                                        result_dict = query_result._asdict()
                                    elif hasattr(query_result, 'keys'):
                                        # Alternative method for Row objects
                                        result_dict = {key: query_result[key] for key in query_result.keys()}
                                    else:
                                        # Fallback for other types
                                        result_dict = dict(query_result) if hasattr(query_result, '__iter__') else {}
                                    
                                    # Replace placeholders with actual values from query result
                                    for column_name, value in result_dict.items():
                                        placeholder = "{" + column_name + "}"
                                        if placeholder in prompt:
                                            # Format numbers with commas for better readability
                                            if isinstance(value, (int, float)):
                                                formatted_value = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
                                                prompt = prompt.replace(placeholder, formatted_value)
                                            else:
                                                prompt = prompt.replace(placeholder, str(value) if value is not None else '')
                            
                        except Exception as query_error:
                            logging.error(f"Error executing prompt query: {query_error}")
                            logging.error(f"Query that failed: {prompt_query}")
                            # Keep original prompt if query fails
                            pass
                    
                    processed_prompts.append({
                        "id": prompt_id,
                        "prompt_text": prompt_text,
                        "prompt": prompt,
                        "has_placeholders": has_placeholders
                    })
                
                return processed_prompts
            
        except Exception as e:
            logging.error(f"Error fetching prompts for language {selected_language}: {e}")
            return []
    

    def get_prompt_placeholders(self, prompt_id: int) -> Optional[Dict[str, Any]]:
        """
        Get information about placeholders in a specific prompt for debugging/validation
        """
        try:
            with get_session() as session:
                statement = select(ItPromptMaster).where(
                    ItPromptMaster.id == prompt_id,
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.user
                )
                
                result = session.exec(statement).first()
                
                if not result:
                    return None
                
                prompt = result.prompt
                prompt_query = result.prompt_query
                
                # Find all placeholders in prompt and prompt_query
                prompt_placeholders = set(re.findall(r'\{(\w+)\}', prompt or ''))
                query_placeholders = set(re.findall(r'\{(\w+)\}', prompt_query or ''))
                
                return {
                    'prompt_id': prompt_id,
                    'prompt_placeholders': list(prompt_placeholders),
                    'query_placeholders': list(query_placeholders),
                    'all_placeholders': list(prompt_placeholders.union(query_placeholders)),
                    'has_placeholders_flag': result.has_placeholders,
                    'prompt_text': result.prompt_text
                }
            
        except Exception as e:
            logging.error(f"Error getting placeholders for prompt {prompt_id}: {e}")
            return None
    

    def get_prompt_for_ai(self, prompt_id: int, selected_language: str, form_data: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Get specific prompt by ID and prepare it for AI with placeholder replacement
        """
        try:
            with get_session() as session:
                statement = select(ItPromptMaster).where(
                    ItPromptMaster.id == prompt_id,
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.user
                )
                
                result = session.exec(statement).first()
                
                if not result:
                    return None
                
                prompt = result.prompt
                prompt_query = result.prompt_query
                has_placeholders = result.has_placeholders
                
                # Initialize form_data if None
                if form_data is None:
                    form_data = {}
                
                logging.info(f"Processing prompt_id={prompt_id} with form_data: {form_data}")
                
                # Step 1: Replace placeholders directly in the prompt with form_data values
                prompt_placeholders = set(re.findall(r'\{(\w+)\}', prompt or ''))
                logging.info(f"Found placeholders in prompt: {prompt_placeholders}")
                
                for placeholder_key in prompt_placeholders:
                    if placeholder_key in form_data:
                        placeholder_pattern = f'{{{placeholder_key}}}'
                        replacement_value = str(form_data[placeholder_key])
                        prompt = prompt.replace(placeholder_pattern, replacement_value)
                        logging.info(f"Replaced {placeholder_pattern} with {replacement_value} in prompt")
                
                # Step 2: Replace placeholders in prompt_query with form_data values
                if prompt_query:
                    query_placeholders = set(re.findall(r'\{(\w+)\}', prompt_query))
                    logging.info(f"Found placeholders in prompt_query: {query_placeholders}")
                    
                    for placeholder_key in query_placeholders:
                        if placeholder_key in form_data:
                            placeholder_pattern = f'{{{placeholder_key}}}'
                            replacement_value = str(form_data[placeholder_key])
                            prompt_query = prompt_query.replace(placeholder_pattern, replacement_value)
                            logging.info(f"Replaced {placeholder_pattern} with {replacement_value} in prompt_query")
                
                # Step 3: Execute the query and substitute database results into the prompt
                if has_placeholders and prompt_query and prompt_query.strip():
                    try:
                        logging.info(f"Executing prompt_query: {prompt_query}")
                        from sqlmodel import text
                        with get_session() as query_session:
                            # Execute raw SQL for dynamic queries using text()
                            query_result = query_session.exec(text(prompt_query)).first()
                            
                            if query_result:
                                logging.info(f"Query result: {query_result}")
                                logging.info(f"Query result type: {type(query_result)}")
                                
                                # Handle SQLAlchemy Row object properly
                                if hasattr(query_result, '_asdict'):
                                    # For SQLAlchemy Row objects, use _asdict()
                                    result_dict = query_result._asdict()
                                elif hasattr(query_result, 'keys'):
                                    # Alternative method for Row objects
                                    result_dict = {key: query_result[key] for key in query_result.keys()}
                                else:
                                    # Fallback for other types
                                    result_dict = dict(query_result) if hasattr(query_result, '__iter__') else {}
                                
                                logging.info(f"Result dict: {result_dict}")
                                
                                # Replace database column results in the prompt
                                for column_name, value in result_dict.items():
                                    placeholder_pattern = f'{{{column_name}}}'
                                    if placeholder_pattern in prompt:
                                        # Format numbers appropriately
                                        if isinstance(value, (int, float)):
                                            formatted_value = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
                                            prompt = prompt.replace(placeholder_pattern, formatted_value)
                                        else:
                                            prompt = prompt.replace(placeholder_pattern, str(value) if value is not None else '')
                                        logging.info(f"Replaced {placeholder_pattern} with database value: {value}")
                            else:
                                logging.warning("Query executed successfully but returned no results")
                                
                    except Exception as query_error:
                        logging.error(f"Error executing prompt query: {query_error}")
                        logging.error(f"Query that failed: {prompt_query}")
                        # Continue without query results
                        pass
                
                # Step 4: Final cleanup - replace any remaining form_data placeholders
                remaining_placeholders = set(re.findall(r'\{(\w+)\}', prompt or ''))
                for placeholder_key in remaining_placeholders:
                    if placeholder_key in form_data:
                        placeholder_pattern = f'{{{placeholder_key}}}'
                        replacement_value = str(form_data[placeholder_key])
                        prompt = prompt.replace(placeholder_pattern, replacement_value)
                        logging.info(f"Final cleanup: Replaced {placeholder_pattern} with {replacement_value}")
                
                logging.info(f"Final processed prompt: {prompt}")
                return prompt
            
        except Exception as e:
            logging.error(f"Error fetching prompt {prompt_id}: {e}")
            return None
    

    def get_system_prompt_with_language(self, selected_language: str) -> str:
        """
        Get system prompt with language replacement
        """
        try:
            with get_session() as session:
                statement = select(ItPromptMaster.prompt).where(
                    ItPromptMaster.is_active == True,
                    ItPromptMaster.prompt_type == PromptType.system
                ).order_by(ItPromptMaster.sort_order.asc()).limit(1)
                
                result = session.exec(statement).first()
                base_prompt = result if result else Config.AI_SYSTEM_PROMPT
                
                # Replace {language} placeholder with selected language
                if "{language}" in base_prompt:
                    base_prompt = base_prompt.replace("{language}", selected_language)
                
                return base_prompt
            
        except Exception as e:
            logging.error(f"Error fetching system prompt from database: {e}")
            # Return config fallback if database error occurs
            return Config.AI_SYSTEM_PROMPT
    

    def get_ai_response_for_quick_prompt(self, prompt_id: int, selected_language: str, form_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get AI response using configured provider with fallback logic
        
        Args:
            prompt_id: The ID of the prompt
            selected_language: The selected language
            form_data: Form data for placeholder replacement
            
        Returns:
            Dictionary containing AI response and metadata
        """
        ai_backend = Config.AI_BACKEND
        
        if form_data is None:
            form_data = {}
        
        # Get the system prompt with language
        system_prompt = self.get_system_prompt_with_language(selected_language)
        
        # Get the actual prompt content from database with form_data
        prompt = self.get_prompt_for_ai(prompt_id, selected_language, form_data)
        if not prompt:
            raise ValueError(f"Prompt with ID {prompt_id} not found")
        
        try:
            provider_config = self._get_provider_config(ai_backend)
            
            provider = AIProviderFactory.create_provider(ai_backend, provider_config)
            
            result = provider.send_request(prompt, system_prompt, None)  # No user_id needed
            
            # Add metadata
            result['provider_used'] = ai_backend
            result['timestamp'] = str(datetime.utcnow())
            result['prompt'] = prompt
            result['prompt_id'] = prompt_id
            result['selected_language'] = selected_language
            result['form_data'] = form_data
            
            return result
            
        except Exception as e:
            logging.error(f"Error getting AI response with provider {ai_backend}: {e}")
            
            # Fallback to alternative provider if primary fails
            fallback_result = self._try_fallback_provider(ai_backend, prompt, system_prompt)
            if fallback_result:
                fallback_result['prompt'] = prompt
                fallback_result['prompt_id'] = prompt_id
                fallback_result['selected_language'] = selected_language
                fallback_result['form_data'] = form_data
                return fallback_result
            
            # Final fallback - return error response
            return {
                "response": f"I apologize, but I'm currently unable to process your request. Please try again later. (Error: {str(e)})",
                "success": False,
                "provider_used": ai_backend,
                "prompt": prompt, 
                "error": str(e)
            }
    

    def get_ai_response_for_user_message(self, user_message: str, selected_language: str = "English") -> Dict[str, Any]:
        """
        Get AI response for a user-typed message (free-form input)
        
        Args:
            user_message: The user's message
            selected_language: The selected language
            
        Returns:
            Dictionary containing AI response and metadata
        """
        ai_backend = Config.AI_BACKEND
        # If not selected_language, fallback to default
        if not selected_language:
            selected_language = "English"
        # Get system prompt for the selected language
        system_prompt = self.get_system_prompt_with_language(selected_language)
        prompt = user_message
        try:
            provider_config = self._get_provider_config(ai_backend)
            provider = AIProviderFactory.create_provider(ai_backend, provider_config)
            result = provider.send_request(prompt, system_prompt, None)
            result['provider_used'] = ai_backend
            result['timestamp'] = str(datetime.utcnow())
            result['prompt'] = prompt
            result['selected_language'] = selected_language
            result['user_message'] = user_message
            return result
        except Exception as e:
            logging.error(f"Error getting AI response for user message with provider {ai_backend}: {e}")
            return {
                "response": f"I apologize, but I'm currently unable to process your request. Please try again later. (Error: {str(e)})",
                "success": False,
                "provider_used": ai_backend,
                "prompt": prompt,
                "error": str(e)
            }
    

    def get_ai_streaming_response(self, prompt_id, selected_language: str, form_data: Optional[Dict[str, Any]] = None) -> Generator[str, None, None]:
        """
        Get AI streaming response for either prompt_id or user-typed message (free-form input)
        
        Args:
            prompt_id: The prompt ID or dict containing user_message
            selected_language: The selected language
            form_data: Form data for placeholder replacement
            
        Yields:
            Server-sent event formatted strings
        """
        ai_backend = Config.AI_BACKEND
        if form_data is None:
            form_data = {}

        # Support both prompt_id and user_message
        user_message = None
        if isinstance(prompt_id, dict):
            # If called with a dict, extract user_message and selected_language
            user_message = prompt_id.get('user_message')
            selected_language = prompt_id.get('selected_language', selected_language)
            form_data = prompt_id.get('form_data', {})
            prompt_id = None

        system_prompt = self.get_system_prompt_with_language(selected_language)

        if user_message:
            prompt = user_message
            metadata = {
                "type": "metadata",
                "provider_used": ai_backend,
                "timestamp": str(datetime.utcnow()),
                "prompt_id": None,
                "selected_language": selected_language,
                "form_data": form_data,
                "user_message": user_message
            }
        else:
            prompt = self.get_prompt_for_ai(prompt_id, selected_language, form_data)
            metadata = {
                "type": "metadata",
                "provider_used": ai_backend,
                "timestamp": str(datetime.utcnow()),
                "prompt_id": prompt_id,
                "selected_language": selected_language,
                "form_data": form_data
            }

        if not prompt:
            error_data = {
                "type": "error",
                "error": f"Prompt not found"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            return

        try:
            provider_config = self._get_provider_config(ai_backend)
            provider = AIProviderFactory.create_provider(ai_backend, provider_config)
            yield f"data: {json.dumps(metadata)}\n\n"
            yield from provider.send_streaming_request(prompt, system_prompt, None)
        except Exception as e:
            logging.error(f"Error getting AI streaming response with provider {ai_backend}: {e}")
            error_data = {
                "type": "error",
                "error": f"I apologize, but I'm currently unable to process your request. Please try again later. (Error: {str(e)})",
                "provider_used": ai_backend
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    

    def _get_provider_config(self, provider_type: str) -> dict:
        """
        Get configuration for specified provider
        
        Args:
            provider_type: The type of AI provider
            
        Returns:
            Configuration dictionary for the provider
        """
        if provider_type == 'GenAI':
            return {
                'api_key': Config.GEMINI_API_KEY,
                'model': Config.GEMINI_MODEL
            }
        elif provider_type == 'OpenAI':
            return {
                'url': Config.AI_CHAT_URL,
                'token': Config.AI_CHAT_TOKEN,
                'model': Config.AI_CHAT_MODEL
            }
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
    
    
    def _try_fallback_provider(self, primary_provider: str, prompt: str, system_prompt: str) -> Optional[Dict[str, Any]]:
        """
        Try fallback provider if primary fails
        
        Args:
            primary_provider: The primary provider that failed
            prompt: The prompt to send
            system_prompt: The system prompt
            
        Returns:
            Response dictionary or None if fallback also fails
        """
        try:
            # Determine fallback provider
            fallback_provider = 'OpenAI' if primary_provider == 'GenAI' else 'GenAI'
            
            logging.info(f"Trying fallback provider: {fallback_provider}")
            
            # Get fallback configuration
            fallback_config = self._get_provider_config(fallback_provider)
            
            # Create fallback provider
            provider = AIProviderFactory.create_provider(fallback_provider, fallback_config)
            
            # Check if fallback is available
            if not provider.is_available():
                return None
            
            # Get response from fallback (system_prompt already contains language-specific instructions)
            result = provider.send_request(prompt, system_prompt, None)  # No user_id needed
            result['provider_used'] = f"{primary_provider} -> {fallback_provider} (fallback)"
            result['fallback'] = True
            
            return result
            
        except Exception as e:
            logging.error(f"Fallback provider also failed: {e}")
            return None

    def translate_text(self, text: str, targets: List[str]) -> Dict[str, Any]:
        """
        Translate the provided English text into a list of target languages using the configured AI provider.

        Args:
            text: Source text (assumed English)
            targets: List of target language display names (e.g., ['Sinhala','Tamil'])

        Returns:
            dict: { 'success': bool, 'translations': { lang: { 'translation': str, 'success': bool, 'provider': str } } }
        """
        try:
            ai_backend = Config.AI_BACKEND
            system_prompt = self.get_system_prompt() or Config.AI_SYSTEM_PROMPT

            provider_config = self._get_provider_config(ai_backend)
            provider = AIProviderFactory.create_provider(ai_backend, provider_config)

            translations: Dict[str, Any] = {}

            for lang in targets:
                # Build a clear translation prompt for the provider
                prompt = (
                    f"Translate the following English text into {lang}. "
                    "Return only the translated text without any extra explanation or formatting.\n\n"
                    f"Text: {text}"
                )

                resp = provider.send_request(prompt, system_prompt)
                # resp may be dict with 'response' key
                translated_text = ''
                success_flag = False
                provider_name = ai_backend

                if isinstance(resp, dict):
                    translated_text = resp.get('response') or ''
                    success_flag = bool(resp.get('success', False))
                    provider_name = resp.get('provider', ai_backend)
                else:
                    translated_text = str(resp)
                    success_flag = True

                translations[lang] = {
                    'translation': translated_text,
                    'success': success_flag,
                    'provider': provider_name
                }

            return {'success': True, 'translations': translations}
        except Exception as e:
            logging.error(f"Error translating text: {e}")
            return {'success': False, 'error': str(e)}