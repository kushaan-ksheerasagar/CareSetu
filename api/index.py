"""
CareSetu - Vercel Serverless Python Entrypoint
Exports the FastAPI app for Vercel serverless deployment at /api/*
"""

import sys
import os

# Ensure project root and backend directory are in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app
