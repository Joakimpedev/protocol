# AI Icon Generation Prompt for Photo Comparison Layout Toggle

## Context
This app has a dark, minimal, terminal aesthetic design system. The app uses:
- Dark background: `#0a0a0a` (almost black)
- Off-white text: `#e5e5e5`
- Monospace fonts for headings
- Clean, stoic, minimal design language
- Subtle borders and surfaces

## Icons Needed

### 1. Stacked Layout Icon
**Purpose:** Represents the vertical stacked layout (two photos on top of each other)

**Visual Description:**
- Two rectangular frames stacked vertically
- Should be simple, geometric, minimal
- White/light gray lines on black background
- Clean lines, no fills (outline style)
- Terminal/minimal aesthetic
- Size: 24x24px equivalent
- Style: Line art, geometric, monospace-friendly

**Concept:** Think of two square/rectangular frames, one above the other, with a small gap between them. Very clean, minimal line art.

### 2. Slider Layout Icon
**Purpose:** Represents the before/after slider layout (two photos side by side with a divider/slider)

**Visual Description:**
- Two rectangular frames side by side horizontally
- A vertical divider line in the middle (representing the slider)
- Optional: Small arrows or indicators on the divider showing it's draggable
- Should be simple, geometric, minimal
- White/light gray lines on black background
- Clean lines, no fills (outline style)
- Terminal/minimal aesthetic
- Size: 24x24px equivalent
- Style: Line art, geometric, monospace-friendly

**Concept:** Think of two square/rectangular frames side by side, with a vertical line or divider in the middle. Could have small left/right arrows on the divider to indicate interactivity.

## AI Generation Prompt

```
Create two minimalist line art icons for a dark terminal-style mobile app interface. Both icons should be white/light gray (#e5e5e5) line art on a black (#0a0a0a) background. The style should be geometric, clean, stoic, and minimal - think terminal aesthetic, monospace-friendly design.

Icon 1 - "Stacked Layout":
Two rectangular frames stacked vertically, one above the other, with a small gap between them. Use clean, thin lines (1-2px). The frames should be simple outlines, no fills. The overall shape should fit within a 24x24px square. The design should convey "vertical stacking" or "two items on top of each other".

Icon 2 - "Slider Layout":
Two rectangular frames positioned side by side horizontally, with a vertical divider line in the center. The divider should have small left/right arrow indicators or chevrons to suggest it's draggable/interactive. Use clean, thin lines (1-2px). The frames should be simple outlines, no fills. The overall shape should fit within a 24x24px square. The design should convey "side-by-side comparison with interactive slider".

Both icons should:
- Be monochrome (white/light gray on black)
- Use geometric shapes only
- Have no gradients, shadows, or effects
- Be pixel-perfect and crisp
- Match a terminal/minimal aesthetic
- Be easily recognizable at small sizes (24x24px)
- Use consistent line weights
- Have no decorative elements beyond the core concept

Output format: PNG with transparency, 24x24px, or SVG format preferred.
```

## Technical Requirements

- **Format:** SVG preferred, or PNG with transparency
- **Size:** 24x24px (or scalable vector)
- **Color:** White/light gray (#e5e5e5) on transparent/black background
- **Style:** Line art, outline only, no fills
- **Line weight:** 1-2px equivalent
- **Background:** Transparent (will be placed on app's dark background)

## Integration Notes

The icons will replace the placeholder emojis (📊 and ↔️) in the header buttons of the PhotoComparisonScreen. The icons should be imported as React Native Image components or SVG components depending on the format generated.

## File Locations

Once generated, the icons should be placed in:
- `assets/icons/` directory (create if needed)
- Or use a React Native icon library if preferred

The code currently has placeholders at:
- `src/screens/PhotoComparisonScreen.tsx` lines ~162-164 and ~170-172


