#!/usr/bin/env python
"""Deploy script with proper encoding handling"""
import sys
import os
import subprocess

# Force UTF-8 encoding
os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')

# Run modal deploy
result = subprocess.run(
    [sys.executable, '-m', 'modal', 'deploy', 'modal_app.py'],
    capture_output=False,
    text=False,
    errors='replace'
)

sys.exit(result.returncode)
