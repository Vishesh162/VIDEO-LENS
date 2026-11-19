import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

def get_llm():
    settings = {
        name: (os.getenv(name) or "").strip()
        for name in ("LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL")
    }
    if any(settings.values()):
        if not all(settings.values()):
            raise ValueError("Set LLM_API_KEY, LLM_MODEL, and LLM_BASE_URL together for your OpenAI-compatible provider.")
        return ChatOpenAI(
            model=settings["LLM_MODEL"],
            api_key=settings["LLM_API_KEY"],
            base_url=settings["LLM_BASE_URL"],
            temperature=0.3,
        )
    # Keep existing installations working until they opt into generic settings.
    return ChatOpenAI(
        model="deepseek-v4-flash-0731",
        api_key=os.getenv("ROUTIX_API_KEY"),
        base_url="https://routixai.online/v1",
        temperature=0.3,
    )
