import fitz  # PyMuPDF
import os

def extract_pdf_metadata(file_path: str):
    """
    Extract metadata from a PDF file using PyMuPDF.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    doc = fitz.open(file_path)
    metadata = doc.metadata
    
    # Try to extract title, author, language
    title = metadata.get("title", "")
    author = metadata.get("author", "")
    
    # Clean fallback if empty
    if not title or title.strip() == "":
        title = os.path.basename(file_path).rsplit(".", 1)[0].replace("_", " ").title()
    if not author or author.strip() == "":
        author = "Unknown"
        
    total_pages = len(doc)
    
    # Simple language heuristic, default English
    language = "English"
    
    doc.close()
    
    return {
        "title": title,
        "author": author,
        "total_pages": total_pages,
        "language": language
    }

def extract_page_text(file_path: str, page_num: int) -> str:
    """
    Extract text of a single page (1-based index).
    """
    doc = fitz.open(file_path)
    if page_num < 1 or page_num > len(doc):
        doc.close()
        raise ValueError(f"Page number {page_num} out of range (1-{len(doc)})")
    
    page = doc.load_page(page_num - 1)  # 0-indexed in PyMuPDF
    text = page.get_text()
    doc.close()
    return text

def extract_text_range(file_path: str, start_page: int, end_page: int) -> str:
    """
    Extract text of a range of pages (1-based index, inclusive).
    """
    doc = fitz.open(file_path)
    total = len(doc)
    
    # Bounds check
    start = max(1, start_page)
    end = min(total, end_page)
    
    extracted_text = []
    for i in range(start - 1, end):
        page = doc.load_page(i)
        extracted_text.append(f"--- PAGE {i + 1} ---\n" + page.get_text())
        
    doc.close()
    return "\n\n".join(extracted_text)
