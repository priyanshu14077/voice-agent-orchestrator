from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class VadState:
    silence_ms: int = 0
    threshold_ms: int = 500
    activity_floor: float = 0.015
    frame_history: list[float] = field(default_factory=list)

    def process(self, energy: float, frame_ms: int) -> dict[str, bool | int]:
        self.frame_history.append(energy)
        self.frame_history = self.frame_history[-20:]

        if energy >= self.activity_floor:
            self.silence_ms = 0
            return {"speech": True, "speech_end": False, "silence_ms": self.silence_ms}

        self.silence_ms += frame_ms
        return {
            "speech": False,
            "speech_end": self.silence_ms >= self.threshold_ms,
            "silence_ms": self.silence_ms,
        }
