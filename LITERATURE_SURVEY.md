# ANNOTRON — LITERATURE SURVEY & MARKET RESEARCH

> Compiled July 2026. Covers the image-annotation tool landscape, academic literature on
> human-in-the-loop labeling, gap analysis, and method-level recommendations for AnnoTron.

---

## 1. PROJECT OVERVIEW

**AnnoTron** is a web-based image annotation tool for building object-detection datasets in
the YOLO ecosystem. The backend is Flask with SQLite (SQLAlchemy ORM), organized around a
`Project → Dataset → Image → Annotation` data model, where each annotation stores a bounding
box (`x, y, width, height`), a `class_id`, and a `confidence` score. The frontend is a
Next.js/React application with a custom canvas-based bounding-box editor, keyboard-driven
workflow (save, navigate, tool switching, class selection), and per-image status tracking
(`unannotated / annotated / skipped`).

Its distinguishing implementation detail is **local, hardware-aware AI-assisted annotation**:
the backend loads Ultralytics YOLO11/YOLOv8 models directly on the user's machine, checks
available VRAM against per-model thresholds before loading larger variants, and exposes an
auto-annotate endpoint that pre-fills bounding boxes for the current image. Users can also
upload a custom-trained `.pt` checkpoint and use it as the pre-labeling model. The tool has
been exercised on plant leaf disease imagery (early blight vs. healthy leaf classes).

In short: AnnoTron sits in the "model-in-the-loop annotation tool" category — a human
annotator corrects and confirms machine-generated proposals rather than drawing every box
from scratch.

---

## 2. MARKET LANDSCAPE (2026)

The annotation-tool market is mature, with well-funded commercial platforms and heavily
adopted open-source projects. The table below summarizes the tools closest to AnnoTron's
territory.

| Tool | License / Pricing | AI-Assist Capabilities | Deployment | Overlap with AnnoTron |
|---|---|---|---|---|
| **CVAT** | Open source (MIT) + paid cloud | SAM 3 integration (Nov 2025), "AI Agents" framework for pluggable auto-labeling models, interpolation/tracking | Self-hosted (Docker, fairly heavyweight) or cvat.ai cloud | Highest — the de-facto open-source standard for box/polygon annotation with model-in-the-loop |
| **Label Studio** | Open source (Apache-2.0, 24K+ GitHub stars) + HumanSignal enterprise | ML backend framework (bring your own model), SAM integration, pre-annotation import | Self-hosted (pip/Docker) or cloud | High — general-purpose, multi-modal (text, audio, image, video); more setup than AnnoTron |
| **Roboflow** | Commercial SaaS, free tier | Label Assist (pre-label with your own trained model), Auto Label with Grounding DINO / SAM, full train-deploy loop | Hosted only | High conceptually — AnnoTron is essentially a self-hosted, minimal slice of Roboflow's annotate step |
| **Supervisely** | Commercial, free community edition | SAM2 for automatic segmentation and object tracking in video | Self-hosted or cloud | Medium — broader platform (3D, video, DICOM) |
| **V7 Darwin** | Commercial (enterprise) | SAM-based auto-annotate, workflow automation | Cloud | Low-medium — enterprise workflow focus |
| **Encord** | Commercial (enterprise) | SAM-based labeling, quality/consensus workflows | Cloud | Low-medium — strong on QA and medical imaging |
| **SuperAnnotate** | Commercial (enterprise) | Auto-labeling, annotator-team management | Cloud | Low — labeling-workforce orchestration focus |

**Key market finding:** AI-assisted pre-labeling is no longer a differentiator — it is table
stakes. Every significant tool in 2026 ships some combination of (a) pre-labeling with a
user-supplied or foundation model, (b) SAM-style promptable segmentation, and (c) an
active-learning or review loop. CVAT's SAM 3 integration and AI Agents framework (late 2025)
and Roboflow's Grounding DINO + SAM "Auto Label" made zero-shot pre-annotation mainstream.

---

## 3. ACADEMIC LITERATURE

**(a) "A Survey of Image Labelling for Computer Vision Applications" (arXiv:2104.08885).**
Surveys the annotation-tooling space from a research perspective: taxonomy of annotation
types (classification, boxes, polygons, masks), the cost structure of labeling, and the main
cost-reduction levers — pre-labeling, weak supervision, and active learning. Relevance:
AnnoTron already implements the first lever (pre-labeling); the survey positions active
learning (choosing *which* image to label next) as the complementary, underexploited lever —
exactly the "confidence-based triage" recommendation in §6.

**(b) IAdet: "Simplest human-in-the-loop object detection" (arXiv:2307.01582).**
Proposes a minimal loop for single-class detection where the model *retrains in the
background while the human annotates*, so proposals improve continuously during a single
labeling session. Relevance: demonstrates that even a very small tool (comparable in scope to
AnnoTron) can publish a method-level contribution; a future AnnoTron iteration could
fine-tune the custom `.pt` model periodically on freshly confirmed annotations.

**(c) VILOD: "A Visual Interactive Labeling tool for Object Detection" (arXiv:2509.05317).**
Combines model-in-the-loop pre-labeling with *visual analytics* — projections of the dataset
and model-state visualizations that help the human decide what to label next, treating
labeling strategy as an interpretable, human-guided process rather than a fixed queue.
Relevance: supports the idea that the annotation *ordering/triage UI* (not the detector
itself) is where a small tool can still contribute something novel.

**Foundation-model context.** The Segment Anything line (SAM, SAM2, SAM3) shifted the field
from "draw the shape" to "prompt the shape": a click or box prompt yields a full mask, and
integrations now exist in Label Studio, CVAT, Supervisely, V7, and Encord. Any new tool's
box-only workflow should be understood as a deliberate simplicity trade-off, not a gap the
market hasn't noticed.

---

## 4. KEY TRENDS & GAP ANALYSIS

Trends that are now **standard practice** (not differentiators):

1. **Model-in-the-loop pre-labeling** — pre-fill annotations with a trained or zero-shot
   model; human corrects. (Roboflow Label Assist, CVAT AI Agents, Label Studio ML backend.)
2. **Promptable segmentation (SAM family)** — click/box → mask, integrated everywhere.
3. **Active-learning loops** — label → train → let model confidence pick the next batch →
   repeat; described across industry sources as the default recipe for cost reduction.
4. **Full-pipeline platforms** — annotation fused with training, evaluation, and deployment
   (Roboflow end-to-end; CVAT + cloud training partners).

Where the **open space** actually is for a small tool:

- **Minimal self-hosted tooling.** CVAT and Label Studio are powerful but heavyweight to
  deploy and administer; Roboflow is subscription cloud (data leaves your machine). A
  single-purpose tool that runs locally with two commands, keeps data on-device, and does
  local GPU inference serves solo researchers, students, and labs with private data.
- **Domain-focused workflows.** Generic tools know nothing about a domain like plant
  pathology (class taxonomies, leaf-level review conventions, per-disease statistics). Niche
  framing is a legitimate wedge — e.g., "a lightweight annotation bench for agricultural
  disease datasets."

**Conclusion of the gap analysis:** AnnoTron replicates a mature category, so its value case
should not be "features" — it should be *simplicity, locality, and (optionally) domain focus*,
plus one well-chosen method-level contribution to make the internship work defensible.

---

## 5. POSITIONING STATEMENT

> **AnnoTron is a lightweight, self-hosted, single-purpose bounding-box annotation tool for
> YOLO datasets.** It runs entirely on the user's machine with hardware-aware local model
> inference (no cloud, no subscription, no data egress), targets the fast path from raw
> images to a trainable YOLO dataset, and is demonstrated on plant leaf disease detection.
> It deliberately trades the breadth of CVAT/Label Studio for a two-command setup and a
> keyboard-first annotate-review loop.

---

## 6. METHOD-LEVEL RECOMMENDATIONS

Ranked by payoff-per-effort. The explicit advice: **pick ONE differentiator** (the first),
treat items 2–3 as correctness fixes, and leave the rest out of scope.

1. **Confidence-based review triage (uncertainty sampling) — RECOMMENDED PICK.**
   The `Annotation.confidence` column is already populated by the detector but never used.
   Order the image queue (or flag images) by lowest mean/min detection confidence so the
   human reviews the model's most uncertain work first. This is the classic active-learning
   idea from the literature (§3a, §4-trend-3) implemented with data AnnoTron already stores —
   the cheapest possible path to a citable method section.

2. **IoU-based NMS when merging AI and manual boxes** *(correctness fix)*.
   Auto-annotate currently concatenates AI proposals onto existing boxes, producing
   duplicates on re-runs. Suppress any proposal whose IoU with an existing box exceeds a
   threshold (~0.5) before adding it.

3. **Coordinate normalization to [0,1]** *(correctness fix, prerequisite for YOLO export)*.
   Manual boxes are saved in browser display pixels while AI boxes are in original image
   pixels. Normalize against the image's natural dimensions at save time; YOLO-format export
   requires normalized center-x/center-y/width/height anyway.

4. **Out of scope for this project** (documented so the choice is deliberate):
   SAM box→mask assist; background retraining during annotation (IAdet-style); perceptual-hash
   duplicate detection at upload; train/val/test split as a first-class field; multi-user
   inter-annotator agreement and QA workflows.

---

## 7. SOURCES

**Market landscape and tool comparisons**
- Roboflow — Best Image Annotation Tools: https://blog.roboflow.com/best-image-annotation-tools/
- CVAT — Best Open Source Data Annotation Tools: https://www.cvat.ai/resources/blog/best-open-source-data-annotation-tools
- Roboflow — CVAT vs Label Studio comparison: https://roboflow.com/compare-labeling-tools/cvat-vs-label-studio
- CVAT — CVAT or Label Studio, which one to choose: https://www.cvat.ai/resources/blog/cvat-or-label-studio-which-one-to-choose
- Lightly — Data Annotation Tools overview: https://www.lightly.ai/blog/data-annotation-tools
- SuperAnnotate — Best Data Labeling Tools: https://www.superannotate.com/blog/best-data-labeling-tools

**AI-assisted labeling and active learning**
- Roboflow — AI Data Labeling: https://blog.roboflow.com/ai-data-labeling/
- dev.co — AI-Assisted Data Labeling Using Active Learning Loops: https://dev.co/ai/ai-assisted-data-labeling-using-active-learning-loops

**SAM-based annotation integrations**
- V7 — SAM Auto-Annotate: https://www.v7labs.com/blog/sam-auto-annotate
- Roboflow — How to Use Segment Anything (SAM): https://blog.roboflow.com/how-to-use-segment-anything-model-sam/
- Label Studio — SAM Integration: https://labelstud.io/blog/exploring-the-powerful-segment-anything-model-integration/
- Supervisely — SAM2 for automatic segmentation and tracking: https://supervisely.com/blog/segment-anything-2-for-automatically-segment-and-track-objects/
- Encord — Segment Anything Model explained: https://encord.com/blog/segment-anything-model-explained/

**Academic papers**
- A Survey of Image Labelling for Computer Vision Applications: https://arxiv.org/pdf/2104.08885
- IAdet: Simplest human-in-the-loop object detection: https://arxiv.org/pdf/2307.01582
- VILOD: A Visual Interactive Labeling tool for Object Detection: https://arxiv.org/pdf/2509.05317
