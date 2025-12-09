from typing import Dict, Any
from .base_provider import BaseAIProvider
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider

class AIProviderFactory:
    """Factory class to create AI providers based on configuration"""
    
    @staticmethod
    def create_provider(provider_type: str, config: Dict[str, Any]) -> BaseAIProvider:
        """Create an AI provider instance based on type and configuration"""
        
        providers = {
            'GenAI': GeminiProvider,
            'OpenAI': OpenAIProvider
        }
        
        provider_class = providers.get(provider_type)
        if not provider_class:
            raise ValueError(f"Unknown AI provider: {provider_type}. Available: {list(providers.keys())}")
        
        return provider_class(config)
    
    @staticmethod
    def get_available_providers() -> list:
        """Get list of available provider types"""
        return ['GenAI', 'OpenAI']
