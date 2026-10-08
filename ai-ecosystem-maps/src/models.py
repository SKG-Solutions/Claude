"""Map 2 content: choosing a model by task and complexity.

Model names checked on 8 October 2026. Anthropic pages were read directly;
OpenAI and Google pages were blocked from the research environment, so those
names rest on dated press coverage and Google's developer docs (see SOURCES).
"""

INTRO = ("Pick the tier before the provider. How complex the task is, what a mistake would cost, "
         "how much material the model must read, how fast it has to answer and what it costs at "
         "volume decide the tier. Every major provider offers a model at each tier.")

TIERS = [
    {
        "id": "fast", "name": "Fast", "kicker": "High-volume",
        "use": "Clear, repeatable tasks with a known right answer.",
        "tasks": [
            "Classify 5,000 pieces of event feedback by theme",
            "Extract names, dates and companies from registration forms",
            "Tag CRM leads by industry and seniority",
            "Rewrite 200 session headlines to a character limit",
            "Translate routine attendee emails",
            "Turn meeting transcripts into action lists",
        ],
        "models": [
            ("openai", "OpenAI", "GPT-6 Luna", "Released 22 Sep 2026"),
            ("claude", "Anthropic", "Claude Haiku 5.5", "Released 7 Oct 2026"),
            ("gemini", "Google", "Gemini 3.5 Flash-Lite", "Stable since 21 Jul 2026"),
        ],
        "brief": "Give it a template and two or three worked examples. Spot-check a sample of the output.",
        "speed": 3, "cost": 1,
    },
    {
        "id": "balanced", "name": "Balanced", "kicker": "Everyday",
        "use": "Work that needs context and some judgment.",
        "tasks": [
            "Draft a landing page from a brief",
            "Summarise a research pack",
            "Create an agenda and run of show",
            "Outline a presentation",
            "Compare three vendor proposals",
        ],
        "models": [
            ("openai", "OpenAI", "GPT-6.1 Sol", "Released 29 Sep 2026"),
            ("claude", "Anthropic", "Claude Sonnet 5.5", "Released 28 Sep 2026"),
            ("gemini", "Google", "Gemini 3.8 Flash", "Stable since 2 Sep 2026"),
        ],
        "brief": "Give it context, examples and the audience. A person reviews it before it goes out.",
        "speed": 2, "cost": 2,
    },
    {
        "id": "deep", "name": "Deep", "kicker": "Complex",
        "use": "Ambiguity, many sources, conflicting constraints or consequential decisions.",
        "tasks": [
            "Synthesise many sources into a point of view",
            "Design a multi-track event strategy",
            "Build a research plan",
            "Critique a full presentation",
        ],
        "models": [
            ("openai", "OpenAI", "GPT-6 Astra", "Released 3–4 Sep 2026"),
            ("claude", "Anthropic", "Claude Opus 5.5", "Released 22 Sep 2026; Claude Fable 5.1 sits above it"),
            ("gemini", "Google", "Gemini 3.1 Pro or Gemini 3 Deep Think",
             "Deep Think: Google AI Ultra; API in early access"),
        ],
        "brief": "Ask for its reasoning, assumptions and evidence. A person makes the final call.",
        "speed": 1, "cost": 3,
    },
]

FACTORS = [
    ("Complexity", "More steps, ambiguity or trade-offs", "deep"),
    ("Risk", "A costly or public mistake: go deeper and add human review", "deep"),
    ("Context", "Long documents or many sources: add retrieval and a large context window", "deep"),
    ("Speed", "Live or real-time use, or thousands of items", "fast"),
    ("Cost", "At volume, small per-task savings add up; test quality first", "fast"),
]

ROUTES = [
    ("Repeatable task", "Fast model and a template", [], "fast"),
    ("Task needs interpretation", "Balanced model with examples and context", [], "balanced"),
    ("Many sources or trade-offs", "Deep model; ask for its reasoning and evidence", [], "deep"),
    ("Needs current facts", "Add web or document retrieval. Don't rely on the model's memory alone.", [10, 11], None),
    ("Needs a media asset", "Route to a specialist image, video, voice or music tool", [2, 4, 6, 7], None),
    ("Needs a real-world action", "Use an authorised workflow or agent, then verify the result", [17], None),
]

WATCH = [
    "Gemini 4 Argon was announced on 30 September 2026 with access limited to partners. It is not shown until it is generally available.",
    "Gemini 3.5 Pro was announced at I/O in May 2026 but has not shipped; Gemini 3.1 Pro remains Google's current Pro model.",
    "OpenAI released GPT-6.1 Sol on 29 September 2026, a week after GPT-6 Sol. It is available in ChatGPT Work, Codex and the API.",
]
