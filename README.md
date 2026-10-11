# Creative Facilitation Session Planner

A session planner for IDEM104 Creative Facilitation at TU Delft, built from the course's *Road Map for CPS Techniques* book. Stores facilitation techniques as structured data — stage, diamond phase, time, materials, step-by-step, tips — and lets a facilitator assemble them into a timed session plan instead of writing one from scratch in a document every time.

**Live demo:** https://gazzaryandika.github.io/creative-facilitation-planner/

## What it does

- A technique library seeded from the book and from the team's own custom techniques (ice breakers, etc.), filterable by stage and diamond phase
- Clone a real session plan (or start blank) and build it section by section — Problem Finding, Idea Finding, Solution Finding, Wrap Up — with a running time budget against a target length
- A read-only "page" view of a finished plan, separate from the editing form, plus `.docx` export
- A live facilitation mode: a full-screen countdown timer per technique, the whole session's time remaining, what's up next, and step-by-step navigation — for actually running the session in the room

## Stack

React + TypeScript + Vite, Zustand, dnd-kit, Tailwind v4, `docx` for export. No backend — v1 is a single-user local demo with data in the browser's `localStorage`, built behind a `Repository` interface so a real backend can swap in later without a UI rewrite.

## Running it locally

```bash
npm install
npm run dev
```

## Updating the technique library

Book techniques are generated from the Road Map notes in the course's Obsidian vault (one `3.x.y` note per technique in the "Techniques Database" folder). After editing a note, rebuild the seed data:

```bash
python3 scripts/import-techniques.py "<path to Techniques Database>"
```

Team-authored techniques (ice breaker, wrap up, etc.) aren't in the vault and are left untouched.
