from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String, default="Unknown")
    total_pages = Column(Integer)
    language = Column(String, default="English")
    file_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    start_page = Column(Integer)
    end_page = Column(Integer)
    summary_text = Column(Text)       # Markdown summary
    main_idea = Column(Text)          # Main idea
    key_concepts = Column(Text)       # Key concepts / points
    definitions = Column(Text)        # Definitions
    actionable_insights = Column(Text) # Actionable insights
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    front = Column(Text)              # Question or Concept
    back = Column(Text)               # Answer or Definition
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    difficulty = Column(String)       # Easy, Medium, Hard
    quiz_data = Column(Text)          # JSON string of questions (MCQs, True/False, Fill in the blanks)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    role = Column(String)             # user, assistant
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
