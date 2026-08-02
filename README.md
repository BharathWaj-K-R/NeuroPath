# NeuroPath

AI-powered personalized learning platform using Gemini API, FastAPI backend, React frontend.

## Stack

- **Frontend**: React.js + Tailwind CSS (via Lovable)
- **Backend**: Python 3.11 + FastAPI
- **Database**: MySQL
- **Auth**: JWT
- **AI**: Gemini API
- **Deploy**: Render

## Local Setup

### Backend

```bash
cd api
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Env Vars

Copy `.env.example` → `.env` and fill:

```
DATABASE_URL=mysql+pymysql://user:pass@host:3306/neuropath
JWT_SECRET_KEY=<random>
GEMINI_API_KEY=<your_key>
```

## Deployment

Push to GitHub → Render auto-deploys both services.

See `render.yaml` for config.

## Project Structure

```
NeuroPath/
├── frontend/           # React app (from Lovable)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── api/                # FastAPI backend
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── utils/
│   ├── config/
│   └── app.py
├── requirements.txt
├── .env.example
├── render.yaml
└── README.md
```
