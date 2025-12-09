import requests
import logging
import json
import time
from typing import Dict, Any, Optional, Generator
from .base_provider import BaseAIProvider

class GeminiProvider(BaseAIProvider):
    """Google Gemini AI Provider"""
    
    def validate_config(self) -> None:
        required_keys = ['api_key', 'model']
        for key in required_keys:
            if not self.config.get(key):
                raise ValueError(f"Missing required Gemini config: {key}")
    
    def is_available(self) -> bool:
        return bool(self.config.get('api_key'))
    
    def send_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_available():
            return self.get_mock_response(prompt, user_id)
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.config['model']}:generateContent"
        
        headers = {
            "x-goog-api-key": self.config['api_key'],
            "Content-Type": "application/json"
        }
        
        # Combine system and user prompts for Gemini
        combined_prompt = f"{system_prompt}\n\nUser: {prompt}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": combined_prompt
                        }
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(
                url, 
                json=payload, 
                headers=headers, 
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract response according to Gemini's format
            if "candidates" in result and len(result["candidates"]) > 0:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        return {
                            "response": parts[0]["text"],
                            "success": True,
                            "provider": "gemini",
                            "usage": result.get("usageMetadata", {})
                        }
            
            return {
                "response": "No valid response from Gemini API",
                "success": False,
                "provider": "gemini"
            }
            
        except requests.exceptions.Timeout:
            logging.error("Gemini API request timed out")
            return self.get_mock_response(prompt, user_id)
        except requests.exceptions.RequestException as e:
            logging.error(f"Gemini API request failed: {e}")
            return self.get_mock_response(prompt, user_id)
        except Exception as e:
            logging.error(f"Unexpected error with Gemini API: {e}")
            return {
                "response": f"Error: {str(e)}",
                "success": False,
                "provider": "gemini"
            }

    def send_streaming_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Generator[str, None, None]:
        if not self.is_available():
            yield from self.get_mock_streaming_response(prompt, user_id)
            return
        
        # Note: Gemini API doesn't have a direct streaming endpoint like OpenAI
        # We'll simulate streaming by making a regular request and chunking the response
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.config['model']}:generateContent"
        
        headers = {
            "x-goog-api-key": self.config['api_key'],
            "Content-Type": "application/json"
        }
        
        # Combine system and user prompts for Gemini
        combined_prompt = f"{system_prompt}\n\nUser: {prompt}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": combined_prompt
                        }
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(
                url, 
                json=payload, 
                headers=headers, 
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract response according to Gemini's format
            if "candidates" in result and len(result["candidates"]) > 0:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        full_text = parts[0]["text"]
                        
                        # Simulate streaming by sending chunks of text
                        words = full_text.split()
                        chunk_size = 3  # Send 3 words at a time
                        
                        for i in range(0, len(words), chunk_size):
                            chunk_words = words[i:i + chunk_size]
                            chunk_text = " ".join(chunk_words)
                            if i + chunk_size < len(words):
                                chunk_text += " "  # Add space if not last chunk
                            
                            chunk_data = {
                                "type": "content",
                                "content": chunk_text,
                                "provider": "gemini"
                            }
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                            
                            # Small delay to simulate real streaming
                            import time
                            time.sleep(0.1)
            
            # Send completion signal
            completion_data = {
                "type": "done",
                "success": True,
                "provider": "gemini"
            }
            yield f"data: {json.dumps(completion_data)}\n\n"
            
        except requests.exceptions.Timeout:
            logging.error("Gemini streaming API request timed out")
            yield from self.get_mock_streaming_response(prompt, user_id)
        except requests.exceptions.RequestException as e:
            logging.error(f"Gemini streaming API request failed: {e}")
            error_data = {
                "type": "error",
                "error": f"Request failed: {str(e)}",
                "provider": "gemini"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        except Exception as e:
            logging.error(f"Unexpected error with Gemini streaming API: {e}")
            error_data = {
                "type": "error",
                "error": f"Unexpected error: {str(e)}",
                "provider": "gemini"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
