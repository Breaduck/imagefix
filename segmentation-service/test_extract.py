#!/usr/bin/env python
"""Test SAM2 extraction endpoint"""
import requests
import json

# Small test image (10x10 red square)
test_data = {
    "imagePngBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA2ElEQVR4nO3SMQ0AAAjAMPz2F/kY4EikoKBfzm6Tdu7xV4gIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISKEiBAiQogIISJ+AlgPAqF+dWP+AAAAAElFTkSuQmCC",
    "textMaskBoxes": [],
    "opts": {}
}

print("Testing SAM2 extraction endpoint...")
print(f"Image data length: {len(test_data['imagePngBase64'])}")

response = requests.post(
    "https://hiyoonsh1--sam2-segmentation-extract.modal.run",
    json=test_data,
    timeout=120
)

print(f"\nStatus: {response.status_code}")
print(f"\nResponse:")
print(json.dumps(response.json(), indent=2))
