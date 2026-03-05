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

## API Endpoints

### GET /health

Health check with detailed status.

**Test:**
```bash
curl https://YOUR-WORKSPACE--sam2-segmentation-health.modal.run
```

**Response:**
```json
{
  "ok": true,
  "modelLoaded": true,
  "checkpointExists": true,
  "checkpointPath": "/checkpoints/sam2.1_hiera_large.pt",
  "checkpointFiles": ["sam2.1_hiera_large.pt"],
  "loading": false,
  "loadTimeMs": 12450
}
```

### POST /warmup

Preload model and checkpoint. First call may take 60-120s.

**Test:**
```bash
curl -X POST https://YOUR-WORKSPACE--sam2-segmentation-warmup.modal.run \
  --max-time 240
```

**Response (success):**
```json
{
  "warmed": true,
  "loadMs": 67890,
  "modelLoadTimeMs": 12450
}
```

**Response (already warming):**
```json
{
  "warmed": false,
  "code": "WARMING_UP",
  "retryAfterMs": 30000
}
```

### POST /extract

Extract object layers from image using SAM2.

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

**Test:**
```bash
curl -X POST https://YOUR-WORKSPACE--sam2-segmentation-extract.modal.run \
  -H "Content-Type: application/json" \
  -d '{"imagePngBase64":"data:image/png;base64,iVBORw0KG...","textMaskBoxes":[],"opts":{}}' \
  --max-time 240
```

**Response (success):**
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

**Response (warming up):**
```json
{
  "code": "WARMING_UP",
  "message": "Model is loading, please retry in 30 seconds",
  "retryAfterMs": 30000,
  "objectLayers": [],
  "stats": {}
}
```

## How It Works

1. **Model Loading (once per container)**:
   - Checkpoint auto-downloaded to Modal volume (~900MB) if missing
   - Model loaded as singleton on first request
   - Subsequent requests reuse loaded model
   - `keep_warm=1` keeps container alive between requests

2. **SAM2 Generation**: Automatically segments all objects in image

3. **Post-processing**:
   - Area Filter: Remove too small (<0.5%) or too large (>80%) masks
   - Text Overlap Filter: Remove masks overlapping text regions (>50%)
   - IoU Deduplication: Merge similar masks (IoU >0.7)

4. **PNG Export**: Crop each mask to bbox, create transparent RGBA PNG

## Performance

- **Cold start** (first request): 60-120s (model load + inference)
- **Warm requests**: 2-5s (inference only)
- **Keep warm**: Container stays alive for ~5 minutes after last request
- **Model**: SAM2.1 Hiera Large (~900MB)
- **GPU**: A10G on Modal
- **Inference**: ~2-5s per image on A10G

## Production Features

- **Singleton model loading**: Model loaded once per container, not per request
- **Health endpoint**: Check model status before sending requests
- **Warmup endpoint**: Preload model explicitly
- **Clear error codes**: `WARMING_UP` with `retryAfterMs` during model load
- **Volume persistence**: Checkpoint cached across deployments
- **Keep warm**: Faster response for subsequent requests

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
