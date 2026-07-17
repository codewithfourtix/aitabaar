import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import mock_data
from app.routers import applications

app = FastAPI(
    title="Aitabaar API",
    description="AI-assisted SME loan origination — UBL National Innovation Hackathon 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("DASHBOARD_ORIGIN", "http://localhost:5173"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)

mock_data.seed()


@app.get("/health")
def health():
    return {"status": "ok", "service": "aitabaar-backend"}
