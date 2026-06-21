from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv(override=True)

app = FastAPI(title="VibeChat")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


from .routers import analyze, match, chat_ws, suggest, summary_image  # noqa: E402

app.include_router(analyze.router)
app.include_router(match.router)
app.include_router(chat_ws.router)
app.include_router(suggest.router)
app.include_router(summary_image.router)


@app.get("/health")
def health():
    return {"status": "ok"}
