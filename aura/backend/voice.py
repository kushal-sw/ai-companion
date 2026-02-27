# Voice pipeline (Phase 3)
# → Whisper: mic audio → transcript text
# → Coqui XTTS: text → speech audio
# → Returns audio + phoneme timing for lip sync

class Voice:
    def listen(self, audio_data):
        # Whisper implementation
        pass

    def speak(self, text):
        # Coqui XTTS implementation
        pass
