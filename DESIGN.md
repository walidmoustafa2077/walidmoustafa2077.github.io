# DESIGN — walidmoustafa2077.github.io

## Concept

**"Index"** — an editorial, dark portfolio built like a printed index rather than a template.

The page is one continuous sheet of warm near-black paper. Type does the work: an oversized
name, outlined section numerals, hairline rules, and rows that behave like a table of contents.
Playfulness comes from small, deliberate imperfections — a hand-drawn underline, one rotated
footnote, numbers that feel stamped — not from decoration.

Silhouette test: shrink the page to a black outline. It should read as *a name, a stack of
numbered rules, and three section numerals* — not a hero + cards + chips + CTA.

## Non-negotiables (what this design must NOT do)

- No gradients, no glow, no neon.
- No card grid, no rounded cards, no hover-lift shadows.
- No emoji icons.
- No centered hero.
- No glassmorphism, no blurred nav.
- No default AI-template fonts (Inter, Space Grotesk, Geist).
- No vague copy ("modern", "premium", "beautiful", "passionate").

## Color

| Token        | Value                  | Use                                    |
| ------------ | ---------------------- | -------------------------------------- |
| `--ink`      | `#0d0c0a`              | page background (warm near-black)      |
| `--ink-2`    | `#14110f`              | raised note / selected row             |
| `--paper`    | `#ede6d9`              | primary text (warm paper white)        |
| `--muted`    | `#8e8679`              | secondary text, labels                 |
| `--line`     | `rgba(237,230,217,.16)`| hairline rules                         |
| `--accent`   | `#c05a38`              | one muted rust accent                  |
| `--accent-2` | `rgba(192,90,56,.16)`  | accent wash for tiny moments           |

No second accent. Color is used for a word, a numeral, a state — never as a background block.

## Type

- **Display:** Fraunces (variable serif) — names, section headlines, numerals.
- **UI / body:** Bricolage Grotesque — row titles, paragraphs.
- **Meta:** IBM Plex Mono — labels, years, tags, footer. Uppercase, tracked +0.12em.

Scale:
- Display: `clamp(56px, 12.5vw, 190px)` / line-height 0.8 / tracking −0.045em
- H2: `clamp(40px, 6.5vw, 96px)` / line-height 0.92 / tracking −0.035em
- Body: `clamp(15px, 1.05vw, 17px)` / line-height 1.65
- Meta: 10–12px, uppercase, mono.

Mixed case display for warmth; uppercase reserved for labels and the name outline.

## Layout

- Max width 1440px, gutters `clamp(20px, 5vw, 64px)`.
- 12-col feel without a framework: a fixed left numeral column (64–88px), content rail beside it.
- Sections separated by 1px hairlines, never by background changes.
- Hero is left-aligned, occupies ~92vh, ends on a meta rail with a hairline above it.
- Work is a **flat indexed list** (`<details>` rows), grouped by discipline.
  Rows, not cards. Index · name · meta · expand.
- Contact is a two-column block (headline / details), footer on a hairline.

## Motion

- Scroll reveal: 18px rise + fade, 700ms, `cubic-bezier(.2,.7,.2,1)`, staggered by group.
- Row hover: name shifts 8px, turns rust; index stays muted.
- Row open: body fades up 120ms; plus rotates 45°.
- Nav: thin 2px rust progress line.
- All motion disabled under `prefers-reduced-motion`.

## Details that carry the character

1. Hand-drawn SVG underline under the word "systems" in the hero statement.
2. Second name line in outline only (text-stroke), not filled.
3. One rotated footnote note in the Approach section — honest, typed, slightly off-axis.
4. Counters in the hero rail are factual: 15 builds · 5 languages · 1 developer.
5. Section numerals are outlined Fraunces, not colored badges.

## Copy rules

- State what was built, in plain verbs. No "passionate", no "leveraging".
- One honest line about AI-assisted work, phrased with ownership: *AI types, I decide.*
- Private and archived work is labelled, not hidden or exaggerated.
- Every link points to a real destination or is omitted.

## Content model

Each repository = one experience entry. No flagship project. Groups:
Shipped software · Document vision · Tooling & AI.
