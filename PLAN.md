# PLAN: ANNOTRON LITERATURE SURVEY DOCUMENT

## VERDICT

- **Is the research sufficient?** Yes. Two research passes cover the 2026 tool landscape, AI-assisted labeling / active-learning trends, SAM-based annotation, and three academic papers (~16 citable sources). Further searching adds polish, not new conclusions.
- **Is the project a good idea?** As a market product, no — the category is mature and AI pre-labeling is table stakes. As an internship deliverable, yes — positioned as a lightweight, self-hosted, single-purpose YOLO annotation tool (optionally with a plant-disease niche angle). Keep scope tight: write the survey, fix the boot-blocking bug, add exactly ONE method-level differentiator.

## CONTEXT

AnnoTron is a web-based YOLO image annotation tool (Flask + SQLite backend on port 5003, Next.js/React canvas frontend) built as an internship project and tested on plant leaf disease imagery. The annotation-tool market is dominated by CVAT, Label Studio, and Roboflow; the recommended differentiator is confidence-based review triage, since `Annotation.confidence` is already stored in the database but unused.

## DELIVERABLE

One new file: **`LITERATURE_SURVEY.md`** in the project root. No code changes. No new web searches — compiled entirely from research already gathered.

## DOCUMENT STRUCTURE

1. **PROJECT OVERVIEW** — what AnnoTron is (stack, data model Project → Dataset → Image → Annotation, YOLO11-based auto-annotation, hardware-aware model loading), 2–3 short paragraphs.
2. **MARKET LANDSCAPE (2026)** — comparison table: CVAT (SAM 3 integration Nov 2025, AI Agents), Label Studio (multi-modal, 24K+ stars), Roboflow (hosted end-to-end, Label Assist, Grounding DINO/SAM Auto Label), Supervisely (SAM2 segment+track), V7 / Encord / SuperAnnotate (enterprise). Columns: tool, license/pricing, AI-assist capabilities, deployment, closest overlap with AnnoTron.
3. **ACADEMIC LITERATURE** — short reviews of: arXiv:2104.08885 (survey of image labelling for computer vision), arXiv:2307.01582 (IAdet — human-in-the-loop detection, model trains while you label), arXiv:2509.05317 (VILOD — visual interactive labeling for object detection). Tie each back to AnnoTron.
4. **KEY TRENDS & GAP ANALYSIS** — AI pre-labeling, SAM-style promptable segmentation, and active-learning loops are standard, not differentiators; the open niche is minimal self-hosted tools and domain-focused workflows (agriculture / plant disease).
5. **POSITIONING STATEMENT** — lightweight, self-hosted, single-purpose YOLO box annotation with local GPU-aware inference; optional plant-disease niche framing.
6. **METHOD-LEVEL RECOMMENDATIONS** (ranked by effort/payoff; pick ONE):
   - Confidence-based review triage (uncertainty sampling) — **recommended**: cheapest win, confidence already in schema
   - IoU-based NMS when merging AI boxes with manual boxes (fixes duplicate-box concat in `handleAutoAnnotate`)
   - Coordinate normalization to [0,1] (prerequisite for YOLO export — a correctness fix, not research)
   - SAM box→mask assist; perceptual-hash duplicate detection; train/val/test split field; inter-annotator QA — explicitly out of scope
7. **SOURCES** — full link list (~16 URLs: Roboflow blog posts, CVAT blog, Label Studio blog, V7, dev.co active-learning article, Supervisely, Encord, Lightly, SuperAnnotate, the three arXiv papers, comparison pages).

## VERIFICATION

- `LITERATURE_SURVEY.md` renders correctly as Markdown (table formatting, links).
- Every competitor claim in the survey has a matching entry in the Sources section.
