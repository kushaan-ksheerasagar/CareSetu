"""
CareSetu - Vercel Serverless Python Entrypoint
Exports the FastAPI app for Vercel serverless deployment at /api/*
"""

import sys
import os

# Ensure project root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app
