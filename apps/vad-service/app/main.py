from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.vad import VadState


class VadRequest(BaseModel):
    energy: float = Field(ge=0.0, le=1.0)
    frame_ms: int = Field(default=20, ge=10, le=200)


app = FastAPI(title="voice-agent-vad")
vad = VadState()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/vad")
def detect_vad(payload: VadRequest) -> dict[str, bool | int]:
    return vad.process(payload.energy, payload.frame_ms)
