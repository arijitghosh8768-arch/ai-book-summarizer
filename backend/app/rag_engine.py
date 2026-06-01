import os
import json
import math
from openai import OpenAI
from dotenv import load_dotenv
from .document_proc import extract_text_range

# Load env variables
load_dotenv()

# Initialize OpenAI client with NVIDIA endpoint
api_key = os.getenv("NVIDIA_API_KEY")
client = None
if api_key:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

EMBEDDING_MODEL = "nvidia/embeddings-nv-embed-qa-4"
CHAT_MODEL = "meta/llama-3.1-8b-instruct"

# Chunk and embed files
from concurrent.futures import ThreadPoolExecutor

def get_embedding(text: str) -> list:
    """
    Get text embedding vector from NVIDIA embedding API.
    """
    if not client:
        return [0.0] * 1024 # Standard dimension for nvidia/embeddings-nv-embed-qa-4 is 1024
        
    try:
        # Standard OpenAI client syntax for embeddings
        response = client.embeddings.create(
            input=[text],
            model=EMBEDDING_MODEL,
            encoding_format="float"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        # Try fallback or return empty vector
        return [0.0] * 1024

def get_embeddings_batch(texts: list) -> list:
    """
    Get text embedding vectors in batch from NVIDIA embedding API.
    """
    if not client or not texts:
        return [[0.0] * 1024 for _ in texts]
        
    try:
        response = client.embeddings.create(
            input=texts,
            model=EMBEDDING_MODEL,
            encoding_format="float"
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error generating batch embeddings: {e}. Falling back to sequential.")
        # Fallback to sequential embedding generation
        return [get_embedding(t) for t in texts]

def index_book(file_path: str, book_id: int, total_pages: int) -> dict:
    """
    Extract pages, chunk them, embed in parallel batches, and store as a JSON vector file.
    Returns status info.
    """
    vector_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "vectors"))
    os.makedirs(vector_dir, exist_ok=True)
    index_path = os.path.join(vector_dir, f"book_{book_id}.json")
    
    if os.path.exists(index_path):
        return {"status": "already_indexed", "path": index_path}
    
    # Extract text from all pages
    chunks = []
    for page_num in range(1, total_pages + 1):
        try:
            page_text = extract_text_range(file_path, page_num, page_num)
            if len(page_text.strip()) > 50:
                chunks.append({
                    "page": page_num,
                    "text": page_text
                })
        except Exception as e:
            print(f"Failed to extract page {page_num}: {e}")
            
    # Process chunks in batches of 16 using ThreadPoolExecutor for concurrent requests
    batch_size = 16
    batches = [chunks[i:i + batch_size] for i in range(0, len(chunks), batch_size)]
    indexed_data = []

    def process_batch(batch):
        texts = [chunk["text"] for chunk in batch]
        embeddings = get_embeddings_batch(texts)
        
        batch_results = []
        for chunk, emb in zip(batch, embeddings):
            batch_results.append({
                "page": chunk["page"],
                "text": chunk["text"],
                "embedding": emb
            })
        return batch_results

    # Use a thread pool to execute batch API requests in parallel
    max_workers = min(8, max(1, len(batches)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_batch, b) for b in batches]
        for future in futures:
            try:
                indexed_data.extend(future.result())
            except Exception as e:
                print(f"Error processing batch: {e}")

    # Sort indexed data by page number to keep everything in order
    indexed_data.sort(key=lambda x: x["page"])
        
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(indexed_data, f)
        
    return {"status": "indexed", "path": index_path, "chunks_count": len(indexed_data)}

def cosine_similarity(a: list, b: list) -> float:
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def retrieve_context(query: str, book_id: int, top_k: int = 3) -> str:
    """
    Retrieve top K matching page text chunks from the book's vector index.
    """
    vector_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "vectors"))
    index_path = os.path.join(vector_dir, f"book_{book_id}.json")
    
    if not os.path.exists(index_path):
        return ""
        
    with open(index_path, "r", encoding="utf-8") as f:
        indexed_data = json.load(f)
        
    query_emb = get_embedding(query)
    
    scored_chunks = []
    for item in indexed_data:
        score = cosine_similarity(query_emb, item["embedding"])
        scored_chunks.append((score, item))
        
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # Format context
    top_matches = scored_chunks[:top_k]
    context_parts = []
    for score, item in top_matches:
        context_parts.append(f"[Source: Page {item['page']} (Similarity: {score:.2f})]\n{item['text']}")
        
    return "\n\n---\n\n".join(context_parts)

def chat_with_book(query: str, book_id: int, history: list = None) -> str:
    """
    RAG chat with the book using Llama 3.1 on NVIDIA NIM.
    """
    if not client:
        return "Error: NVIDIA API Key is not set. Cannot run document chat."

    context = retrieve_context(query, book_id)
    
    # Build conversational context
    history_str = ""
    if history:
        for msg in history[-5:]:
            role_label = "User" if msg.role == "user" else "AI"
            history_str += f"{role_label}: {msg.content}\n"
            
    prompt = f"""
    You are an expert AI Study Assistant.
    You have access to excerpts from the student's study material/book.
    Answer the user's question accurately using ONLY the provided context and conversation history.
    If the context does not contain the answer, tell the user that the information is not in the study materials, but do not make things up.
    
    Excerpts from the book:
    \"\"\"
    {context}
    \"\"\"
    
    Conversation History:
    {history_str}
    
    User: {query}
    AI:
    """
    try:
        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error in chat_with_book: {e}")
        return f"Sorry, I encountered an error while processing your question: {str(e)}"
