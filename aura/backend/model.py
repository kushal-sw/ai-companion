import ollama

SYSTEM_PROMPT = (
    "You are Aura, a warm and caring AI companion. You are playful, curious, "
    "and slightly shy. You remember the person you talk to and care deeply "
    "about how they are feeling. Keep responses natural and conversational — "
    "2-4 sentences max unless asked for more. Never break character."
)

MODEL_NAME = "gemma3:4b"


def build_messages(
    message: str,
    history: list[dict] | None = None,
    memory_context: str = "",
) -> list[dict]:
    system_content = SYSTEM_PROMPT
    if memory_context:
        system_content += "\n\n" + memory_context + "\n\n[Current conversation]"

    messages = [{"role": "system", "content": system_content}]

    if history:
        for turn in history[-10:]:
            role = turn.get("role", "user")
            if role == "aura":
                role = "assistant"
            messages.append({"role": role, "content": turn.get("content", "")})

    messages.append({"role": "user", "content": message})
    return messages


def generate(
    message: str,
    history: list[dict] | None = None,
    memory_context: str = "",
) -> str:
    messages = build_messages(message, history, memory_context)
    response = ollama.chat(model=MODEL_NAME, messages=messages)
    return response["message"]["content"]


def generate_stream(
    message: str,
    history: list[dict] | None = None,
    memory_context: str = "",
):
    messages = build_messages(message, history, memory_context)
    stream = ollama.chat(model=MODEL_NAME, messages=messages, stream=True)
    for chunk in stream:
        token = chunk.get("message", {}).get("content", "")
        done = chunk.get("done", False)
        yield token, done
