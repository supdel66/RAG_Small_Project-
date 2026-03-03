# 🤖 RAG Chatbot — FastAPI + Next.js + Ollama + ChromaDB

A fully local RAG chatbot. Upload PDFs, DOCX, or TXT files and chat with them.

## 🏗️ Architecture

```
User uploads file
      ↓
FastAPI extracts text → chunks it → embeds with nomic-embed-text → stores in ChromaDB
      ↓
User asks question
      ↓
FastAPI embeds question → finds top-5 similar chunks from ChromaDB
      ↓
Sends chunks as context to llama3.2:3b via Ollama → streams answer back
      ↓
Next.js displays streamed response with sources
```

## ✅ Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

## 🚀 Setup

### 1. Pull Ollama models
```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs at → http://localhost:8000
API docs at    → http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev1
```
Frontend runs at → http://localhost:3000

## 📁 Project Structure

```
rag-chatbot/
├── backend/
│   ├── main.py            # FastAPI app
│   ├── requirements.txt
│   └── chroma_db/         # Auto-created: persistent vector store
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.js    # Main page
    │   │   └── layout.js
    │   └── components/
    │       ├── FileUpload.js
    │       ├── ChatWindow.js
    │       └── DocumentList.js
    └── package.json
```

## 🔌 API Endpoints

| Method | Endpoint      | Description                    |
|--------|---------------|--------------------------------|
| GET    | /health       | Health check                   |
| POST   | /upload       | Upload & index a file          |
| POST   | /chat         | Ask a question (streaming)     |
| GET    | /documents    | List indexed files             |
| DELETE | /documents    | Clear all indexed documents    |

## ⚙️ Configuration (backend/main.py)

| Variable      | Default           | Description                    |
|---------------|-------------------|--------------------------------|
| EMBED_MODEL   | nomic-embed-text  | Ollama embedding model         |
| LLM_MODEL     | llama3.2:3b       | Ollama LLM model               |
| CHUNK_SIZE    | 500               | Characters per chunk           |
| CHUNK_OVERLAP | 50                | Overlap between chunks         |

## 🔄 Swap the LLM model

Edit `LLM_MODEL` in `backend/main.py`:
- Faster/smaller: `llama3.2:1b`
- More capable: `llama3.1:8b`, `mistral:7b`
