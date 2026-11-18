import type { VideoSession } from "./types";

// An authored walkthrough fixture, independent of live model calls.
export const walkthrough: VideoSession = {
  id: "walkthrough-field-notes",
  title: "Field notes: the art of noticing",
  language: "english",
  source_kind: "walkthrough",
  source_name: "Field notes",
  created_at: "2026-11-18T08:00:00.000Z",
  duration: 5,
  source_url: "/media/field-notes.mp4",
  summary:
    "Good field notes begin with observation. The lesson uses flowers as a starting point: look for changes in light, movement, and texture before deciding what the scene means. Separate what you can see from what you assume, and keep a record you can return to.\n\nThe practice is repeatable: choose one detail, describe it precisely, then compare it with a second observation. Small, specific notes make a stronger record than a general impression.",
  transcript:
    "[00:00] Speaker: Good field notes begin with observation. Before you describe what a scene means, write down what you can actually see.\n\n[00:01] Speaker: Look at these flowers. Notice the movement of the petals, the direction of the light, and the difference between the foreground and the background.\n\n[00:02] Speaker: Choose one detail. Describe its colour, shape, or movement in a short sentence. A precise description is more useful than a general impression.\n\n[00:03] Speaker: Separate observation from interpretation. If you think the breeze is getting stronger, record the movement you saw rather than treating your assumption as a fact.\n\n[00:04] Speaker: Make a second observation, compare the two notes, and keep both. The next exercise is to write three observations about a scene you see today.",
  action_items:
    "1. Choose a scene and write three specific observations.\n2. Keep observations separate from interpretations.\n3. Return to the scene and compare your second set of notes.",
  key_decisions:
    "1. Record visible details before making an interpretation.\n2. Keep both sets of notes so changes can be compared.",
  open_questions:
    "1. Which details change when you observe the same scene again?\n2. What assumptions did you make before recording the details?",
};

export const suggestedQuestions = [
  "What are the main takeaways?",
  "What should I do next?",
  "How do I separate observation from interpretation?",
];

export function answerWalkthrough(question: string): { answer: string; citation: string } {
  const q = question.toLowerCase();
  if (/action|next|exercise|task|do /u.test(q)) {
    return {
      answer: "Choose a scene and write three specific observations about its colour, shape, or movement. Keep your assumptions separate. Return to the scene, make a second set of notes, and compare the two.",
      citation: "00:04 · Next exercise",
    };
  }
  if (/separate|interpret|assum|fact|difference/u.test(q)) {
    return {
      answer: "Write down what you can actually see before describing what it means. For example, record the petals moving more strongly rather than assuming the breeze has increased. Keep interpretations in a separate note.",
      citation: "00:03 · Observation and interpretation",
    };
  }
  if (/takeaway|summari|summary|main|about|learn|point/u.test(q)) {
    return {
      answer: "Three things to keep: observe before interpreting, describe one detail precisely, and compare observations over time. The lesson recommends keeping both sets of notes so you can see what changed.",
      citation: "00:00–00:04 · Field notes",
    };
  }
  if (/flower|light|petal|colour|color|scene|notice|detail|movement/u.test(q)) {
    return {
      answer: "The speaker asks you to notice the petals’ movement, the direction of the light, and the difference between the foreground and background. Then choose one detail and describe its colour, shape, or movement in a short sentence.",
      citation: "00:01–00:02 · Looking at details",
    };
  }
  return {
    answer: "I couldn’t find that information in this walkthrough transcript. You can ask about the observations, the exercise, or the main takeaways.",
    citation: "Based on the walkthrough transcript",
  };
}
