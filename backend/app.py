from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# LOAD KEYS
load_dotenv()
print("GEMINI KEY LOADED:", os.getenv("GEMINI_API_KEY", "MISSING!!!")[:15] + "...")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GEMINI SETUP - THIS IS THE NEW NAME (NOV 2025)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# EMBEDDING MODEL
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# PINECONE SETUP
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "jarvis-memory"

if index_name not in [i["name"] for i in pc.list_indexes()]:
    print("Creating new Pinecone index...")
    pc.create_index(
        name=index_name,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
    import time; time.sleep(5)

index = pc.Index(index_name)
print("Connected to Pinecone index: jarvis-memory")

def embed(text: str):
    return embedder.encode(text).tolist()

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    message = data.get("message", "").strip()
    if not message:
        return {"response": "Say something, boss!"}

    # Search memory
    results = index.query(vector=embed(message), top_k=3, include_metadata=True)
    context = "\n".join([m["metadata"].get("text", "") for m in results["matches"]]) if results["matches"] else ""

    # Build prompt
    prompt = f"""You are Jarvis, a super helpful and friendly AI assistant.
Previous conversation:
{context}

User: {message}
Jarvis (be concise and fun):"""

    # CALL GEMINI - NEW NAME 2025
    model = genai.GenerativeModel("gemini-2.5-pro")
    response = model.generate_content(prompt)
    reply = response.text.strip()

    # Save to memory
    index.upsert([{
        "id": str(hash(message + reply)),
        "values": embed(message + reply),
        "metadata": {"text": f"User: {message}\nJarvis: {reply}"}
    }])

    return {"response": reply}