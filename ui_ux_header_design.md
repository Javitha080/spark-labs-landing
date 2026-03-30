# UI/UX Design Specification: Premium Glassmorphism Header

This document outlines the UI/UX design principles, visual aesthetics, micro-interactions, and responsive behavior for a premium, modern web header, based on the `spark-labs-landing` reference. This guide serves as a blueprint for implementing a similar highly polished header on another website.

## 1. Core Aesthetic & Concept
- **Theme:** Dynamic Glassmorphism & Liquid Glow.
- **Vibe:** Modern, tech-forward, premium, immersive.
- **Layout:** Floating top navigation bar (not edge-to-edge), sitting slightly below the top of the viewport.
- **Motion:** Fluid, physics-based spring animations (e.g., Framer Motion), with continuous ambient background movements.

## 2. Structural Composition (Desktop)
The header is a flex container split into three main areas:
1. **Left: Brand / Logo Area**
2. **Center: Navigation Links (Pill Container)**
3. **Right: Calls to Action (CTA) & Utilities**

### 2.1 Background & Container Styles
- **Initial State:** 
  - Width: `90%` (max `1100px`)
  - Border Radius: `9999px` (fully rounded pill shape)
  - Background: Semi-transparent dark/glass (`rgba(10, 10, 20, 0.6)`)
  - Backdrop Filter: `blur(12px)`
  - Border: Subtle stroke (`border-white/10` or `border-border/50`)
- **Scrolled State (triggered > 50px scroll):**
  - Width expands to `95%` (max `1300px`)
  - Border Radius slightly sharpens to `24px`
  - Background becomes more opaque (`rgba(10, 10, 20, 0.85)`)
  - Backdrop Filter intensifies to `blur(20px)`
  - Shadow: Soft drop shadow (`0 10px 30px -10px rgba(0,0,0,0.2)`)

### 2.2 Ambient Liquid Background (Z-index: -10)
Inside the header container, beneath the content, lies a continuous animation layer:
- A base gradient covering the inset with 50% opacity and heavy blur (`blur-xl`).
- 3-4 absolute positioned glowing orbs (e.g., `w-32 h-32`, `w-24 h-24`, sizes varying) in primary, secondary, and accent colors.
- These orbs have `blur-3xl` and an `animate-pulse` effect with staggered animation delays (`0s`, `0.5s`, `1s`) to simulate a breathing, liquid light effect.

## 3. Component Details

### 3.1 Brand Area (Left)
- **Logo Icon:** 
  - Housed in a square/rounded box (`rounded-xl`).
  - Container has `bg-background/50` (subtle glass) and `backdrop-blur-md`.
  - Hover state slightly brightens the border (`group-hover:border-primary/50`).
- **Brand Text:**
  - Stacked layout (Club Name above, Est. date below).
  - Main text: Bold/Black font weight, lowercase, tight letter spacing (`tracking-tighter`).
  - Subtext: Micro-typography (`9px`), uppercase, wide letter spacing (`tracking-[0.2em]`), muted color.
  - Hover effect shifts text colors to the primary accent color.

### 3.2 Navigation Pill (Center)
- **Container:** Rounded pill (`rounded-full`), muted glass background (`bg-muted/50`), with a subtle border.
- **Inactive Links:** 
  - Micro-typography (`9px`), uppercase, bold, wide tracking (`tracking-[0.15em]`).
  - Color: Muted foreground.
  - Hover: Text brightens to foreground, background adds a subtle muted highlight.
- **Active Link (The "Magic Pill"):**
  - Uses a shared layout animation (like Framer Motion's `layoutId`) to smoothly slide the active background indicator between items.
  - **Active State Layers:**
    1. Base gradient (`from-primary` to `secondary`).
    2. Glass overlay (`backdrop-blur-md bg-background/20`).
    3. **Continuous Shimmer:** An angled, semi-transparent white gradient (`-skew-x-12`) that infinitely translates horizontally (`-100%` to `200%`) creating a shiny metal/glass reflection.
    4. Glass edge highlight (inner border).
    5. Soft external drop-glow (`blur-md`).

### 3.3 Right Actions
- **Utilities:** Theme Toggle (Sun/Moon icon).
- **CTA Button:**
  - Small size (`h-10`, `px-6`), rounded pill shape.
  - Primary color background with a matching inset shadow/glow (`shadow-primary/25`).
  - Hover: Shadow intensifies, subtle scale up (`scale: 1.05`). Tap: scale down (`scale: 0.95`).
  - Typography matching the nav links (uppercase, bold, wide tracking).
  - Includes a leading icon (e.g., Sparkles) for visual interest.

## 4. Mobile Experience (Drawer / Sheet)
When the viewport shrinks (below tablet/desktop breakpoints):
- Center nav and right CTA disappear.
- Replaced by a Hamburger Menu icon button with glass styling.
- **Open State (Full Screen Modal/Sheet):**
  - Background: Near-opaque glass (`rgba(10, 10, 20, 0.95) backdrop-blur-20px`).
  - **Header:** Logo and Brand name aligned left, close (X) button aligned right.
  - **Menu Links:** Large, bold, lowercase, tight tracking (`text-3xl font-black tracking-tighter`). Items fade and slide up with staggered delays upon opening.
  - **Mobile CTA:** A large, full-width button at the bottom of the list, continuing the heavy drop-shadow and bold uppercase typography. Include an action icon (arrow-right, etc.).

## 5. Technical Implementation Recommendations
1. **Framework:** React / Next.js / Vite
2. **Styling:** Tailwind CSS (for rapid utility classes corresponding to `blur`, `bg-opacity`, etc.)
3. **Animations:** Framer Motion (crucial for `layoutId` on the active nav state, scroll-based header expansion, and spring-based interactions).
4. **Scroll Spy:** Use `IntersectionObserver` to track the active section and update the centered nav pill accordingly to avoid heavy scroll event listeners causing jank. Throttle or use `useMotionValueEvent` for evaluating the 50px drop shadow threshold.
