#!/usr/bin/env python
"""Download SAM2 checkpoint"""
import sys
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')

import subprocess
result = subprocess.run(
    [sys.executable, '-m', 'modal', 'run', 'modal_app.py::download_checkpoint'],
    capture_output=False,
    text=False
)
sys.exit(result.returncode)
