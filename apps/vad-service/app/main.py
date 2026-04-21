from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import torch
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from .vad import SileroVAD

vad_model: Optional[SileroVAD] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global vad_model
    vad_model = await SileroVAD.create()
    yield
    vad_model = None


app = FastAPI(title="VAD Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": vad_model is not None}


@app.websocket("/vad")
async def vad_stream(websocket: WebSocket):
    await websocket.accept()
    
    if vad_model is None:
        await websocket.send_json({"error": "VAD model not loaded"})
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_bytes()
            
            audio_np = np.frombuffer(data, dtype=np.int16)
            audio_float = audio_np.astype(np.float32) / 32768.0
            
            is_speaking = await vad_model.is_speaking(audio_float)
            
            await websocket.send_json({
                "speaking": is_speaking,
                "timestamp": torch.randint(0, 1000000, (1,)).item()
            })
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
        await websocket.close()
