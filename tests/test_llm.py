import os
import unittest
from unittest.mock import patch

import core.llm as llm


class ModelConfigurationTests(unittest.TestCase):
    def test_custom_provider_applies_key_model_and_base_url_together(self):
        with (
            patch.dict(os.environ, {
                "LLM_API_KEY": "custom-fixture",
                "LLM_MODEL": "my-open-model",
                "LLM_BASE_URL": "https://provider.example/v1",
                "ROUTIX_API_KEY": "unused-legacy-key",
            }, clear=True),
            patch.object(llm, "ChatOpenAI") as client,
        ):
            self.assertIs(llm.get_llm(), client.return_value)
        client.assert_called_once_with(
            model="my-open-model", api_key="custom-fixture",
            base_url="https://provider.example/v1", temperature=0.3,
        )

    def test_existing_deepseek_configuration_is_preserved_without_generic_settings(self):
        with (
            patch.dict(os.environ, {"ROUTIX_API_KEY": "legacy-fixture"}, clear=True),
            patch.object(llm, "ChatOpenAI") as client,
        ):
            llm.get_llm()
        client.assert_called_once_with(
            model="deepseek-v4-flash-0731", api_key="legacy-fixture",
            base_url="https://routixai.online/v1", temperature=0.3,
        )

    def test_incomplete_generic_config_never_sends_key_to_legacy_endpoint(self):
        for missing in ("LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"):
            environment = {
                "LLM_API_KEY": "custom-fixture",
                "LLM_MODEL": "custom-model",
                "LLM_BASE_URL": "https://provider.example/v1",
            }
            environment.pop(missing)
            with (
                self.subTest(missing=missing),
                patch.dict(os.environ, environment, clear=True),
                patch.object(llm, "ChatOpenAI") as client,
                self.assertRaisesRegex(ValueError, "together"),
            ):
                llm.get_llm()
            client.assert_not_called()

    def test_actions_use_the_same_factory_as_summary_and_chat(self):
        import core.extractor as extractor
        import core.summarizer as summarizer
        import core.rag_engine as rag_engine
        self.assertIs(extractor.get_llm, llm.get_llm)
        self.assertIs(summarizer.get_llm, llm.get_llm)
        self.assertIs(rag_engine.get_llm, llm.get_llm)
