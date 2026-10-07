# Knowledge base

Everything the app teaches farmers lives here: the Learn guides, the What to do steps, the
Did you know cards, the My season plan and the advisor's suggested questions. The team edits
this content. Farmers never edit it in the app.

## Files

| File | What it is |
|---|---|
| `AgriAI_knowledge_base.xlsx` | **The file to edit.** Has dropdowns, header notes, length warnings and automatic checks (see its Read me tab). |
| `topics.csv` | One row per Learn topic. |
| `facts.csv` | One row per tip or step. The main table. |
| `sources.csv` | One row per source and fact. Three sources for one fact = three rows. |
| `season_stages.csv` | The dated steps in My season, timed in weeks from planting. |
| `advisor_questions.csv` | Suggested questions shown in the advisor. |

The CSVs are exports of the spreadsheet tabs (without the automatic check columns). They are
what the import script reads, and they make changes easy to review in GitHub.
**After editing the spreadsheet, re-export the CSVs in the same commit.**

## How the app uses each column

- **facts.csv**
  - A fact with an `action` shows up as a step under **What to do** for its topic, ordered by `step_order`, with `action_icon` next to it.
  - Every fact also becomes a **Did you know?** card: `title` as the headline and `fun_fact` as the text (falls back to `farmer_summary`), with its sources linked underneath.
  - Tapping **Why?** on a step shows `farmer_summary` and its sources.
  - The advisor receives every live fact as context and cites them by `id`.
- **topics.csv**: `ordered_steps = yes` numbers the steps (First, Then, Finally). `no` shows them as independent actions.
- **season_stages.csv**: `weeks_from` and `weeks_to` count from the planting day. Negative numbers are before planting. Once the farmer records the real planting day, every window moves with it. `fact_id` is what "How and why?" opens.
- **sources.csv**: `finding` is shown under the link, so write one plain sentence with the number and page.

## Rules

1. **One idea per row.** The app turns each row into one card or step.
2. **Keep farmer text short.** `action` under 10 words, `title` under 8, `farmer_summary` under 25.
3. **Status decides what is live.** `draft` → `checked` (a second person verified the content and sources) → `live`. Only `live` rows are shown. A fact can go live only with at least one source marked `checked = yes`.
4. **Never change or reuse an id.** Saved notes and chats link to ids. To remove a row, set `status = retired`.
5. **Numbers need a unit and a region**, e.g. "2 bags per acre, Central region".
6. **No dashes in farmer text.** Use commas or full stops.

## Current state

The content is what the prototype shows today. All facts and season stages are still `draft`,
no source has been checked yet, and 13 facts have no source. Season timing (e.g. top-dressing
at weeks 3 to 5) is a placeholder to be checked against sources. Weeding has no fact yet.

## Still to build (backend)

An import script that reads these CSVs, validates them (ids unique, links resolve, only `live`
rows with a checked source) and writes them to the database the app reads from.
