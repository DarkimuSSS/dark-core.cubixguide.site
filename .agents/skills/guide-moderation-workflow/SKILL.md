---
name: guide-moderation-workflow
description: Guidelines and verification procedures for CubixGuide guide creation, draft versioning, moderation approval pipelines, author cabinet flows, and admin publication controls.
---

# Guide Moderation Workflow Skill

This skill ensures proper isolation between draft content edited by authors and published content displayed to public viewers on CubixGuide.

## Core Rules & Architecture

1. **Draft vs Published Isolation**
   - Direct edits in the Author Cabinet or Builder MUST update the draft state (`draft` / `pending_moderation`).
   - Public users must ONLY see content marked with `status === 'published'` (or the snapshot saved at publication time).
   - Edits to published guides create a pending revision that requires re-moderation before going live.

2. **Moderation Lifecycle**
   - `Draft`: Editable by author only.
   - `Pending Moderation`: Submitted by author, visible to admins for review.
   - `Published`: Approved by admin, visible to all users.
   - `Rejected`: Sent back to author with reviewer feedback.

3. **Verification Checklist**
   - Verify author cannot directly overwrite public view without moderation step.
   - Ensure telemetry and admin dashboard correctly reflect pending moderation counts.
