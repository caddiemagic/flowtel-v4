# Flowtel Medicine Wheel v1.0 Design Specification

## Status

Design freeze for Flowtel Release 0.4.5a.

The Medicine Wheel is now a stable Flowtel design-system element. Future releases may refine accessibility, hover behavior, animation, or data overlays, but should not change the core geometry, ring placement, visual proportions, or hospitality language unless the design specification is intentionally revised.

## Design Goal

The Medicine Wheel should feel like a clean luxury cream-and-gold compass inside a boutique hotel suite: sacred, feminine, spacious, precise, and deeply intentional.

The wheel is not a technical chart. It is a ritual compass that gently orients each guest back to her current room, inner season, and reflection.

## Color + Mood

Use the existing Flowtel palette:

- Warm cream background
- Soft gold accents
- Blush rose highlights
- Dark brown typography
- Gentle shadows
- Subtle gradients

Avoid:

- Dark UI
- Black backgrounds
- Heavy mystical clutter
- Cartoon icons
- Flat gold
- Extra rings
- Technical chart styling

## Wheel Geometry

The Medicine Wheel uses 28 equal positions around the circle.

Required geometry:

- Day 1 sits directly below WEST.
- Day 28+ sits directly above WEST.
- Day numbers count counter-clockwise.
- All 28 day markers are equally spaced.
- The gap between Day 1 and Day 28+ is the normal 1/28 circle gap, not an oversized opening.

## Gold Ring Placement

This is the canonical rule:

- There are exactly two gold concentric rings around the day-number path.
- One gold ring sits inside the number circles.
- One gold ring sits outside the number circles.
- The number circles sit centered between the two gold rings.
- Remove any extra thin ring.
- Remove any large outer ring.
- Both rings use the same gold color and line treatment.

## Day Number Circles

Each day marker should feel like a small, polished room key medallion.

Requirements:

- 28 total circles.
- Even spacing.
- Larger than earlier prototypes.
- Comfortable visible gap between circles.
- Light cream or white fill.
- Thin gold border.
- Dark brown centered serif number.
- Day 28 displays as `28+`.

The circles must never touch each other and must remain centered between the two gold rings.

## Active Day Marker

The active room marker should feel like a luxury compass glint.

Requirements:

- Use a gold star or diamond.
- It must hover precisely centered over the active day circle.
- It should not sit beside, above, or offset from the active day.
- It should feel intentional and elegant, not decorative clutter.

## Cardinal Directions

Display:

- NORTH
- EAST
- SOUTH
- WEST

Placement:

- Outside the day-number ring.
- Inside the wheel card boundary.
- Not covered by number circles.
- Aligned with the four compass directions.

Typography:

- Elegant serif.
- Uppercase.
- Small.
- Subtle dark brown or soft gold-brown.
- Spacious letter spacing.

## Inner Season Blocks

The four Inner Season blocks sit in the four corners of the wheel card, outside the wheel perimeter.

Required placement:

- Top left: Inner Autumn, Days 20–26
- Top right: Inner Summer, Days 12–19
- Bottom right: Inner Spring, Days 6–11
- Bottom left: Inner Winter, Days 27–5

Requirements:

- Do not overlap the wheel.
- Preserve generous spacing from the wheel and card edges.
- Maintain the existing soft cream card styling.
- Keep the icons small and refined.

## Rose Compass Center

The Rose Compass is the visual anchor of the Medicine Wheel.

It should be a polished gold rose compass, blending:

- An 8-point compass rose
- A blooming rose spiral
- Layered petals
- Subtle flourishes
- Dimensional gold gradients
- Sacred geometry guide lines

Required proportions:

- Centered exactly within the wheel.
- Scales proportionally with the wheel.
- Occupies approximately 40–45% of the wheel diameter.
- Never overlaps the inner gold ring.
- Never interferes with day circles.

Avoid:

- Plain pillars
- Simple arrows only
- Flat icon look
- Unfinished linework
- Heavy mystical symbols

## You Are Here Legend

The legend sits below SOUTH, outside the wheel.

Required structure:

- Gold star/diamond icon
- `YOU ARE HERE`
- Helper text: `Click on a day to see your previous visits below.`

Placement:

- Bottom center of the wheel card.
- Never overlapping SOUTH.
- Never overlapping day circles.

## Moon Magic + Reflection

The standalone Moon Magic card is removed.

Moon Magic data lives inside the Reflection card because the moon represents reflection.

Reflection card structure:

- REFLECTION title
- Moon Magic row/pill
- Moon phase
- Moon day
- Moon theme
- Existing moon copy when available
- Reflection textarea
- Save Reflection button

The card should feel like one intentional reflective space, not two stacked unrelated modules.

## Suite Layout

The Suite uses balanced left/right columns.

Requirements:

- Medicine Wheel remains on the left.
- Right column remains available for Suite, Concierge, and room content.
- Medicine Wheel card may stretch vertically to match the right column height.
- Wheel itself remains centered inside the card.
- The layout should feel symmetrical, calm, and spacious.
- The wheel should never feel cramped by surrounding content.

## Responsive Behavior

On smaller screens:

- Stack columns vertically.
- Keep the wheel centered.
- Reduce circle size proportionally.
- Preserve equal day spacing.
- Season blocks may move closer but should not cover day circles.
- Cardinal directions remain legible and inside the card boundary.

## Future Interaction Rules

Future features may add:

- Hover states
- Room history previews
- Passport stamps
- Moon overlays
- Rewards markers
- Practitioner milestones

Any future overlay must preserve:

- Ring placement
- Number spacing
- Active marker precision
- Rose Compass center dominance
- Four-corner Inner Season placement

