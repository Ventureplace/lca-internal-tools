# Figma Design Grader

Grades a design across four dimensions and outputs an interactive heatmap scorecard with gap severity ratings.

---

## Step 1: Detect Input Tier

Before grading, determine what's available:

**Tier 1 — Figma MCP connected + URL provided**
Use `get_design_context` (includes screenshot + specs) and `get_metadata` for layer structure. This is the most thorough path.

**Tier 2 — No MCP, but Figma URL provided**
Ask the user: "I don't have Figma MCP access — can you export and upload a screenshot of the design?" Then proceed as Tier 3.

**Tier 3 — Image uploaded only**
Grade purely from visual inspection. Note in the output that structural/token grading is unavailable without MCP access.

---

## Step 2: Pull the Design (Tier 1 only)

If a Figma URL is provided and MCP is available:

1. Call `get_design_context` with the file key and node ID extracted from the URL
2. Call `get_metadata` on the same node to understand layer structure and naming
3. Optionally call `get_variable_defs` to check token usage vs hardcoded values

Extract the file key and node ID from URLs in this format:
`https://figma.com/design/:fileKey/:fileName?node-id=1-2` → fileKey = `:fileKey`, nodeId = `1:2`

---

## Step 3: Grade Against the Rubric

Evaluate each primitive (design component/screen area) across all four dimensions. Use the rubric definitions below — do not invent new dimensions.

### The Four Dimensions

| Dimension | What It Measures |
|---|---|
| **Trust** | Does this make the user feel safe, confident, and informed? Critical for health contexts. Look for: clear sourcing, honest tone, no false urgency, appropriate medical disclaimers, transparency about AI limitations. |
| **Differentiation / Delight** | Does this feel meaningfully different from ChatGPT or WebMD? Does it feel like the host app (e.g. Shoppers Drug Mart)? Look for: brand personality, moments of warmth, unexpected but appropriate details, non-generic patterns. |
| **Sound UX** | Is this usable, accessible, and clear? Does it follow established patterns well? Look for: tap target sizes, contrast ratios, clear CTAs, predictable navigation, loading states, error handling, empty states. |
| **Conversion / Findability** | Does this drive adoption, engagement, and return visits? Can people find and use it? Look for: entry point clarity, discoverability, onboarding clarity, re-engagement hooks, frictionless flows. |

### Grading Scale (per cell)

| Score | Color | Meaning |
|---|---|---|
| Strong | Green (`#d4edda`) | Well-executed, no significant gaps |
| Functional but basic | Yellow (`#fff3cd`) | Works, but generic or missing opportunities |
| Gap that needs a plan | Red (`#f8d7da`) | Clear problem that needs design attention before launch |

### Gap Severity (per primitive, overall)

After grading all four dimensions for a primitive, assign an overall gap severity:

- **Low** — Mostly green, minor polish needed
- **Moderate** — Mix of green/yellow, some gaps to address
- **High** — Multiple yellow/red cells, significant design debt
- **Critical** — Predominantly red, fundamental problems

---

## Step 4: Identify Primitives

Grade the following primitives by default. Skip any that clearly don't exist in the design. Add new ones if the design contains screens not covered here.

**Core primitives:**
- Entry point
- Onboarding / Welcome
- Consent & permissions
- Chat input & interaction
- Streaming / loading states
- Response rendering
- Sources & verifiability
- Contextual chips / suggestions
- Navigation & care routing
- Chat history
- Red-flag escalation
- Abstention ("I don't know") states
- Medication guidance UI
- Triage UI

If the design is a single screen or component (not a full product), grade only the primitives visible or implied by what's shown.

---

## Step 5: Output the Scorecard

Generate an interactive HTML visualization — not a text table. Use the frontend-design skill aesthetic principles: clean, purposeful, readable. The chart should feel like a real design deliverable, not a generic grid.

### Chart Structure

- **Rows** = Primitives
- **Columns** = Trust | Diff/Delight | Sound UX | Conversion
- \+ MVP notes column (brief Claude observation per primitive)
- \+ Gap severity badge column (Low / Moderate / High / Critical)

### Color coding

- **Green:** `#d4edda` background, `#155724` text → "Strong"
- **Yellow:** `#fff3cd` background, `#856404` text → "Functional but basic"
- **Red:** `#f8d7da` background, `#721c24` text → "Gap that needs a plan"

### Gap badge colors

- **Low:** green pill
- **Moderate:** yellow pill
- **High:** orange pill (`#fd7e14`)
- **Critical:** red pill

### Required features

- Hover on any cell → tooltip with 1–2 sentence rationale for that grade
- Summary bar at top: total Strong / Functional / Gap counts
- Legend matching the scoring scale
- Responsive layout

### HTML output pattern

Output as a single self-contained HTML artifact with inline CSS and JS. No external dependencies except Google Fonts if needed. The Visualizer tool can render this inline, or it can be saved as a file.

---

## Step 6: Follow-up

After the chart, offer:

1. "Want me to go deeper on any specific primitive?"
2. "I can generate a prioritized action list sorted by gap severity if useful."

---

## Notes for Tier 3 (image only)

When grading from a screenshot alone:

- **Trust:** assess visual cues — disclaimers visible, tone of copy, source attribution shown
- **Diff/Delight:** visual distinctiveness, brand personality, unexpected moments
- **Sound UX:** layout clarity, apparent tap targets, contrast, hierarchy
- **Conversion:** entry point clarity, CTA visibility, friction points

Mark cells as "Unable to assess" (gray, `#e9ecef`) where the screenshot doesn't provide enough information. Note in the summary that a Figma MCP connection would enable deeper structural grading.
