import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from langchain_core.runnables import RunnableLambda


class OutputLanguageTests(unittest.TestCase):
    @staticmethod
    def load_module(name):
        # Exercise real prompt/runnable composition without providers or model loads.
        dependencies = {}
        for dependency, attributes in {
            "core.llm": ("get_llm",),
            "langchain_openai": ("ChatOpenAI",),
            "langchain_mistralai": ("ChatMistralAI",),
            "langchain_text_splitters": ("RecursiveCharacterTextSplitter",),
            "core.vector_stores": ("build_vector_store", "load_vector_store", "get_retriever"),
            "core.transcript_search": ("build_retriever",),
        }.items():
            module = types.ModuleType(dependency)
            for attribute in attributes:
                setattr(module, attribute, MagicMock())
            dependencies[dependency] = module
        source = Path(__file__).resolve().parents[1] / "core" / f"{name}.py"
        spec = importlib.util.spec_from_file_location(f"{name}_under_test", source)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, dependencies):
            spec.loader.exec_module(module)
        return module

    def setUp(self):
        self.prompts = []

        def capture(prompt):
            self.prompts.append(prompt.to_messages()[0].content)
            return "Fixture response."

        self.llm = RunnableLambda(capture)

    def assert_english_prompts(self, count):
        self.assertEqual(len(self.prompts), count)
        for prompt in self.prompts:
            self.assertIn("English", prompt)

    def test_partial_and_combined_summary_require_english(self):
        module = self.load_module("summarizer")
        with (
            patch.object(module, "get_llm", return_value=self.llm),
            patch.object(module, "split_transcript", return_value=["Ringkasan rapat."]),
        ):
            self.assertEqual(module.summarize("Ringkasan rapat."), "Fixture response.")
        self.assert_english_prompts(2)

    def test_title_requires_english(self):
        module = self.load_module("summarizer")
        with patch.object(module, "get_llm", return_value=self.llm):
            self.assertEqual(module.generate_title("Ringkasan rapat."), "Fixture response.")
        self.assert_english_prompts(1)

    def test_actions_decisions_and_questions_require_english(self):
        module = self.load_module("extractor")
        with patch.object(module, "get_llm", return_value=self.llm):
            for extract in (module.extract_action_items, module.extract_key_decisions, module.extract_questions):
                self.assertEqual(extract("Ringkasan rapat."), "Fixture response.")
        self.assert_english_prompts(3)

    def test_chat_defaults_to_english_and_allows_explicit_language_requests(self):
        module = self.load_module("rag_engine")
        retriever = RunnableLambda(lambda question: [])
        with (
            patch.object(module, "get_llm", return_value=self.llm),
            patch.object(module, "build_retriever", return_value=retriever),
        ):
            chain = module.build_rag_chain("Ringkasan rapat.")
            self.assertEqual(chain.invoke("What are the takeaways?"), "Fixture response.")
        self.assert_english_prompts(1)
        self.assertIn("unless the user explicitly requests another language", self.prompts[0])


if __name__ == "__main__":
    unittest.main()
