"""
SAM2 Segmentation Service - Local FastAPI
For local development and testing
"""

import io
import base64
import time
import os
from typing import List, Optional
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch

app = FastAPI(title="SAM2 Segmentation Service (Local)")

# Global model instance
sam2_model = None
mask_generator = None

CHECKPOINT_PATH = "checkpoints/sam2.1_hiera_large.pt"
CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"


class TextMaskBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class ExtractOptions(BaseModel):
    minAreaRatio: float = 0.005
    maxAreaRatio: float = 0.8
    iouThreshold: float = 0.7


class ExtractRequest(BaseModel):
    imagePngBase64: str
    textMaskBoxes: List[TextMaskBox]
    opts: Optional[ExtractOptions] = ExtractOptions()


def download_checkpoint():
    """Download SAM2 checkpoint if not exists"""
    if os.path.exists(CHECKPOINT_PATH):
        print(f"[SAM2] Checkpoint exists at {CHECKPOINT_PATH}")
        return

    print("[SAM2] Downloading checkpoint...")
    os.makedirs("checkpoints", exist_ok=True)

    import urllib.request
    urllib.request.urlretrieve(CHECKPOINT_URL, CHECKPOINT_PATH)
    print(f"[SAM2] Downloaded to {CHECKPOINT_PATH}")


def load_sam2_model():
    """Load SAM2 model on startup"""
    global sam2_model, mask_generator

    if sam2_model is not None:
        return

    download_checkpoint()

    print("[SAM2] Loading model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[SAM2] Using device: {device}")

    from sam2.build_sam import build_sam2
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

    sam2_model = build_sam2(
        config_file="configs/sam2.1/sam2.1_hiera_l.yaml",
        ckpt_path=CHECKPOINT_PATH,
        device=device
    )

    mask_generator = SAM2AutomaticMaskGenerator(sam2_model)
    print("[SAM2] Model loaded")


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_sam2_model()


@app.post("/extract")
async def extract_objects(request: ExtractRequest):
    """Extract object layers from image using SAM2"""
    start_time = time.time()

    if mask_generator is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Decode image
        if request.imagePngBase64.startswith('data:image'):
            img_data = request.imagePngBase64.split(',', 1)[1]
        else:
            img_data = request.imagePngBase64

        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_array = np.array(img)

        print(f"[SAM2] Image size: {img.size}")

        # Generate masks
        print("[SAM2] Generating masks...")
        masks = mask_generator.generate(img_array)
        total_masks = len(masks)
        print(f"[SAM2] Generated {total_masks} masks")

        # Post-process
        image_area = img.size[0] * img.size[1]
        filtered_masks = []

        # 1. Filter by area
        for mask in masks:
            area = mask['area']
            area_ratio = area / image_area
            if request.opts.minAreaRatio <= area_ratio <= request.opts.maxAreaRatio:
                filtered_masks.append(mask)

        print(f"[SAM2] After area filter: {len(filtered_masks)} masks")

        # 2. Remove text overlaps
        def calculate_overlap(mask_box, text_box):
            x1, y1, w1, h1 = mask_box
            x2, y2, w2, h2 = text_box.x, text_box.y, text_box.width, text_box.height

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
            overlaps_text = any(calculate_overlap(bbox, tb) > 0.5 for tb in request.textMaskBoxes)
            if not overlaps_text:
                non_text_masks.append(mask)

        print(f"[SAM2] After text filter: {len(non_text_masks)} masks")

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
            is_duplicate = any(calculate_iou(bbox, kept['bbox']) > request.opts.iouThreshold for kept in deduplicated_masks)
            if not is_duplicate:
                deduplicated_masks.append(mask)

        print(f"[SAM2] After dedup: {len(deduplicated_masks)} masks")

        # 4. Convert to object layers
        object_layers = []
        for idx, mask in enumerate(deduplicated_masks):
            bbox = mask['bbox']
            x, y, w, h = [int(v) for v in bbox]

            cropped_img = img_array[y:y+h, x:x+w]
            cropped_mask = mask['segmentation'][y:y+h, x:x+w]

            rgba = np.zeros((h, w, 4), dtype=np.uint8)
            rgba[:, :, :3] = cropped_img
            rgba[:, :, 3] = (cropped_mask * 255).astype(np.uint8)

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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check"""
    return {
        "status": "ok",
        "model_loaded": mask_generator is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
