# SquareKeeper Design Guidelines

## Design Principles
**Modern utility-focused design** (Linear + Notion + Stripe inspired)
1. **Clarity Above All**: Obvious purpose for every element
2. **Trust Through Consistency**: Reliable patterns everywhere
3. **Effortless Organization**: Scannable, manageable data presentation
4. **Instant Feedback**: Visual confirmation for all actions

---

## Typography

**Font Families:**
- Primary: Inter
- Monospace (grid numbers): JetBrains Mono/Roboto Mono

**Hierarchy:**
```
Page Titles:       text-3xl font-semibold
Section Headers:   text-2xl font-semibold  
Subsection:        text-xl font-medium
Card Titles:       text-lg font-medium
Body:              text-base font-normal
Secondary:         text-sm (timestamps, status, grid axis)
Small:             text-xs (grid cell numbers, tooltips)
Buttons:           text-sm font-medium
```

**Grid Typography:**
- Cell numbers: `text-xs font-mono` (upper left corner)
- Entry names: `text-xs font-medium` (centered, ellipsis)
- Axis numbers: `text-sm font-mono font-semibold`

---

## Layout & Spacing

**Spacing Scale:** Use Tailwind units: **2, 4, 6, 8, 12, 16**

**Structure:**
```
Top Nav:           h-16 px-6 (fixed, logo left, action right)
Page Container:    max-w-7xl mx-auto px-6 py-8
Dashboard Grid:    grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
Contest Manager:   grid-cols-1 lg:grid-cols-3 (board: col-span-2, sidebar: col-span-1)
Public Board:      max-w-4xl mx-auto
```

**Component Spacing:**
```
Card padding:      p-6
Form spacing:      space-y-4
Input padding:     px-4 py-2
Button padding:    px-6 py-2
Modal padding:     p-8
Section spacing:   space-y-8
List spacing:      space-y-2 (compact), space-y-4 (detailed)
```

**10x10 Grid Specs:**
- 11×11 CSS Grid (1 header row/col + 10 data)
- Cell size: Min 40px × 40px, target 60px desktop
- Gap: `gap-0` (shared borders)
- Border: 1px solid between cells
- Headers: Distinct background, red headers marked visually

---

## Components

### Navigation
**Top Bar:** Full-width, sticky, h-16, logo (text-xl font-bold) left, primary action right

**Admin Tabs:** Horizontal, active = bottom border accent + font-medium, hover underline

### Forms

**Input Fields:**
- Labels: `text-sm font-medium mb-2`
- Full-width, `rounded-md`, 1px border
- Focus: `ring-2 ring-offset-1`
- Error: red border + `text-sm` message below
- Helper: `text-xs` muted below
- Required: red asterisk after label

**Checkboxes (square selection):**
- Grid: `grid-cols-5 md:grid-cols-10 gap-2`
- Items: `border rounded px-3 py-2`
- Checked: filled background + checkmark

**Toggles:** For "Open for Picks", clear labels, `duration-200` transition

### Buttons

```css
Primary:    Solid background, text-sm font-medium, px-6 py-2, rounded-md, shadow-sm hover:shadow
Secondary:  border-2, transparent bg, same dimensions (Cancel, Release)
Danger:     Red-toned, requires confirmation (Delete Contest)
Icon:       h-10 w-10, rounded-md, hover background
```

### 10x10 Grid

**Structure:**
- 11×11 grid container
- **Headers (row/col 0):** `flex items-center justify-center text-sm font-mono`, red headers with red background
- **Data Cells:**
  - Available: White bg, subtle border, `cursor-pointer`, hover shadow/emphasis
  - Taken: Gray bg, `cursor-default`, no hover
  - Content: Number top-left (`text-xs font-mono`), name centered (`text-xs font-medium`, truncated)
  - Click: Available opens modal, Taken shows tooltip

**Tooltip (taken squares):**
- `absolute`, `shadow-lg`, `p-4`
- Shows: Entry Name (bold), Full Name, Email (masked: j***@example.com)

### Cards

**Contest Cards:**
- `border rounded-lg p-6`
- Header: Name (`text-lg font-semibold`) + status badge
- Body: Teams, date (`text-sm`)
- Stats: Taken/Available with progress bar
- Footer: Manage + Public Link buttons (right-aligned)
- Hover: shadow increase

**Square Detail Cards:**
- `border-l-4` accent
- Shows: Square #, Entry Name, Email, Status
- Actions: Edit, Release (`text-sm`)

### Modals

**Claim Square:**
- `max-w-md`, centered overlay, backdrop blur
- Header: "Claim Square #[X]" (`text-xl font-semibold`)
- Form: Name*, Email*, Entry Name* (`space-y-4`)
- Helper: "Your entry name will appear on the board" (`text-xs`)
- Footer: Cancel + Confirm (`space-x-4`)
- Validation: Inline errors below fields

**Confirmation:**
- `max-w-sm`, icon top, question (`text-lg`), description (`text-sm`), Cancel + Confirm buttons

### Status & Data

**Badges:**
- `rounded-full px-3 py-1`
- `text-xs font-medium uppercase tracking-wide`
- Colors: Open (green), Locked (red), Taken (gray), Available (blue)

**Progress Bar:** `h-2 rounded-full`, shows % filled

**Winners Panel:**
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Each: `border rounded p-4`, label (`text-sm font-medium`), value (`text-2xl font-bold font-mono`) or "—"
- Admin: editable inputs

**Squares List:**
- `max-h-96 overflow-y-auto`
- Filter tabs: All/Available/Taken
- Items: alternating backgrounds, `space-y-1 p-3`

### Feedback

**Toasts:**
- Fixed top-right, slide-in, auto-dismiss 3s
- Success: green `border-l-4`, Error: red `border-l-4`
- Icon + message (`text-sm`)

**Empty States:**
- Centered: large muted icon, heading (`text-lg font-medium`), description (`text-sm`), primary button
- Examples: "No contests yet", "All squares taken"

**Loading:**
- Skeletons for grid/cards during fetch
- Spinner for button actions
- Disabled state during submission

---

## Images
- Logo: Top-left nav (icon + wordmark)
- Empty states: Simple line-art icons
- **No hero images** — grid is the visual centerpiece

---

## Accessibility

**Color Independence:**
- Red headers labeled: "Row 3 (Red)"
- Available vs Taken: different background AND border

**Keyboard:**
- All elements focusable with visible focus rings
- Modal trapping (tab cycles)
- Grid: arrow key navigation, Enter to claim, Esc to close

**Touch Targets:**
- Min 44×44px (40×40px acceptable for grid cells)
- Adequate spacing between clickables

**Forms:**
- Proper label `for`/`id` associations
- ARIA labels for icon buttons
- Required fields: visual + semantic
- Error messages: `aria-describedby`

---

## Animation

**Allowed (minimal, purposeful):**
```
Modal fade:           duration-200
Toast slide-in:       duration-300
Button hover:         scale-105 duration-150
Color transitions:    transition-colors duration-200
Loading spinner:      rotation
```

**Avoid:** Scroll animations, auto-carousels, parallax, excessive micro-interactions

**Instant Feedback:**
- Square claim: immediate white → gray
- Form submit: instant loading state
- Toasts: appear immediately

---

## Quick Reference

**Contest Status Flow:** Open (green badge) → Locked (red badge)  
**Square States:** Available (white, hover) → Taken (gray, no hover)  
**Admin Views:** Dashboard → Contest Manager (Board/Settings/Winners tabs)  
**Public View:** Grid + claim modal only  
**Key Actions:** New Contest, Claim Square, Shuffle Axis, Save Changes, Release Square (danger)