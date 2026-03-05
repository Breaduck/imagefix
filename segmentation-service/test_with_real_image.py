#!/usr/bin/env python
"""Test SAM2 with a real generated image"""
import requests
import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw

# Create a simple test image with a circle
img = Image.new('RGB', (100, 100), color='white')
draw = ImageDraw.Draw(img)
draw.ellipse([25, 25, 75, 75], fill='red', outline='black')

# Convert to base64
buffer = BytesIO()
img.save(buffer, format='PNG')
img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
img_data_url = f"data:image/png;base64,{img_base64}"

print("Testing SAM2 extraction endpoint...")
print(f"Image: 100x100 with red circle")
print(f"Data URL length: {len(img_data_url)}")

test_data = {
    "imagePngBase64": img_data_url,
    "textMaskBoxes": [],
    "opts": {}
}

response = requests.post(
    "https://hiyoonsh1--sam2-segmentation-extract.modal.run",
    json=test_data,
    timeout=120
)

print(f"\nStatus: {response.status_code}")
result = response.json()

if isinstance(result, list):
    result = result[0]

print(f"\nObject layers found: {len(result.get('objectLayers', []))}")
print(f"Stats: {result.get('stats', {})}")

if 'error' in result:
    print(f"Error: {result['error']}")
