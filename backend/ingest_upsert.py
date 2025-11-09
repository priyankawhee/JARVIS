# ingest_upsert.py
import os, glob
from dotenv import load_dotenv
load_dotenv()
import pinecone
from sentence_transformers import SentenceTransformer
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV")
INDEX_NAME = os.getenv("INDEX_NAME","jarvis-index")

pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# create index if missing
dim = embed_model.get_sentence_embedding_dimension()
if INDEX_NAME not in pinecone.list_indexes():
    pinecone.create_index(INDEX_NAME, dimension=dim)
index = pinecone.Index(INDEX_NAME)

def chunk_text(text, max_chars=1000):
    chunks=[]
    start=0
    while start < len(text):
        chunks.append(text[start:start+max_chars])
        start += max_chars
    return chunks

def embed_text_local(text):
    return embed_model.encode(text).tolist()

def upsert_file(fp):
    with open(fp,'r',encoding='utf-8') as f:
        txt=f.read()
    chunks = chunk_text(txt)
    items=[]
    for i,c in enumerate(chunks):
        emb = embed_text_local(c)
        meta = {"source": os.path.basename(fp), "chunk": i, "text": c[:1000]}
        items.append((f"{os.path.basename(fp)}_{i}", emb, meta))
    index.upsert(vectors=items)
    print("Upserted", len(chunks), "chunks from", fp)

if __name__=="__main__":
    for f in glob.glob("../docs/*.txt"):
        upsert_file(f)
