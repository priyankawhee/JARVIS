from pinecone import Pinecone
import os
from dotenv import load_dotenv
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pc.delete_index("jarvis-memory")
print("")
print("JARVIS OLD INDEX DELETED SUCCESSFULLY!")
print("You can now close this window and restart your backend")
print("")
input("Press Enter to exit...")