# SafeHer AI 🛡️
**Women Safety & Intelligent Street Lighting Platform**

> Predict danger. Light the path. Protect every woman.

---

## Project Structure

```
safeher-ai/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── model.py         # Random Forest + DBSCAN ML
│   ├── lighting.py      # Smart lighting logic
│   ├── sos.py           # SOS alert system
│   ├── requirements.txt
│   └── data/
│       └── incidents.csv
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api/index.js
    │   └── pages/
    │       ├── HeatmapPage.jsx    # Safety heatmap
    │       ├── RoutePage.jsx      # Route scorer
    │       ├── LightingPage.jsx   # Smart lighting
    │       └── SOSPage.jsx        # SOS alerts
    ├── package.json
    └── vite.config.js
```

---

## Setup & Run

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## Features

| Feature | Tech |
|---|---|
| Safety Heatmap | Random Forest + DBSCAN |
| Safe Route Scorer | Risk zone weighted scoring |
| Smart Lighting | Traffic density model |
| SOS Alert | GPS + nearest station dispatch |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/heatmap` | Generate safety heatmap |
| GET | `/api/hotspots` | Get DBSCAN clusters |
| POST | `/api/route/score` | Score a route |
| POST | `/api/lighting/map` | Get lighting map |
| GET | `/api/lighting/savings` | Energy savings stats |
| POST | `/api/sos/trigger` | Trigger SOS alert |
| GET | `/api/sos/log` | Get alert history |

---

## Tech Stack
- **Backend**: FastAPI, scikit-learn, pandas, numpy
- **Frontend**: React, Vite, TailwindCSS, Leaflet.js
- **ML**: Random Forest Classifier, DBSCAN Clustering
- **Maps**: Leaflet + CartoDB Dark tiles
