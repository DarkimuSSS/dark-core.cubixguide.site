---
name: stitch
description: Comprehensive UI/UX design stitching skill for CubixGuide. Manages theme tokens (Dark, White, Emerald, Velvet Red), interactive hover effects, micro-animations, design consistency, and seamless component blending.
---

# Stitch UI & Design System Skill

This skill governs the visual design, theme management, and component stitching standards for the **CubixGuide** platform.

## Key Objectives

1. **Theme Consistency & Tokens**
   - Ensure all components react properly to active themes (`dark`, `light`, `emerald`, `velvet-red`).
   - Use CSS custom properties (`--bg-primary`, `--bg-card`, `--text-primary`, `--accent-color`, `--border-color`, etc.) instead of hardcoded hex colors.
   - Avoid theme leaks (e.g. green accents appearing in the Velvet Red theme or dark borders in White theme).

2. **Interactive States & Hover Effects**
   - Every interactive element (button, card, tab, link, input) MUST have clear `:hover`, `:focus-visible`, and `:active` states.
   - Use subtle micro-animations (e.g. `transition: all 0.2s ease`, `transform: translateY(-2px)`, glow box-shadows).

3. **Modal & Backdrop Blending**
   - Ensure modals (Profile, Builder, Author Cabinet) have semi-transparent backdrops with appropriate contrast so white overlays do not blind the user over banners.
   - Maintain clear typography hierarchy and high contrast ratios across all theme modes.
