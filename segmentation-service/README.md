# SAM2 Segmentation Service

Extracts object layers from images using Segment Anything Model 2 (SAM2).

## Option 1: Modal Deployment (Recommended for Production)

Modal provides serverless GPU hosting with automatic scaling.

### Setup

```bash
pip install modal
modal token new  # Login to Modal
```

### Deploy

```bash
cd segmentation-service
modal deploy modal_app.py
```

This will:
1. Auto-download SAM2 checkpoint (sam2.1_hiera_large.pt, ~900MB)
2. Deploy to Modal's GPU infrastructure
3. Return a public HTTPS URL like: `https://YOUR-WORKSPACE--sam2-segmentation-extract.modal.run`

### Configure Webapp

Add to `.env.local`:

```
SEGMENTER_URL=https://YOUR-WORKSPACE--sam2-segmentation-extract.modal.run
SEGMENTER_TOKEN=your-optional-auth-token
```

## Option 2: Local FastAPI (Development)

For testing without GPU/Modal costs.

### Setup

```bash
cd segmentation-service

# Install dependencies
pip install -r requirements.txt

# Install SAM2
pip install git+https://github.com/facebookresearch/sam2.git

# Run service (auto-downloads checkpoint on first run)
python main.py
```

Service runs at `http://localhost:8000`

### Configure Webapp

Add to `.env.local`:

```
SEGMENTER_URL=http://localhost:8000
```

## API

### POST /extract

**Request:**
```json
{
  "imagePngBase64": "data:image/png;base64,...",
  "textMaskBoxes": [
    { "x": 10, "y": 20, "width": 100, "height": 30 }
  ],
  "opts": {
    "minAreaRatio": 0.005,
    "maxAreaRatio": 0.8,
    "iouThreshold": 0.7
  }
}
```

**Response:**
```json
{
  "objectLayers": [
    {
      "id": "obj_0",
      "pngBase64": "data:image/png;base64,...",
      "x": 50,
      "y": 100,
      "width": 200,
      "height": 150
    }
  ],
  "stats": {
    "totalMasks": 45,
    "filteredMasks": 3,
    "processingTimeMs": 2340
  }
}
```

## How It Works

1. **SAM2 Generation**: Automatically segments all objects in image
2. **Area Filter**: Remove too small (<0.5%) or too large (>80%) masks
3. **Text Overlap Filter**: Remove masks overlapping text regions (>50%)
4. **IoU Deduplication**: Merge similar masks (IoU >0.7)
5. **PNG Export**: Crop each mask to bbox, create transparent RGBA PNG

## Model Details

- Model: SAM2.1 Hiera Large
- Checkpoint: ~900MB, auto-downloaded from Meta
- Config: `configs/sam2.1/sam2.1_hiera_l.yaml` (from SAM2 repo)
- GPU: A10G (Modal) or CUDA (local)
- Inference time: ~2-5s per image on A10G

## Troubleshooting

**Modal deployment fails:**
- Check `modal token new` was run
- Verify Modal account has GPU quota

**Local service fails:**
- Ensure SAM2 installed: `pip list | grep sam2`
- Check checkpoint downloaded: `ls checkpoints/`
- Verify CUDA available: `python -c "import torch; print(torch.cuda.is_available())"`

**Webapp returns empty objectLayers:**
- Check `SEGMENTER_URL` in `.env.local`
- Verify service is running: `curl http://localhost:8000/health` (local) or visit Modal URL
- Check webapp logs: `npm run dev` and look for `[ExtractLayers]` logs
