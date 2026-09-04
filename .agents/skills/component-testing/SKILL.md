---
name: component-testing
description: Comprehensive testing guidelines for CubixGuide components, theme regression checks, interactive modal validation, responsive design checks, and state mutation audits.
---

# Component Testing Skill

This skill provides testing patterns and regression checklists for UI components in CubixGuide.

## Testing Procedures

1. **Theme Regression Checks**
   - Switch active theme (`dark`, `light`, `emerald`, `velvet-red`) and verify:
     - Backgrounds, borders, cards, text contrast.
     - Hover/focus states on buttons and footer links.
     - Modal backdrops and profile banner illumination.

2. **Interactive Component Audit**
   - **Author Cabinet**: Guide selection, builder modal opening/closing, left-panel hover effects.
   - **Admin Tab**: Telemetry charts, author cards, moderation queue review buttons.
   - **Profile Modal**: Banner backdrop contrast, tab navigation, responsive layout.

3. **State Mutation Verification**
   - Verify local component state changes do not cause unintended global array mutations before user confirmation.
   - Confirm forms and builder tools validate inputs before submission.
