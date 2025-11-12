from fastapi import FastAPI, Request, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
import json
import io
from PyPDF2 import PdfReader

# === LOAD ENV & KEYS ===
load_dotenv()
print("GEMINI KEY LOADED:", os.getenv("GEMINI_API_KEY", "MISSING!!!")[:15] + "...")

app = FastAPI()

# === CORS ===

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === GEMINI SETUP ===
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# === EMBEDDING MODEL ===
embedder = SentenceTransformer("all-MiniLM-L6-v2")

def embed(text: str):
    return embedder.encode(text).tolist()

# === PINECONE SETUP ===
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

# === MAIN CHAT ENDPOINT ===
@app.post("/chat")
async def chat(
    message: str = Form(""),
    chat_history: str = Form(""),
    files: List[UploadFile] = File([])
):
    user_message = message.strip()
    file_content = ""
    file_names = []

    # === READ UPLOADED FILES (PDF & TXT) ===
    for file in files:
        content = await file.read()
        filename = file.filename
        file_names.append(filename)
        try:
            if filename.lower().endswith(".pdf"):
                reader = PdfReader(io.BytesIO(content))
                text = "\n".join([page.extract_text() or "" for page in reader.pages])
            elif filename.lower().endswith(".txt"):
                text = content.decode("utf-8")
            else:
                text = f"[Unsupported file: {filename}]"
        except Exception as e:
            text = f"[Error reading {filename}: {str(e)}]"

        if text.strip():
            file_content += f"\n--- {filename} ---\n{text}\n"

    if not user_message and not file_content:
        return {"response": "Say something or upload a file, boss!"}

    # === SEARCH MEMORY ===
    query_text = user_message + file_content + chat_history
    results = index.query(vector=embed(query_text), top_k=5, include_metadata=True)
    pinecone_context = "\n".join([m["metadata"].get("text", "") for m in results["matches"]]) if results["matches"] else ""

    # === PERSONALITY PROMPT: FUN, FRIENDLY, "BOSS!" ===
    prompt = f"""You are Jarvis, a super helpful, friendly, and fun AI study buddy.
You call the user "boss" — like Tony Stark's AI.
Be concise, witty, and a little playful — but always helpful.
Use emojis sometimes (Brain, Rocket, Books, Light Bulb).

Recent chat:
{chat_history}

Relevant memory:
{pinecone_context}

File content (if any):
{file_content}

User: {user_message}
Jarvis (be fun, concise, and helpful):"""

    # === CALL GEMINI 2.0 FLASH ===
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        reply = response.text.strip()
    except Exception as e:
        reply = f"Gemini error: {str(e)}"

    # === SAVE TO MEMORY ===
    index.upsert([{
        "id": str(hash(user_message + reply)),
        "values": embed(user_message + reply),
        "metadata": {"text": f"User: {user_message}\nJarvis: {reply}"}
    }])

    return {"response": reply}
