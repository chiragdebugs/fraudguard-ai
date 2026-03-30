# FastAPI Backend (FraudGuard AI)

This backend powers the frontend’s **real streaming**, **model predict**, and **OCR extract** flows.

## Required env var (frontend → backend)

In your Vercel project, set:

- `NEXT_PUBLIC_FRAUD_API_BASE_URL` = `https://<your-backend-domain>`

Example:

- `NEXT_PUBLIC_FRAUD_API_BASE_URL` = `https://fraudguard-backend.onrender.com`

Then redeploy the frontend.

## Run locally

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Render deploy (recommended)

1. Create a new **Web Service** in Render.
2. Connect the Git repo (this project).
3. Set Build Command:
   - `pip install -r requirements.txt`
4. Set Start Command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set Environment Variables (optional):
   - none required for this mock backend

After deploy, copy your backend URL and put it into:
`NEXT_PUBLIC_FRAUD_API_BASE_URL` on Vercel.

## Fly.io deploy

Dockerfile is included:

- `backend/Dockerfile`

General flow:

```bash
cd backend
fly launch
fly deploy
```

After deploy, use the resulting `https://<app>.fly.dev` URL for:
`NEXT_PUBLIC_FRAUD_API_BASE_URL`.

## API endpoints

- `GET /api/transactions/stream?strictness=<0..1>` (SSE)
- `POST /api/model/predict` (mock)
- `POST /api/transactions/submit` (user-provided transaction scoring)
- `POST /api/ocr/extract` (OCR mock with 2s delay + tx matching)
- `POST /api/transactions/action` (block/approve/request proof)

---

Note: OCR extraction is mocked (2s delay) but returns structured receipt fields that match the most recent transaction for the provided `txId`.

