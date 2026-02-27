import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.model import generate_stream
from backend.memory import Memory, format_memories_for_prompt
from backend.emotion import analyze as analyze_emotion

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = Memory()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class MemoryStoreRequest(BaseModel):
    text: str
    metadata: dict = {}


class EmotionRequest(BaseModel):
    text: str


@app.get("/")
async def root():
    return {"message": "Aura API is running"}


@app.post("/chat")
async def chat(req: ChatRequest):
    relevant = memory.retrieve(req.message, k=5)
    memory_context = format_memories_for_prompt(relevant)

    def event_stream():
        full_reply = ""
        try:
            for token, done in generate_stream(
                req.message, req.history, memory_context
            ):
                full_reply += token
                if done:
                    # Analyze emotion on the complete reply
                    emo = analyze_emotion(full_reply)
                    yield f"data: {json.dumps({'token': token, 'reply': full_reply, 'done': True, 'emotion': emo['emotion'], 'gesture': emo['gesture'], 'intensity': emo['intensity']})}\n\n"
                else:
                    yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

        if full_reply:
            emo = analyze_emotion(full_reply)
            memory.store(
                f"User said: {req.message}",
                {"emotion": "", "topic": "conversation"},
            )
            memory.store(
                f"Aura replied: {full_reply}",
                {"emotion": emo["emotion"], "topic": "conversation"},
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/memory")
async def get_memories():
    memories = memory.get_all(limit=50)
    return {"memories": memories}


@app.post("/memory")
async def store_memory(req: MemoryStoreRequest):
    mem_id = memory.store(req.text, req.metadata)
    return {"id": mem_id, "status": "stored"}


@app.get("/emotion")
async def get_emotion(text: str):
    result = analyze_emotion(text)
    return result


@app.post("/emotion")
async def post_emotion(req: EmotionRequest):
    result = analyze_emotion(req.text)
    return result
