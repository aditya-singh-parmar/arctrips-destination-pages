# Town page data (scripts/town-page/data/<slug>.json)

One file per town. `build.py` renders every town page from these files with one template
(modelled on the Ucluelet hub: Why go with a facts table, When to go calendar, things to do by activity, questions under each activity).

Rules for every value:
- Copy comes from `New Articles - 2026/<doc>.docx` (dump with `python3 -I scripts/town-page/docx_text.py "<doc>"`) or from the town's extracted current page (`scripts/town-page/extracted/<slug>.json`). Light edits for length and plain English are fine. Never invent facts, numbers, prices, distances or events.
- No em dashes (use comma, colon, parentheses or "to"). No italics. No emoji. No counts used as decoration ("217 places", "63 questions").
- Canadian spelling as in the source.

```json
{
  "slug": "whistler",
  "name": "Whistler",
  "region": "mainland",                      // "island" (Vancouver Island) or "mainland"
  "title": "Whistler, Arc Trips",
  "description": "One sentence, under 160 characters, for the meta description.",
  "hero": {
    "img": "/prototype/media/whistler/imageN.jpg",   // a photo OF THE TOWN or its signature view, checked by eye
    "alt": "What the photo shows",
    "standfirst": "One or two sentences about the town itself (not about one attraction). Max 30 words."
  },
  "why": {
    "h2": "Short headline, max 8 words, sentence case, no full stop",
    "paras": ["Paragraph 1, 40 to 70 words.", "Paragraph 2, 30 to 60 words."],
    "facts": [
      {"k": "Where it is",   "v": "max 25 words"},
      {"k": "Getting there", "v": "max 25 words, only travel facts the sources state"},
      {"k": "Known for",     "v": "max 25 words"},
      {"k": "When to come",  "v": "max 25 words"}
    ]
  },
  "when": {
    "h2": "Short headline, max 8 words",
    "intro": "One or two sentences: when it is busy, when it is quiet, and that every season has a reason to come. Crowds and activities first, weather only as 'dress for it'.",
    "rows": [
      {"name": "Hiking", "best": [6,7,8,9], "shoulder": [5,10], "note": "max 14 words"}
    ],                                         // 2 to 4 rows, the town's main activities, months 1-12 from the sources
    "crowds": [1,1,2,2,2,3,4,4,3,2,1,2],       // 12 values: 1 quiet, 2 moderate, 3 busy, 4 busiest. From what the sources say about busy and quiet seasons.
    "crowdsNote": "max 18 words, what drives the busy months",
    "seasons": [
      {"h": "Summer, June to August", "p": "max 40 words"},
      {"h": "Fall, September to November", "p": "..."},
      {"h": "Winter, December to February", "p": "..."},
      {"h": "Spring, March to May", "p": "..."}
    ]
  },
  "tabs": [                                  // 2 to 5 activities, most popular first
    {
      "id": "hiking", "label": "Hiking",
      "intro": "One sentence, max 25 words.",
      "places": [                            // max 6, the most popular and commonly recommended, source order
        {"name": "Lost Lake Loop", "img": "/prototype/media/whistler/image19.jpg or null", "alt": "...",
         "text": "One paragraph, 35 to 70 words.", "note": "Good to know text or null"}
      ],
      "faqs": [ {"q": "Question?", "a": "Answer, max 60 words."} ]   // 2 to 5 questions about THIS activity, about THIS town
    }
  ],
  "planning": [ {"q": "...", "a": "..."} ],  // 0 to 5 general trip questions (getting there, how many days)
  "nearby": ["squamish"],                    // 1 to 3 town slugs from the 15 BC towns
  "sources": ["Top Things to See and Do in Whistler.docx"]
}
```

Town slugs: tofino, ucluelet, victoria, sooke, sidney, shawnigan-lake, chemainus, nanaimo, nanoose, parksville, campbell-river, vancouver, whistler, squamish, nelson.
