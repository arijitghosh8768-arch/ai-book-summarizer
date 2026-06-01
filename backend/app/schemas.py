from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class BookBase(BaseModel):
    title: str
    author: Optional[str] = "Unknown"
    total_pages: int
    language: Optional[str] = "English"

class BookCreate(BookBase):
    file_path: str

class BookResponse(BookBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SummaryRequest(BaseModel):
    start_page: int
    end_page: int
    target_language: Optional[str] = None # For translation on the fly if needed

class SummaryResponse(BaseModel):
    id: int
    book_id: int
    start_page: int
    end_page: int
    summary_text: str
    main_idea: str
    key_concepts: str
    definitions: str
    actionable_insights: str
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardBase(BaseModel):
    front: str
    back: str

class FlashcardResponse(FlashcardBase):
    id: int
    book_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuizRequest(BaseModel):
    difficulty: str = "Medium" # Easy, Medium, Hard
    num_questions: int = 5

class QuizQuestion(BaseModel):
    type: str # mcq, true_false, fill_blank
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None

class QuizResponse(BaseModel):
    id: int
    book_id: int
    difficulty: str
    questions: List[QuizQuestion]
    created_at: datetime

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
