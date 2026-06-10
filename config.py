import os

# API Keys
MAPS_API_KEY = os.environ.get('MAPS_API_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBrFEI0JTDLrQyU7sFqV9HPsAKt6ht9840')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', os.environ.get('GEMINI_API_KEY', 'AIzaSyDydt1V58LLoRrrM98A1YeoGo6GnhJgNfk'))