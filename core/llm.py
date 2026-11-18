import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

def get_llm():
    return ChatOpenAI(
        model="deepseek-v4-flash-0731",
        api_key=os.getenv("ROUTIX_API_KEY"),
        base_url="https://routixai.online/v1",
        temperature=0.3,
    )