# town-hub

Builds the seven BC town pages (whistler, squamish, vancouver, nelson, victoria, sooke, sidney) as hubs: Why go, When to go, then one activity tab at a time with each activity's questions.

- Input: the pre-hub pages (git commit `86da22a`, `design/prototype/<town>.html`), saved to a folder and passed as `TOWN_HUB_ORIG=<folder>/`, and the source documents in `New Articles - 2026/`.
- Run: `TOWN_HUB_ORIG=<folder>/ python3 build.py whistler squamish --apply` (without `--apply` it only reports).
- Why go, When to go and the extra FAQs are quoted from the .docx files; the paragraph numbers are in `build.py`.
- Month cells come from the sources, per town. Whistler's photos are matched to places by name (`WHISTLER_PICS`); a place with no matching photo shows none.
- The pages are edited by hand from here. Running this again overwrites them.
