import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app import mock_data
from app.models.schemas import Application
from app.routers import applications


@asynccontextmanager
async def lifespan(_: FastAPI):
    mock_data.seed()
    for seeded_app in list(mock_data.APPLICATIONS.values()):
        if seeded_app.score is None:
            await applications.run_full_pipeline(seeded_app)
    yield


app = FastAPI(
    title="Aitabaar API",
    description="AI-assisted SME loan origination — UBL National Innovation Hackathon 2026",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("DASHBOARD_ORIGIN", "http://localhost:5173"),
        "http://localhost:3000",
    ],
    # Any Vercel preview/prod deployment works without extra env config —
    # one less thing to break during demo setup (hackathon scope, no auth).
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "aitabaar-backend"}


@app.get("/demo/reset", response_model=list[Application])
async def demo_reset():
    """Re-seeds the 3 demo applicants (clean approve / borderline / fraud
    flag, docs/decisions.md #12) and runs each through the real pipeline so
    the queue shows genuinely computed scores/briefs. Plain GET so it's a
    single click before a judging run — no state to protect here.
    force_offline=True: this path must be deterministic and network-free
    regardless of AITABAAR_OFFLINE or whether an API key happens to be set,
    so it always uses the template brief, never the live LLM."""
    apps = mock_data.reset()
    for demo_app in apps:
        await applications.run_full_pipeline(demo_app, force_offline=True)
    return apps
