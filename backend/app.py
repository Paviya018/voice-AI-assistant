import os
import re
import uuid
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import fitz  # PyMuPDF
from docx import Document

# Try importing Coqui TTS (optional)
COQUI_AVAILABLE = False
try:
    from TTS.api import TTS
    COQUI_AVAILABLE = True
except Exception:
    COQUI_AVAILABLE = False

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except Exception:
    GTTS_AVAILABLE = False

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
TMP_DIR = BASE_DIR / "tmp"
TMP_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Humanized Multilingual Doc→Voice (Local TTS)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/tmp", StaticFiles(directory=str(TMP_DIR)), name="tmp")


# ---------------- Text extraction ----------------
def extract_text_from_pdf_bytes(b: bytes) -> str:
    text_parts = []
    with fitz.open(stream=b, filetype="pdf") as doc:
        for page in doc:
            txt = page.get_text()
            if txt:
                text_parts.append(txt)
    return "\n".join(text_parts)


def extract_text_from_docx_bytes(b: bytes) -> str:
    tmp_path = TMP_DIR / f"temp_{uuid.uuid4().hex}.docx"
    tmp_path.write_bytes(b)
    doc = Document(tmp_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text]
    tmp_path.unlink(missing_ok=True)
    return "\n".join(paragraphs)


def extract_text_from_txt_bytes(b: bytes) -> str:
    try:
        return b.decode("utf-8", errors="ignore")
    except:
        return b.decode("latin-1", errors="ignore")


# ---------------- Summarizer ----------------
def rule_based_summary(text: str, max_words: int = 220) -> str:
    text = re.sub(r'\s+', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)
    keywords = ["purpose", "goal", "result", "conclusion", "find", "show", "study",
                "research", "important", "significant", "suggest", "improve", "develop", "main", "aim"]
    selected = [s for s in sentences if any(k in s.lower() for k in keywords)]
    if len(selected) < 4:
        selected = sentences[:6]
    summary = " ".join(selected)
    words = summary.split()
    if len(words) > max_words:
        summary = " ".join(words[:max_words]) + "..."
    return summary


# ---------------- Humanization ----------------
STYLE_INTRO = {
    "English": ("Hey there! I’ll tell you the main points: ", "And that’s the main idea — hope it helps!"),
    "Tamil": ("Hey da! Ippo naan unga kitte short-a sollren: ", "Idha dha main idea da 😄 Ippo unakku purinjurukkum la da?"),
    "Hindi": ("Arre yaar! Sun, main tujhe short mein batata hoon: ", "Bas yehi main idea tha bhai 😄"),
    "Spanish": ("¡Oye! Te cuento rápido: ", "¡Y eso es todo, amigo!"),
    "French": ("Salut! Voici les points principaux: ", "Et voilà l'idée principale 😄"),
    "German": ("Hey! Ich erzähle dir die Hauptpunkte: ", "Das war die Hauptidee 😄"),
}


def humanize_style(summary: str, language: str) -> str:
    intro, outro = STYLE_INTRO.get(language, STYLE_INTRO["English"])
    return f"{intro}{summary} {outro}"


def mix_language_flavor(summary: str, language: str) -> str:
    s = summary
    if language == "Tamil":
        s = re.sub(r'\bimportant\b', 'mukkiyam', s, flags=re.I)
        s += " 😄 Ippo unakku purinjurukkum la da?"
    elif language == "Hindi":
        s = re.sub(r'\bimportant\b', 'bahut zaroori', s, flags=re.I)
        s += " 😄 Samjha na?"
    elif language == "Spanish":
        s = re.sub(r'\bimportant\b', 'importante', s, flags=re.I)
        s += " 😄 ¡Espero que te guste!"
    return s


# ---------------- TTS ----------------
COQUI_CACHE = {}


def coqui_generate(text: str, model_name: str, speaker: Optional[str], out_path: str):
    if model_name not in COQUI_CACHE:
        COQUI_CACHE[model_name] = TTS(model_name=model_name, progress_bar=False, gpu=False)
    tts = COQUI_CACHE[model_name]
    tts.tts_to_file(text=text, file_path=out_path, speaker=speaker)


def gtts_generate(text: str, lang: str, out_path: str):
    t = gTTS(text=text, lang=lang, slow=False)
    t.save(out_path)


# ---------------- API ----------------
@app.get("/", response_class=HTMLResponse)
async def home():
    return "<h3>✅ Backend running successfully.</h3>"


@app.post("/process")
async def process(
    file: UploadFile = File(...),
    language: str = Form("English"),
):
    try:
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith(".pdf"):
            text = extract_text_from_pdf_bytes(content)
        elif filename.endswith(".docx"):
            text = extract_text_from_docx_bytes(content)
        else:
            text = extract_text_from_txt_bytes(content)

        if not text.strip():
            return JSONResponse({"error": "No readable text found"}, status_code=400)

        base_summary = rule_based_summary(text)
        human_summary = humanize_style(base_summary, language)
        flavored = mix_language_flavor(human_summary, language)

        audio_filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = TMP_DIR / audio_filename

        lang_map = {
            "English": "en", "Tamil": "en", "Hindi": "hi", "Telugu": "te", "Kannada": "kn",
            "Malayalam": "ml", "Bengali": "bn", "Marathi": "mr", "Gujarati": "gu", "Punjabi": "pa",
            "Urdu": "ur", "Spanish": "es", "French": "fr", "German": "de"
        }
        lang_code = lang_map.get(language, "en")

        if GTTS_AVAILABLE:
            gtts_generate(flavored, lang=lang_code, out_path=str(audio_path))
        else:
            raise RuntimeError("No TTS engine available")

        return JSONResponse({
            "summary": flavored,
            "audio_url": f"/tmp/{audio_filename}"
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
