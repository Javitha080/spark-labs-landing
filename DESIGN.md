# Design System: Spark Labs Landing
**Project ID:** spark-labs-landing

## 1. Visual Theme & Atmosphere
The Spark Labs design system is characterized by a "Tech-Organic Futurism" aesthetic. It balances a clean, premium, and vibrant light mode with a deep, immersive, and cinematic dark mode. The atmosphere is highly dynamic and interactive, relying on layered **Glassmorphism**, liquid gradient borders, glowing micro-animations, and a subtle omnipresent noise texture. The overall vibe is cutting-edge, airy yet substantial, and visually striking.

## 2. Color Palette & Roles

### Light Mode (Clean, Vibrant, Premium)
* **Crisp Cool White** (`#F5F7FA` | HSL: 220 20% 97%)
  * *Role:* Base background and muted container surfaces.
* **Deep Indigo Black** (`#030712` | HSL: 224 71% 4%)
  * *Role:* Primary text and foreground elements for high contrast readability.
* **Vibrant Purple** (`#8B5CF6` | HSL: 262 83% 58%)
  * *Role:* Primary brand color, used for primary actions, glowing borders, and key highlights.
* **Electric Magenta** (`#D946EF` | HSL: 280 82% 55%)
  * *Role:* Accent color used in gradients alongside the primary purple to create a "liquid" vibrant flow.
* **Charcoal Grey** (`#272B35` | HSL: 220 14% 18%)
  * *Role:* Secondary UI elements and subdued text.

### Dark Mode (Deep, Immersive, Cinematic)
* **Cinematic Void Navy** (`#070B13` | HSL: 228 47% 5%)
  * *Role:* Deep background, providing an endless dark canvas for glowing elements.
* **Rich Purple Primary** (`#7C3AED` | HSL: 263 70% 58%)
  * *Role:* Retains the primary brand identity, glowing intensely against the dark background.

## 3. Typography Rules
* **Display/Headings:** `Space Grotesk`
  * *Rules:* Used for all `h1`-`h6` tags. Styled with bold weights, uppercase transformation, and tight letter spacing (`tracking-tight`) to evoke a modern, engineered feel.
* **Body/UI:** `Inter`
  * *Rules:* Used for general readability and interface text. Features smooth antialiasing and standard tracking.
* **Technical/Stats:** `JetBrains Mono`
  * *Rules:* Used for data points, statistics, and code snippets where monospaced alignment adds a technical edge.

## 4. Component Stylings
* **Buttons:**
  * Pill-shaped to slightly rounded geometries. Primary buttons (`btn-glow`) feature a static gradient border with a sweeping hover reflection and a deep purple drop-shadow glow (`0 0 40px hsl(262 83% 58% / 0.4)`).
  * Feature "magnetic" hover states that subtly follow the cursor.
* **Cards/Containers (Glassmorphism):**
  * Standard cards use softly rounded corners (`0.75rem` / `12px`).
  * **Bento Cards** use generously rounded, organic corners (`2rem` / `32px`).
  * Backgrounds are semi-transparent (`rgba(255, 255, 255, 0.72)`) over a heavily blurred backdrop (`14px` blur), accented by thin, translucent white borders to catch the light.
* **Liquid Borders:**
  * Containers often use animated gradient borders that flow continuously (`animation: liquid-flow 8s linear infinite`) across a spectrum of Primary, Secondary, and Accent colors.

## 5. Layout Principles
* **Fluid Scaling:** Base font sizes and spacing use fluid typography (`clamp(14px, 1.5vw, 18px)`) to ensure perfect proportions across ultra-wide monitors and mobile devices.
* **Generous Whitespace:** The layout employs significant padding for sections (`py-20` to `py-52`) to let the dense glassmorphic components breathe.
* **Z-Axis Depth:** The system relies heavily on the Z-axis, layering noise textures (z-50, 3% opacity), blurred ambient background blobs, and floating glass cards to create physical depth rather than flat grids.
