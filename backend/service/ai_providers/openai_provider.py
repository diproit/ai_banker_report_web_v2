import requests
import logging
import json
from typing import Dict, Any, Optional, Generator
from .base_provider import BaseAIProvider

class OpenAIProvider(BaseAIProvider):
    """OpenAI-compatible API Provider"""
    
    def validate_config(self) -> None:
        required_keys = ['url', 'model']
        for key in required_keys:
            if not self.config.get(key):
                raise ValueError(f"Missing required OpenAI config: {key}")
    
    def is_available(self) -> bool:
        return bool(self.config.get('url'))
    
    def send_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_available():
            return self.get_mock_response(prompt, user_id)
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Add authorization header if token is provided
        if self.config.get('token'):
            headers["Authorization"] = f"Bearer {self.config['token']}"
        
        payload = {
            "model": self.config['model'],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        }
        
        # Add user_id if provided
        if user_id:
            payload["user"] = str(user_id)
        
        try:
            response = requests.post(
                self.config['url'], 
                json=payload, 
                headers=headers, 
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract response - handle both OpenAI format and custom formats
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                return {
                    "response": content,
                    "success": True,
                    "provider": "openai",
                    "usage": result.get("usage", {})
                }
            elif "response" in result:  # Custom format fallback
                return {
                    "response": result["response"],
                    "success": True,
                    "provider": "openai"
                }
            
            return {
                "response": "No valid response from OpenAI API",
                "success": False,
                "provider": "openai"
            }
            
        except requests.exceptions.Timeout:
            logging.error("OpenAI API request timed out")
            return self.get_mock_response(prompt, user_id)
        except requests.exceptions.RequestException as e:
            logging.error(f"OpenAI API request failed: {e}")
            return self.get_mock_response(prompt, user_id)
        except Exception as e:
            logging.error(f"Unexpected error with OpenAI API: {e}")
            return {
                "response": f"Error: {str(e)}",
                "success": False,
                "provider": "openai"
            }

    def send_streaming_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Generator[str, None, None]:
        if not self.is_available():
            yield from self.get_mock_streaming_response(prompt, user_id)
            return
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Add authorization header if token is provided
        if self.config.get('token'):
            headers["Authorization"] = f"Bearer {self.config['token']}"
        
        payload = {
            "model": self.config['model'],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        
        # Add user_id if provided
        if user_id:
            payload["user"] = str(user_id)
        
        try:
            response = requests.post(
                self.config['url'], 
                json=payload, 
                headers=headers, 
                timeout=60,
                stream=True
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    
                    # Skip empty lines and data: prefix
                    if not line_str.strip() or not line_str.startswith('data: '):
                        continue
                    
                    # Remove "data: " prefix
                    data_str = line_str[6:].strip()
                    
                    # Check for [DONE] signal
                    if data_str == '[DONE]':
                        completion_data = {
                            "type": "done",
                            "success": True,
                            "provider": "openai"
                        }
                        yield f"data: {json.dumps(completion_data)}\n\n"
                        break
                    
                    try:
                        chunk_json = json.loads(data_str)
                        
                        # Extract content from OpenAI streaming format
                        if "choices" in chunk_json and len(chunk_json["choices"]) > 0:
                            choice = chunk_json["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                content = choice["delta"]["content"]
                                if content:  # Only yield non-empty content
                                    chunk_data = {
                                        "type": "content",
                                        "content": content,
                                        "provider": "openai"
                                    }
                                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    except json.JSONDecodeError:
                        continue
            
        except requests.exceptions.Timeout:
            logging.error("OpenAI streaming API request timed out")
            yield from self.get_mock_streaming_response(prompt, user_id)
        except requests.exceptions.RequestException as e:
            logging.error(f"OpenAI streaming API request failed: {e}")
            error_data = {
                "type": "error",
                "error": f"Request failed: {str(e)}",
                "provider": "openai"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        except Exception as e:
            logging.error(f"Unexpected error with OpenAI streaming API: {e}")
            error_data = {
                "type": "error",
                "error": f"Unexpected error: {str(e)}",
                "provider": "openai"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
