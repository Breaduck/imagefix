"""
SAM2 Segmentation Service - Modal Deployment
Serverless GPU deployment on modal.com
"""

import io
import base64
import time
from typing import List, Optional
import modal

# Define Modal stub
stub = modal.App("sam2-segmentation")

# Define container image with SAM2 and dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "pillow==11.0.0",
        "numpy==2.1.3",
        "fastapi==0.115.0",
    )
    .run_commands(
        "pip install git+https://github.com/facebookresearch/sam2.git"
    )
)

# Define volume for model checkpoint
volume = modal.Volume.from_name("sam2-checkpoints", create_if_missing=True)
CHECKPOINT_PATH = "/checkpoints/sam2.1_hiera_large.pt"
CONFIG_DIR = "/root/.sam2"


@stub.function(
    image=image,
    gpu="A10G",
    volumes={"/checkpoints": volume},
    timeout=300,
)
def download_checkpoint():
    """Download SAM2 checkpoint if not exists"""
    import os
    import urllib.request

    if os.path.exists(CHECKPOINT_PATH):
        print(f"[SAM2] Checkpoint already exists at {CHECKPOINT_PATH}")
        return

    print("[SAM2] Downloading checkpoint...")
    os.makedirs("/checkpoints", exist_ok=True)

    url = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"
    urllib.request.urlretrieve(url, CHECKPOINT_PATH)
    volume.commit()

    print(f"[SAM2] Checkpoint downloaded to {CHECKPOINT_PATH}")


@stub.function(
    image=image,
    gpu="A10G",
    volumes={"/checkpoints": volume},
    timeout=600,
    container_idle_timeout=300,
)
@modal.web_endpoint(method="POST")
def extract(request_data: dict):
    """Extract object layers from image using SAM2"""
    import numpy as np
    from PIL import Image
    import torch
    from sam2.build_sam import build_sam2
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
    import os

    start_time = time.time()

    # Ensure checkpoint exists
    if not os.path.exists(CHECKPOINT_PATH):
        return {
            "error": "Model checkpoint not found. Run download_checkpoint first.",
            "objectLayers": [],
            "stats": {}
        }, 503

    # Parse request
    image_png_base64 = request_data.get("imagePngBase64", "")
    text_mask_boxes = request_data.get("textMaskBoxes", [])
    opts = request_data.get("opts", {})

    min_area_ratio = opts.get("minAreaRatio", 0.005)
    max_area_ratio = opts.get("maxAreaRatio", 0.8)
    iou_threshold = opts.get("iouThreshold", 0.7)

    try:
        # Decode image
        if image_png_base64.startswith('data:image'):
            img_data = image_png_base64.split(',', 1)[1]
        else:
            img_data = image_png_base64

        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_array = np.array(img)

        print(f"[SAM2] Image size: {img.size}")

        # Load model
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[SAM2] Loading model on {device}...")

        # Create config directory
        os.makedirs(CONFIG_DIR, exist_ok=True)

        # Build SAM2 model
        sam2_model = build_sam2(
            config_file="configs/sam2.1/sam2.1_hiera_l.yaml",
            ckpt_path=CHECKPOINT_PATH,
            device=device
        )

        mask_generator = SAM2AutomaticMaskGenerator(sam2_model)
        print("[SAM2] Model loaded")

        # Generate masks
        print("[SAM2] Generating masks...")
        masks = mask_generator.generate(img_array)
        total_masks = len(masks)
        print(f"[SAM2] Generated {total_masks} masks")

        # Post-process masks
        image_area = img.size[0] * img.size[1]
        filtered_masks = []

        # 1. Filter by area ratio
        for mask in masks:
            area = mask['area']
            area_ratio = area / image_area
            if min_area_ratio <= area_ratio <= max_area_ratio:
                filtered_masks.append(mask)

        print(f"[SAM2] After area filter: {len(filtered_masks)} masks")

        # 2. Remove text overlaps
        def calculate_overlap(mask_box, text_box):
            x1, y1, w1, h1 = mask_box
            x2, y2, w2, h2 = text_box['x'], text_box['y'], text_box['width'], text_box['height']

            inter_x1 = max(x1, x2)
            inter_y1 = max(y1, y2)
            inter_x2 = min(x1 + w1, x2 + w2)
            inter_y2 = min(y1 + h1, y2 + h2)

            if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
                return 0.0

            inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
            return inter_area / (w1 * h1) if (w1 * h1) > 0 else 0.0

        non_text_masks = []
        for mask in filtered_masks:
            bbox = mask['bbox']
            overlaps_text = any(calculate_overlap(bbox, tb) > 0.5 for tb in text_mask_boxes)
            if not overlaps_text:
                non_text_masks.append(mask)

        print(f"[SAM2] After text overlap filter: {len(non_text_masks)} masks")

        # 3. Deduplicate by IoU
        def calculate_iou(box1, box2):
            x1, y1, w1, h1 = box1
            x2, y2, w2, h2 = box2

            inter_x1 = max(x1, x2)
            inter_y1 = max(y1, y2)
            inter_x2 = min(x1 + w1, x2 + w2)
            inter_y2 = min(y1 + h1, y2 + h2)

            if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
                return 0.0

            inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
            union_area = w1 * h1 + w2 * h2 - inter_area
            return inter_area / union_area if union_area > 0 else 0.0

        deduplicated_masks = []
        sorted_masks = sorted(non_text_masks, key=lambda m: m['area'], reverse=True)

        for mask in sorted_masks:
            bbox = mask['bbox']
            is_duplicate = any(calculate_iou(bbox, kept['bbox']) > iou_threshold for kept in deduplicated_masks)
            if not is_duplicate:
                deduplicated_masks.append(mask)

        print(f"[SAM2] After deduplication: {len(deduplicated_masks)} masks")

        # 4. Convert to object layers
        object_layers = []
        for idx, mask in enumerate(deduplicated_masks):
            bbox = mask['bbox']
            x, y, w, h = [int(v) for v in bbox]

            # Crop image and mask
            cropped_img = img_array[y:y+h, x:x+w]
            cropped_mask = mask['segmentation'][y:y+h, x:x+w]

            # Create RGBA
            rgba = np.zeros((h, w, 4), dtype=np.uint8)
            rgba[:, :, :3] = cropped_img
            rgba[:, :, 3] = (cropped_mask * 255).astype(np.uint8)

            # Convert to PNG base64
            pil_img = Image.fromarray(rgba, 'RGBA')
            buffer = io.BytesIO()
            pil_img.save(buffer, format='PNG')
            png_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            object_layers.append({
                "id": f"obj_{idx}",
                "pngBase64": f"data:image/png;base64,{png_base64}",
                "x": x,
                "y": y,
                "width": w,
                "height": h
            })

        processing_time_ms = int((time.time() - start_time) * 1000)
        print(f"[SAM2] Complete: {len(object_layers)} objects in {processing_time_ms}ms")

        return {
            "objectLayers": object_layers,
            "stats": {
                "totalMasks": total_masks,
                "filteredMasks": len(object_layers),
                "processingTimeMs": processing_time_ms
            }
        }

    except Exception as e:
        print(f"[SAM2] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "objectLayers": [], "stats": {}}, 500


@stub.local_entrypoint()
def main():
    """Deploy and get URL"""
    print("Downloading checkpoint...")
    download_checkpoint.remote()
    print("\nDeploy with: modal deploy modal_app.py")
    print("Your endpoint will be at: https://YOUR-WORKSPACE--sam2-segmentation-extract.modal.run")
