import os

# API Keys
MAPS_API_KEY = os.environ.get('MAPS_API_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', os.environ.get('GEMINI_API_KEY', ''))