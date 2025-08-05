# 🌞 Vitamin D — A Seat Recommender for Sun Views

Vitamin D helps travelers choose the ideal window seat by analyzing sun positions during flights. Whether you want to bask in golden hour views or avoid harsh sunlight, Vitamin D recommends the side of the plane (left or right) offering the best scenic experience — based on real-time solar calculations.

---

## ✈️ Features

- 🌞 **Sun Position Tracking** – Uses real-time solar position to track sunrise/sunset along the flight path.
- 🧭 **Dynamic Path Sampling** – Divides the flight into 1-minute intervals for high-precision analysis.
- 💺 **Seat Side Recommendation** – Suggests the left or right side based on solar exposure.
- 🕰️ **Customizable Preferences** – Choose whether you want sunrise, sunset, or maximum sunshine.
- 🌍 **3D Globe View** – Realistic flight path visualization with the sun’s position in real time.

---

## 🧠 How It Works

- **Flight Path Calculation**: Uses Turf.js to compute a great-circle path from the source to the destination airport.
- **Time Sampling**: Breaks the total flight time into 1-minute segments to calculate positions and sun angles.
- **Sun Positioning**: Computes sun altitude and azimuth using subsolar point logic.
- **Event Detection**: Detects when sunrise or sunset occurs along the flight.
- **Seat Side Logic**: Uses vector geometry (dot/cross product) to determine the sun-facing side of the aircraft.

---

## 🛠️ Tech Stack

| Tech               | Purpose                                |
|--------------------|----------------------------------------|
| React + Material UI| Frontend & UI                          |
| Python + FastAPI   | Backend server and logic               |
| SQLite             | Lightweight database management        |
| Turf.js            | Flight path generation                 |
| Subsolar Point Math| Solar position/event calculations      |
| Three.js + Globe   | 3D globe with sun overlay              |
| Leaflet.js + OSM   | 2D interactive map                     |
| AeroDataBox API    | Airport and flight data                |
| Vercel             | Frontend hosting & deployment          |

---

## 🧪 Local Setup

### ✅ Prerequisites

- Python ≥ 3.8
- Node.js ≥ 18
- AeroDataBox API Key

---

### 📦 Clone and Install

```bash
git clone https://github.com/RujulP14/VitaminD.git
```

#### Frontend

```bash
cd frontend
npm install
```

#### Backend

```bash
cd backend
python -m venv .venv
# Windows
./venv/Scripts/activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

### ⚙️ Setup Environment Variables

#### In `backend/.env`:

```
AERODATA_API_KEY=your_api_key_here
```

#### In `frontend/.env`:

```
REACT_APP_BASE_URL=http://localhost:8000
```

---

## 🚀 Run the App

### Start Frontend

```bash
cd frontend
npm start
```

### Start Backend

```bash
cd backend
./venv/Scripts/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
