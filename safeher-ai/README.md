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
│   ├── users.py         # User registration & helper finder
│   ├── requirements.txt
│   └── data/
│       ├── incidents.csv       # Training data (required)
│       └── police_stations.csv # Station data (required for SOS)
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

### 1. Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
ORS_API_KEY=your_openrouteservice_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

> Get a free ORS API key at https://openrouteservice.org

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API runs at: **http://localhost:8000**
- Interactive docs: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: **http://localhost:5173**

---

## Required Data Files

The backend needs two CSV files inside `backend/data/`:

### `incidents.csv`
| Column | Type | Description |
|---|---|---|
| lat | float | Incident latitude |
| lng | float | Incident longitude |
| incident_type | string | e.g. "harassment", "theft" |
| lighting | string | `none`, `dim`, or `good` |
| hour | int | 0–23 |
| day_of_week | int | 0 (Mon) – 6 (Sun) |
| risk_level | int | 1 (Very Low) – 5 (Critical) |

### `police_stations.csv`
| Column | Type | Description |
|---|---|---|
| id | int | Station ID |
| name | string | Station name |
| lat | float | Latitude |
| lng | float | Longitude |
| contact | string | Phone number |

---

## Features

| Feature | Tech |
|---|---|
| Safety Heatmap | Random Forest + DBSCAN |
| Safe Route Scorer | Risk-zone weighted scoring |
| Smart Lighting | Traffic density model |
| SOS Alert | GPS + nearest station dispatch |
| Community Helpers | Proximity-based user matching |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API health check |
| GET | `/health` | Liveness probe |
| POST | `/api/heatmap` | Generate safety heatmap |
| POST | `/api/zone/risk` | Get risk for a single zone |
| GET | `/api/hotspots` | Get DBSCAN clusters |
| POST | `/api/route/score` | Score a route |
| POST | `/api/route/find-safe` | Find safest route via ORS |
| POST | `/api/lighting/zone` | Get lighting for a zone |
| POST | `/api/lighting/map` | Get lighting map |
| GET | `/api/lighting/savings` | Energy savings stats |
| POST | `/api/users/register` | Register a user |
| GET | `/api/users/nearest-helper` | Find nearest active helper |
| POST | `/api/sos/trigger` | Trigger SOS alert |
| GET | `/api/sos/log` | Get alert history |
| GET | `/api/sos/nearest-station` | Find nearest police station |

---

## Tech Stack
- **Backend**: FastAPI, scikit-learn, pandas, numpy, requests
- **Frontend**: React, Vite, TailwindCSS, Leaflet.js
- **ML**: Random Forest Classifier, DBSCAN Clustering
- **Maps**: Leaflet + CartoDB Dark tiles
- **Routing**: OpenRouteService API

---

## Security Notes

- Never commit `.env` or API keys to version control — add `.env` to `.gitignore`
- Set `ALLOWED_ORIGINS` to your actual frontend domain in production (not `*`)
- Replace in-memory `USERS` and `SOS_LOG` lists with a persistent database before deploying

---

## License

MIT License — feel free to use, modify, and distribute with attribution.
