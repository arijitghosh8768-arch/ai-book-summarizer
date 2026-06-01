# AI Study Companion

The **AI Study Companion** is a full-stack application built to accelerate learning. Upload textbooks, lecture slides, or study papers to instantly generate chapter summaries, flashcards, interactive quizzes, and chat with your document using advanced Retrieval-Augmented Generation (RAG).

## 🛠️ Architecture & Components

### 1. FastAPI Backend (`backend/`)
- **Endpoints**: Handles document uploads, range-based summarization processing, flashcard/quiz generation, on-demand translation, and the conversational vector-retrieval RAG chat endpoint.
- **Document Processing**: Performs metadata extraction and text reading using `PyMuPDF` (fitz).
- **AI Engine**: Interfaces directly with the NVIDIA NIM API to produce JSON summaries, flashcards, quizzes, and target language translation using Llama-3.1-8b.
- **RAG Engine**: Extracts book pages, chunks text, generates vector embeddings using NVIDIA embeddings NIM (`nvidia/embeddings-nv-embed-qa-4`), indexes the vectors locally, and processes conversational user chat using dot-product cosine similarity.
- **Database**: Core database layers configuring SQLAlchemy with SQLite to persist uploaded books, generated summaries, flashcard sets, quizzes, and conversational history.

### 2. Next.js App Router Frontend (`frontend/`)
- **Styling**: Styled using modern dark-by-default colors, layout grids, HSL primary purple and pink glowing accents, customized thin scrollbars, and 3D card flips.
- **Portal & Upload**: Main portal landing page handling upload routing, drag & drop interface checking file formats, showing upload progress bars, and validating inputs.
- **Interactive Dashboard**: Core workspace including:
  - **Study Notes**: Modular view showing Executive Summaries, Takeaways, Concepts, Definitions, and Actionable Insights. Supports on-the-fly language translation.
  - **Flashcards**: Flipping cards with responsive slide controls.
  - **Practice Quiz**: Interactive testing, score reports, explanation logs, and answer tracking.
  - **Ask Document**: Contextual message panel using RAG.
  - **Export Notes**: Single-click downloading of generated study guides as Word Documents.

---

## 🚀 Quickstart Instructions

### Starting the FastAPI Backend
1. Make sure you have your API key set up in `backend/.env` or set it in your environment:
   ```powershell
   $env:NVIDIA_API_KEY="your-nvidia-api-key"
   ```
2. Navigate to the backend folder, create a virtual environment, and install dependencies:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\pip install -r requirements.txt
   ```
3. Run the development server:
   ```powershell
   .\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
   ```

### Starting the Next.js Frontend
1. Navigate to the frontend folder and install packages if needed (usually handled via npm):
   ```powershell
   cd frontend
   npm install
   ```
2. Start the development server:
   ```powershell
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
