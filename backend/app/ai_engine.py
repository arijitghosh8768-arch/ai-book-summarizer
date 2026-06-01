import os
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Initialize AsyncOpenAI client with NVIDIA endpoint
api_key = os.getenv("NVIDIA_API_KEY")
aclient = None
if api_key:
    aclient = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )
else:
    print("Warning: NVIDIA_API_KEY environment variable is not set.")

DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"

def chunk_text(text: str, max_words: int = 1500) -> list[str]:
    """
    Split the text into chunks of at most max_words words.
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_word_count = 0
    for word in words:
        current_chunk.append(word)
        current_word_count += 1
        if current_word_count >= max_words:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_word_count = 0
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

async def summarize_chunk(chunk: str) -> str:
    """
    Map Phase: Summarize a single chunk of text.
    """
    if not aclient:
        return "Error: NVIDIA API Key is not set."

    prompt = f"""
    You are a reading assistant. Summarize the following section of a book or document.
    Provide a concise, detailed bullet-point summary capturing all key points, facts, and definitions.
    Do not extrapolate or assume anything not directly mentioned in the text.

    Text:
    \"\"\"{chunk}\"\"\"
    """
    try:
        completion = await aclient.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in summarize_chunk: {e}")
        return f"[Error summarizing chunk: {str(e)}]"

async def generate_summary(text: str) -> dict:
    """
    Summarize a text block using Llama 3.1 on NVIDIA NIM using Map-Reduce.
    """
    if not aclient:
        return {
            "summary": "Error: NVIDIA API Key is not set.",
            "main_idea": "Please set NVIDIA_API_KEY in the .env file.",
            "key_concepts": "- Missing API Key",
            "definitions": "- Term: Definition",
            "actionable_insights": "- Actionable Insight"
        }

    chunks = chunk_text(text, max_words=1500)
    
    # Map Phase: process chunks in parallel
    tasks = [summarize_chunk(chunk) for chunk in chunks]
    chunk_summaries = await asyncio.gather(*tasks)
    combined_summary_text = "\n\n".join(chunk_summaries)

    # Reduce Phase: Synthesize combined summaries
    prompt = f"""
    Analyze the following combined text summaries from a book or document.
    Provide your response in a structured format containing exactly these five sections:
    1. Summary (A comprehensive overview of the text)
    2. Main Idea (The primary takeaway or argument)
    3. Key Concepts (Bullet list of core concepts explained)
    4. Definitions (Any key terms and their meanings defined in the text)
    5. Actionable Insights (How the reader can apply this knowledge)

    Ensure the response is detailed and uses ONLY the facts provided. Do not extrapolate.
    Return the response as a JSON object with keys: "summary", "main_idea", "key_concepts", "definitions", "actionable_insights".
    Use clean Markdown formatting within the values of the JSON.

    Combined Summaries:
    \"\"\"{combined_summary_text}\"\"\"
    """
    try:
        completion = await aclient.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error in generate_summary: {e}")
        # Try fallback raw JSON request
        try:
            completion = await aclient.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[{"role": "user", "content": prompt + "\nRespond with raw JSON only."}]
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e2:
            return {
                "summary": "Error generating summary. Please check your NVIDIA API configuration.",
                "main_idea": f"Failed due to error: {str(e2)}",
                "key_concepts": "- Concept 1\n- Concept 2",
                "definitions": "- Term: Definition",
                "actionable_insights": "- Insight 1"
            }

async def generate_flashcards(text: str) -> list:
    """
    Generate a list of flashcards using Llama 3.1 on NVIDIA NIM.
    """
    if not aclient:
        return [{"front": "Error", "back": "NVIDIA_API_KEY is not set"}]

    prompt = f"""
    Generate at least 5 study flashcards based on the following text.
    Each flashcard should target an important term, definition, formula, or concept.
    Ensure front and back are clear and concise.

    Return the response as a JSON array of objects, where each object has:
    - "front": The question, term, or prompt
    - "back": The answer, explanation, or definition

    Text:
    \"\"\"{text}\"\"\"
    """
    try:
        completion = await aclient.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        data = json.loads(completion.choices[0].message.content)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "flashcards" in data:
            return data["flashcards"]
        return [data]
    except Exception as e:
        print(f"Error in generate_flashcards: {e}")
        return [
            {"front": "What is the primary topic of the text?", "back": "Please check your NVIDIA API configuration."}
        ]

async def generate_quiz(text: str, difficulty: str = "Medium", num_questions: int = 5) -> list:
    """
    Generate a quiz using Llama 3.1 on NVIDIA NIM.
    """
    if not aclient:
        return []

    prompt = f"""
    Generate a {num_questions}-question quiz at "{difficulty}" difficulty based on the following text.
    Include a mix of MCQs, True/False, and Fill in the Blanks.
    For MCQs, provide 4 options.
    For True/False, options must be "True" and "False".
    For Fill in the Blanks, the correct answer should be a short word or phrase.

    Return the response as a JSON array of objects, where each object has:
    - "type": either "mcq", "true_false", or "fill_blank"
    - "question": the question string
    - "options": list of strings (only for MCQ or true_false; null/empty for fill_blank)
    - "correct_answer": the exact correct answer string matching one of the options or the blank value
    - "explanation": a brief explanation of why this answer is correct

    Text:
    \"\"\"{text}\"\"\"
    """
    try:
        completion = await aclient.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        data = json.loads(completion.choices[0].message.content)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "questions" in data:
            return data["questions"]
        return []
    except Exception as e:
        print(f"Error in generate_quiz: {e}")
        return []

async def translate_content(text: str, target_language: str) -> str:
    """
    Translate content to target language using Llama 3.1 on NVIDIA NIM.
    """
    if not aclient or not target_language or target_language.lower() == "english":
        return text
        
    prompt = f"""
    Translate the following text into {target_language}.
    Maintain all original markdown formatting, headers, list styles, and bold text exactly.
    Only translate the actual words and phrasing. Do not add comments or annotations.

    Text:
    \"\"\"{text}\"\"\"
    """
    try:
        completion = await aclient.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error in translate_content: {e}")
        return f"[Translation Error: {str(e)}]\n\n{text}"
