import uuid
import os
from datetime import datetime

import chromadb
from chromadb.config import Settings


CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data")

MAX_ENTRIES_BEFORE_SUMMARIZE = 100
SUMMARIZE_BATCH = 50


class Memory:
    def __init__(self):
        self._client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="aura_memories",
            metadata={"hnsw:space": "cosine"},
        )

    def store(self, text: str, metadata: dict | None = None) -> str:
        mem_id = f"mem_{uuid.uuid4().hex[:12]}"
        meta = {
            "timestamp": datetime.now().isoformat(),
            "emotion": "",
            "topic": "",
            "turn": 0,
            "is_summary": False,
        }
        if metadata:
            meta.update(metadata)

        # ChromaDB metadata values must be str, int, float, or bool
        for k, v in meta.items():
            if v is None:
                meta[k] = ""

        self._collection.add(
            ids=[mem_id],
            documents=[text],
            metadatas=[meta],
        )

        # Auto-summarize when collection grows large
        if self._collection.count() > MAX_ENTRIES_BEFORE_SUMMARIZE:
            self._summarize_old()

        return mem_id

    def retrieve(self, query: str, k: int = 5) -> list[dict]:
        if self._collection.count() == 0:
            return []

        actual_k = min(k, self._collection.count())
        results = self._collection.query(
            query_texts=[query],
            n_results=actual_k,
        )

        memories = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i, mem_id in enumerate(ids):
            memories.append({
                "id": mem_id,
                "text": docs[i],
                "timestamp": metas[i].get("timestamp", ""),
                "emotion": metas[i].get("emotion", ""),
                "topic": metas[i].get("topic", ""),
                "relevance": round(1 - distances[i], 3) if i < len(distances) else 0,
            })

        return memories

    def get_all(self, limit: int = 50) -> list[dict]:
        if self._collection.count() == 0:
            return []

        results = self._collection.get(
            limit=limit,
            include=["documents", "metadatas"],
        )

        memories = []
        for i, mem_id in enumerate(results["ids"]):
            memories.append({
                "id": mem_id,
                "text": results["documents"][i],
                "timestamp": results["metadatas"][i].get("timestamp", ""),
                "emotion": results["metadatas"][i].get("emotion", ""),
                "topic": results["metadatas"][i].get("topic", ""),
            })

        # Sort by timestamp descending (newest first)
        memories.sort(key=lambda m: m["timestamp"], reverse=True)
        return memories[:limit]

    def _summarize_old(self):
        """Compress oldest entries into summary documents."""
        all_results = self._collection.get(
            include=["documents", "metadatas"],
        )

        # Pair up ids with timestamps, filter out existing summaries
        entries = []
        for i, mem_id in enumerate(all_results["ids"]):
            meta = all_results["metadatas"][i]
            if meta.get("is_summary"):
                continue
            entries.append({
                "id": mem_id,
                "text": all_results["documents"][i],
                "timestamp": meta.get("timestamp", ""),
            })

        entries.sort(key=lambda e: e["timestamp"])

        if len(entries) <= SUMMARIZE_BATCH:
            return

        to_compress = entries[:SUMMARIZE_BATCH]
        combined = "\n".join(
            f"- [{e['timestamp'][:10]}] {e['text']}" for e in to_compress
        )

        summary_text = f"[Summary of {len(to_compress)} older memories]\n{combined}"

        summary_id = f"mem_summary_{uuid.uuid4().hex[:8]}"
        self._collection.add(
            ids=[summary_id],
            documents=[summary_text],
            metadatas=[{
                "timestamp": to_compress[-1]["timestamp"],
                "emotion": "",
                "topic": "summary",
                "turn": 0,
                "is_summary": True,
            }],
        )

        ids_to_remove = [e["id"] for e in to_compress]
        self._collection.delete(ids=ids_to_remove)


def format_memories_for_prompt(memories: list[dict]) -> str:
    if not memories:
        return ""

    lines = ["[Relevant memories]"]
    for mem in memories:
        ts = mem.get("timestamp", "")
        date_str = ""
        if ts:
            try:
                dt = datetime.fromisoformat(ts)
                delta = datetime.now() - dt
                if delta.days == 0:
                    date_str = "Today"
                elif delta.days == 1:
                    date_str = "Yesterday"
                elif delta.days < 7:
                    date_str = f"{delta.days} days ago"
                else:
                    date_str = dt.strftime("%b %d")
            except ValueError:
                date_str = ts[:10]
        lines.append(f"- {date_str}: {mem['text']}")

    return "\n".join(lines)
