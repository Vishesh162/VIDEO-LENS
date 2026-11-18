"""Small, session-only lexical retriever for CPU hosting; no model downloads."""

import math
import re
from collections import Counter

from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda


def tokens(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def build_retriever(transcript: str, k: int = 4):
    words = transcript.split()
    documents = [
        Document(page_content=" ".join(words[start:start + 220]), metadata={"chunk_index": index})
        for index, start in enumerate(range(0, len(words), 180))
    ]
    frequencies = [Counter(tokens(document.page_content)) for document in documents]
    document_counts = Counter(token for frequency in frequencies for token in frequency)

    def retrieve(question: str):
        query = set(tokens(question))
        scores = [
            sum(
                (1 + math.log(frequency[token])) * math.log(1 + len(documents) / document_counts[token])
                for token in query if frequency[token]
            )
            for frequency in frequencies
        ]
        # Stable ordering keeps small transcripts and tied matches readable.
        ranked = sorted(range(len(documents)), key=lambda index: scores[index], reverse=True)[:k]
        return [documents[index] for index in sorted(ranked)]

    return RunnableLambda(retrieve)
