from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Generator
import json

class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.validate_config()
    
    @abstractmethod
    def validate_config(self) -> None:
        """Validate provider-specific configuration"""
        pass
    
    @abstractmethod
    def send_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Send request to AI provider and return standardized response"""
        pass
    
    @abstractmethod
    def send_streaming_request(self, prompt: str, system_prompt: str, user_id: Optional[str] = None) -> Generator[str, None, None]:
        """Send streaming request to AI provider and yield chunks"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is properly configured and available"""
        pass
    
    def get_mock_response(self, prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Return a mock response when provider is not available"""
        return {
            "response": f"[MOCK {self.__class__.__name__.replace('Provider', '').upper()}] You asked: '{prompt}' (user_id={user_id})",
            "success": True,
            "mock": True
        }
    
    def get_mock_streaming_response(self, prompt: str, user_id: Optional[str] = None) -> Generator[str, None, None]:
        """Return a mock streaming response when provider is not available"""
        mock_response = f"[MOCK {self.__class__.__name__.replace('Provider', '').upper()}] You asked: '{prompt}' (user_id={user_id})"
        
        # Split response into chunks to simulate streaming
        words = mock_response.split()
        for i, word in enumerate(words):
            chunk_data = {
                "type": "content",
                "content": word + (" " if i < len(words) - 1 else ""),
                "mock": True
            }
            yield f"data: {json.dumps(chunk_data)}\n\n"
        
        # Send completion signal
        completion_data = {
            "type": "done",
            "success": True,
            "mock": True
        }
        yield f"data: {json.dumps(completion_data)}\n\n"
