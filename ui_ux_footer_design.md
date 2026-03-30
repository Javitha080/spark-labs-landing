# UI/UX Design Specification: Premium Glassmorphism Footer

This document outlines the UI/UX design principles, visual aesthetics, micro-interactions, and responsive layout for a premium, modern web footer, based on the `spark-labs-landing` reference. This guide serves as a blueprint for implementing a similar immersive footer on another project.

## 1. Core Aesthetic & Concept
- **Theme:** Dynamic Glassmorphism & Liquid Glow (matching the header).
- **Vibe:** Immersive, structured, modern, and engaging.
- **Layout:** Floating "card" style container rather than a full-width flat block. It sits within the page max-width with heavy padding and massive border radiuses.
- **Motion:** Scroll-triggered entrance animations, liquid background effects, and playful micro-interactions on links and buttons.

## 2. Structural Composition
The footer isn't attached edge-to-edge; instead, it is a massive, floating, rounded container.

### 2.1 Outer Section & Background
- The outer wrapping `<footer/>` element has heavy top and bottom padding (`pt-20 pb-10 px-4`).
- It features an absolute positioned background gradient (`bg-gradient-to-t`) that fades from the background color at the bottom to transparent at the top, blending it smoothly into whatever section comes before it.

### 2.2 Main Floating Container
- This is the core visual component containing all the footer data.
- **Dimensions & Shape:** Max width container (`max-w-7xl mx-auto`), heavily rounded corners (`rounded-[2.5rem]` or approx 40px).
- **Glassmorphism:** 
  - Background: Near opaque dark/glass (`bg-background/80`).
  - Blur: Medium backdrop blur (`backdrop-blur-md`).
  - Border: Subtle translucent border (`border-white/10` or `border-border/50`).
  - Shadow: Deep, soft drop shadow (`shadow-2xl shadow-foreground/5`).
- **Entrance Animation:** As the footer scrolls into view, it slides up (`y: 50` to `0`) and fades in (`opacity: 0` to `1`) smoothly over 0.8s.

### 2.3 Ambient Liquid Background (Z-index: -10)
Inside the main floating container, acting as a backdrop to the content:
- A base gradient covering the inset with 50% opacity and extreme blur (`blur-3xl`).
- 3 massive, absolute positioned glowing orbs (e.g., `w-[500px] h-[500px]`, `w-[600px] h-[600px]`) in primary, secondary, and accent colors.
- These orbs have massive blur (`blur-[100px]`) and `animate-pulse` effects with staggered animation delays (`0s`, `0.5s`, `1s`) to simulate a slow, breathing ambient light effect.

## 3. Grid Layout & Content Areas
Inside the main container, heavy padding is applied (`p-8 md:p-12 lg:p-16`). The layout uses a 12-column CSS Grid on desktop.

### 3.1 Brand Column (Spans 5/12 columns)
- **Logo Area:** 
  - A dual-box layout. The left box contains the actual logo image inside a blurred, bordered squircle. The right box is a muted placeholder/badge box.
- **Brand Text:** 
  - Massive, bold, lowercase tracking-tighter typography for the main name (`text-4xl`).
  - Micro-typography below for the sub-brand or description (10px uppercase, tracking-widest, bold).
- **Description:** A brief, light, relaxed-leading paragraph (`text-lg font-light leading-relaxed text-muted-foreground`).
- **Social Links:**
  - Row of squircle icons (`w-12 h-12 rounded-2xl`).
  - **Interaction:** Hover causes the icon to scale significantly (`scale: 1.1`) and tilt (`rotate: 5 deg`), while the background shifts to the primary color. Tap scales it down.

### 3.2 Quick Links Column (Spans 3/12 columns)
- **Column Header:** Micro-typography (xs, bold, uppercase, tracking-[0.2em]).
- **Links List:**
  - Font: Large and medium weight (`text-lg font-medium`).
  - **Interaction:** Hovering over a link slides the text slightly to the right (`translate-x-1`) and reveals a tiny dot (`w-1.5 h-1.5`) that animates from transparent to the primary color.

### 3.3 Newsletter Column (Spans 4/12 columns)
- **Container:** This section is visually separated by being placed inside its own glass card (`p-6 rounded-3xl bg-muted/30 border border-border/50 backdrop-blur-md`).
- **Header:** Bold, lowercase, tracking-tight (`text-xl`).
- **Description:** Small, muted text.
- **Form:** 
  - Flex row containing an Input and a Submit Button side-by-side.
  - Input: Pill/rounded-xl styling, subtle muted background, focus states highlighting the border in primary color.
  - Button: Square/rounded-xl, primary color background, containing an icon (e.g., `ArrowRight`).

## 4. Bottom Copyright Bar
- Separated from the grid above by a top border and heavy top margin (`mt-16 pt-8 border-t border-border/50`).
- Flex container (column on mobile, row on desktop with space-between).
- Contains copyright text and legal links (Privacy, Terms).
- **Typography:** Consistent use of the micro-typography system across all items (`10px` uppercase, tracking-widest, bold, highly muted text).

## 5. Technical Implementation Recommendations
1. **Framework:** React / Next.js / Vite
2. **Styling:** Tailwind CSS (Grid, flexbox, utility classes for blur/opacity).
3. **Animations:** Framer Motion (`useInView` for the scroll-triggered entrance, `whileHover` and `whileTap` for the social icons).
4. **Layout:** Rely heavily on CSS Grid for the desktop layout to precisely control column widths, dropping down to a single column stack on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-12`).
