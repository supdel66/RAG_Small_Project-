from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import chromadb
import ollama
import uuid
import io
import os
import tempfile

# PDF / DOCX / TXT parsing
import PyPDF2
import docx

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ChromaDB setup ──────────────────────────────────────────────────────────
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},
)

# ── Config ──────────────────────────────────────────────────────────────────
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL   = "llama3.2:3b"
CHUNK_SIZE  = 500   # characters
CHUNK_OVERLAP = 50


# ── Helpers ─────────────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")
    elif ext == "pdf":
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif ext in ("docx", "doc"):
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            f.write(file_bytes)
            tmp_path = f.name
        doc = docx.Document(tmp_path)
        os.unlink(tmp_path)
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return [c.strip() for c in chunks if c.strip()]


def embed(texts: list[str]) -> list[list[float]]:
    return [
        ollama.embeddings(model=EMBED_MODEL, prompt=t)["embedding"]
        for t in texts
    ]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed = {"txt", "pdf", "docx"}
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type. Allowed: {allowed}")

    raw = await file.read()

    try:
        text = extract_text(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, str(e))

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(400, "No text could be extracted from the file.")

    embeddings = embed(chunks)
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"source": file.filename, "chunk_index": i} for i in range(len(chunks))]

    collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadatas)

    return {
        "message": f"✅ '{file.filename}' uploaded and indexed.",
        "chunks": len(chunks),
    }


class ChatRequest(BaseModel):
    question: str
    top_k: int = 5


@app.post("/chat")
async def chat(req: ChatRequest):
    # Embed the question
    q_embedding = ollama.embeddings(model=EMBED_MODEL, prompt=req.question)["embedding"]

    # Retrieve relevant chunks
    results = collection.query(
        query_embeddings=[q_embedding],
        n_results=min(req.top_k, collection.count() or 1),
    )

    docs = results["documents"][0] if results["documents"] else []
    sources = [m["source"] for m in results["metadatas"][0]] if results["metadatas"] else []

    if not docs:
        async def no_docs():
            yield "No documents have been uploaded yet. Please upload a file first."
        return StreamingResponse(no_docs(), media_type="text/plain")

    context = "\n\n---\n\n".join(docs)
    prompt = f"""You are a helpful assistant. Answer the user's question based ONLY on the context below.
If the answer is not in the context, say "I don't have enough information to answer that."

Context:
{context}

Question: {req.question}

Answer:"""

    unique_sources = list(dict.fromkeys(sources))

    async def stream_response():
        # Stream the LLM response
        stream = ollama.chat(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        for chunk in stream:
            token = chunk["message"]["content"]
            if token:
                yield token

        # Append sources at end
        yield f"\n\n__SOURCES__:{','.join(unique_sources)}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.get("/documents")
def list_documents():
    """Return list of uploaded file names."""
    if collection.count() == 0:
        return {"files": []}
    results = collection.get(include=["metadatas"])
    files = list({m["source"] for m in results["metadatas"]})
    return {"files": sorted(files)}


@app.delete("/documents")
def clear_documents():
    """Delete all indexed documents."""
    global collection
    chroma_client.delete_collection("documents")
    collection = chroma_client.get_or_create_collection(
        name="documents",
        metadata={"hnsw:space": "cosine"},
    )
    return {"message": "All documents cleared."}
