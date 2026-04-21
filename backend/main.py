from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from config import settings
from contextlib import asynccontextmanager
from routes import router   # import your router once

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    yield
    # Shutdown actions

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Include your API routes under the prefix you want
app.include_router(router, prefix="/api")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3001"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Landing page
@app.get("/", response_class=HTMLResponse)
async def root():
    return "<h1>🚀 Backend is running!</h1><p>Go to /docs to test endpoints.</p>"

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "AI Accountant System is running."}


