# AI Brief

- **Source:** https://cs.money/tr/
- **Generated:** 2026-08-09T10:20:13.525Z

## Summary
CS.MONEY Takas Botu — CS:GO/CS2 Skin ve Eşyaları Için Hızlı Takas, Alım ve Satım Botu — use as UI reference for cs.money. Typical flow: navigation → hero → search-bar → stat-cards → feature-grid. Rebuild with your own brand, copy, and assets; do not clone the source site.

## Layout flow
navigation → hero → search-bar → stat-cards → feature-grid → unrecognized → cta-banner → faq-accordion → stat-cards → about → info-block → unrecognized

## Components
### Navigation (`navigation`)
Site-wide header navigation and primary CTAs.
- **Key elements:** logo/brand, nav links, CTA button
- **Design notes:** Keep sticky/top bar compact; avoid dense menus in the first pass.

### Hero (`hero`)
Primary above-the-fold value proposition and main CTA.
- **Key elements:** headline, supporting line, primary CTA, optional media plane
- **Design notes:** Wide, tall hero band — prefer full-bleed composition over inset cards.

### SearchBar (`search-bar`)
Primary find/filter entry for catalog or inventory.
- **Key elements:** search input, submit control, optional icon placeholder
- **Design notes:** Center or align with hero; keep a single clear field.

### StatCards (`stat-cards`)
Trust or metric strip with short numeric highlights. (×2 landmarks collapsed).
- **Key elements:** 3+ metric values, short labels
- **Design notes:** Equal card rhythm; numbers lead, labels stay secondary. Appears ×2 in the extract.

### FeatureGrid (`feature-grid`)
Feature or benefit grid explaining product modes.
- **Key elements:** section title, icon placeholders, short feature copy
- **Design notes:** One idea per cell; avoid card chrome unless interaction needs it.

### Section01 (`unrecognized`)
Landmark without a confident pattern — treat as a custom section. (×2 landmarks collapsed).
- **Key elements:** section shell, placeholder content
- **Design notes:** Do not invent a fake pattern; design from layout intent. Appears ×2 in the extract.

### CtaBanner (`cta-banner`)
Mid/late-page conversion band.
- **Key elements:** headline, short pitch, CTA button
- **Design notes:** High contrast against page background; one action only.

### FaqAccordion (`faq-accordion`)
Expandable Q&A for objections and trust.
- **Key elements:** section title, question rows, expand/collapse answers
- **Design notes:** Start with one open item; keep answers short.

### About (`about`)
Short brand/product explanation block.
- **Key elements:** heading, paragraph
- **Design notes:** Keep copy brief; link out for deep detail if needed.

### InfoBlock (`info-block`)
Topical information section (mode, security, community, etc.). (×4 landmarks collapsed).
- **Key elements:** heading, body copy
- **Design notes:** Repeatable content section with clear id-level topic. Appears ×4 in the extract.

## Design system
- **Colors:** bg #100f14, text #ffffff, accent #d91b88, surface #1c1a24, muted #bbb9c7
- **Typography:** Inter; body ~16px, display up to ~42px.
- **Spacing:** Spacing scale sampled from page (~4px, 8px, 10px, 12px …).
- **Radius:** Radius roles: corners 4px; pills 50px; avatars circle; full=9999px.

## Usage
Give this brief to an AI as the only site-reference context: rebuild the layoutFlow with your brand using designSystem tokens; treat components as empty intent shells, not content to copy.
