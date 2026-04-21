import numpy as np
import torch
import torch.nn as nn
from urllib.request import urlretrieve
from pathlib import Path
import os


class SileroVAD(nn.Module):
    def __init__(self, model=None, utils=None):
        super().__init__()
        self.model = model
        self.utils = utils
        self._sample_rate = 16000
        self._min_silence_duration_ms = 500
        self._speech_pad_ms = 400

    @classmethod
    async def create(cls):
        try:
            model, utils = torch.hub.load(
                "snakers4/silero-vad",
                "silero_vad",
                force_reload=False
            )
            return cls(model, utils)
        except Exception as e:
            print(f"Failed to load Silero VAD: {e}")
            raise

    @property
    def sample_rate(self):
        return self._sample_rate

    async def is_speaking(self, audio: np.ndarray) -> bool:
        if self.model is None or self.utils is None:
            return False
            
        try:
            if len(audio) < 512:
                return False
                
            audio_tensor = torch.from_numpy(audio).float()
            
            if audio_tensor.dim() == 1:
                audio_tensor = audio_tensor.unsqueeze(0)
            
            with torch.no_grad():
                speech_prob = self.model(audio_tensor, self._sample_rate).item()
            
            return speech_prob > 0.5
            
        except Exception as e:
            print(f"VAD prediction error: {e}")
            return False

    async def get_speech_timestamps(
        self,
        audio: np.ndarray,
        min_silence_duration_ms: int = 500
    ):
        if self.model is None or self.utils is None:
            return []
            
        try:
            audio_tensor = torch.from_numpy(audio).float()
            
            if audio_tensor.dim() == 1:
                audio_tensor = audio_tensor.unsqueeze(0)
            
            get_timestamps = self.utils[0]
            
            with torch.no_grad():
                timestamps = get_timestamps(
                    audio_tensor,
                    self._sample_rate,
                    min_silence_duration_ms=min_silence_duration_ms,
                    speech_pad_ms=self._speech_pad_ms
                )
            
            return timestamps
            
        except Exception as e:
            print(f"Timestamp error: {e}")
            return []