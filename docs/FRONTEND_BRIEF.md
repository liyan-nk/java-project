# Frontend Developer Brief & Design System Guide

**Target Audience**: Ahamed Farsin (Frontend Developer & UI/UX Specialist)  
**Project**: CampusHub Mobile-First PWA

---

## 1. Design Aesthetics: Apple x Notion Minimalist Theme

CampusHub adheres to a hybrid **Apple x Notion** aesthetic — clean, tactile, content-focused, and refined with subtle glassmorphism and subtle micro-interactions.

### Color Tokens

#### Light Theme (Default: Notion Light Clean)
- `--bg-primary`: `#F7F7F5` (Soft warm neutral)
- `--bg-secondary`: `#FFFFFF` (Pure white card background)
- `--text-primary`: `#191919` (High contrast charcoal)
- `--text-secondary`: `#6B6E76` (Muted gray text)
- `--border-color`: `#E6E6E4` (Delicate subtle borders)
- `--accent-color`: `#2383E2` (Apple interactive blue)
- `--accent-hover`: `#1D6FBF`
- `--badge-bg`: `#EFEFED`
- `--glass-bg`: `rgba(247, 247, 245, 0.85)`

#### Dark Theme (Notion Dark Obsidian)
- `--bg-primary`: `#0D0D0E` (Deep charcoal obsidian)
- `--bg-secondary`: `#161618` (Elevated card background)
- `--text-primary`: `#EDEDED` (Crisp off-white)
- `--text-secondary`: `#9B9B9B` (Secondary gray)
- `--border-color`: `#27272A` (Subtle dark border)
- `--accent-color`: `#0A84FF` (Apple dark mode blue)
- `--accent-hover`: `#409CFF`
- `--badge-bg`: `#222225`
- `--glass-bg`: `rgba(13, 13, 14, 0.85)`

---

## 2. Mobile Bottom Dock Rules

1. **Fixed Dock**: Positioned at bottom (`bottom: 0`, `left: 50%`, `transform: translateX(-50%)`, width `calc(100% - 24px)` with max-width `440px`).
2. **Glassmorphism**: `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`.
3. **Four Core Tabs**:
   - `[Home]`: Profile summary, quick view schedules, system status.
   - `[Planner]`: Timetable schedules and attendance tracker with `+ / -` step buttons.
   - `[Market]`: Campus marketplace listings with filters and create item modal.
   - `[Lost]`: Lost & Found reports with claim action items.
4. **Active State**: Pill indicator with smooth spring transition and active accent color.

---

## 3. Copy-Paste AI Prompt for IDE Integration

Farsin, copy and paste the prompt below directly into your IDE agent whenever building or styling new frontend modules:

```text
You are working on the CampusHub frontend repository for Ahamed Farsin. 
Follow the Apple x Notion minimalist design system:
- Use Light theme (#F7F7F5 primary background, #FFFFFF card background) and Dark theme (#0D0D0E primary, #161618 card).
- Use Inter font system with smooth anti-aliasing and tight letter-spacing.
- All interactive controls must support smooth 150ms cubic-bezier transitions.
- Maintain the fixed glassmorphic bottom dock navigation ([Home], [Planner], [Market], [Lost]).
- Strictly integrate with canonical backend API endpoints:
  * GET /api/user
  * GET, POST /api/timetable
  * GET /api/attendance
  * POST /api/attendance/step
  * GET, POST /api/marketplace
  * GET /api/lostfound
  * POST /api/lostfound/claim
- Ensure PWA Service Worker (sw.js) caches static assets offline and syncs network-first with /api/.
```
