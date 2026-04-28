# Bigscreen Responsive Layout Design

## Summary

This change replaces the current fixed `1920x1080` scale-based bigscreen shell with a true full-screen responsive layout. The target display profile is `21:9`, with the main dashboard stretched by layout reflow rather than by `transform: scale()`.

The existing dashboard structure and visual language will be preserved:

- left column remains a three-block information rail
- center top remains the main map / primary visualization area
- right column remains a single information rail
- bottom band continues to span the center and right regions

The approved primary layout ratio for the inspection dashboard is:

- left: `22`
- center: `54`
- right: `24`

The page will also gain a black translucent overlay above the background image to stabilize contrast on large displays.

## Goals

- Fill the entire viewport with a responsive dashboard layout.
- Optimize the default layout for `21:9` screens.
- Let all three columns grow with screen width, while keeping the center area more prominent.
- Narrow the left rail slightly compared with the current visual balance.
- Flatten and refine the header for ultra-wide displays.
- Add a black translucent background mask without changing business functionality.

## Non-Goals

- No redesign of business data, routing, or API behavior.
- No rewrite of child dashboard widgets unless a local style fix is required for fit.
- No changes to IFC pages or non-bigscreen pages.
- No global theme redesign beyond spacing, sizing, and contrast adjustments needed for responsive behavior.

## Current State

The current bigscreen entry uses a fixed-size shell in [src/views/home.vue](/d:/2313041935Program/ioftv-deploy-20260413050837/src/views/home.vue) via `ScaleScreen`, with a `1920x1080` design surface. That approach uses scaling to fit the viewport instead of allowing the layout itself to reflow. The main visual issues on ultra-wide displays are:

- layout proportions are inherited from a 16:9 design surface
- header height and spacing are visually too tall on 21:9 screens
- top-left controls use fixed positioning and do not participate in the page rhythm
- background brightness can compete with foreground panels and text

## Chosen Approach

Use pure CSS responsive layout for the bigscreen shell and dashboard body.

### Core decisions

- Remove the fixed-size scale dependency from the bigscreen home shell.
- Make the bigscreen root occupy `100vw` and `100vh`.
- Use CSS Grid for the main dashboard frame.
- Use responsive sizing primitives such as `minmax()` and `clamp()` for columns, rows, gaps, header height, and typography.
- Tune the inspection dashboard for `21:9` first, while maintaining acceptable behavior on `16:9`.

### Why this approach

This provides true responsive behavior instead of visual stretching. It also avoids the maintenance problems of mixing a scaled outer shell with responsive inner panels.

## Layout Design

### Shell

The bigscreen shell becomes a full-viewport container with:

- width: `100vw`
- height: `100vh`
- overflow hidden at the shell level
- internal padding controlled by `clamp()` so edge spacing scales with large screens

### Background and overlay

The current background image remains in use. A black translucent overlay will be added above the image and below dashboard content.

Recommended mask behavior:

- default opacity target: `rgba(0, 0, 0, 0.34)`
- implementation may tune within a narrow band around that value only if needed for readability

The overlay is intended to improve contrast, not to materially darken the entire page.

### Header

The header remains visually recognizable but becomes flatter and more proportional on ultra-wide screens.

Changes:

- header height changes from fixed pixel emphasis to `clamp(...)`
- logo size becomes responsive
- title font size becomes responsive
- time area font size becomes responsive
- spacing between decorative elements is reduced for 21:9

### Dashboard body

The inspection view uses a two-row, three-column grid.

Primary column ratio:

- left: `22fr`
- center: `54fr`
- right: `24fr`

Row model:

- row 1: primary content row
- row 2: lower supporting band

Placement:

- left column spans both rows
- center top occupies row 1 center
- right top occupies row 1 right
- bottom band spans row 2 center through right

### Controls and density polish

The theme toggle, mode toggle, and version button area may be repositioned so it works as part of the responsive shell instead of floating via rigid pixel offsets.

Spacing changes:

- panel gaps become responsive
- border radius and inner paddings become responsive within a bounded range
- bottom band height gains flexibility so it does not appear too compressed on 21:9

## File-Level Change Plan

### [src/views/home.vue](/d:/2313041935Program/ioftv-deploy-20260413050837/src/views/home.vue)

- remove the fixed `ScaleScreen` wrapper usage from the bigscreen home page
- keep the bigscreen root as the full-screen page shell
- preserve the existing router-driven content insertion pattern

### [src/views/home.scss](/d:/2313041935Program/ioftv-deploy-20260413050837/src/views/home.scss)

- rebuild outer shell sizing around viewport units
- add the black translucent overlay layer
- refactor header sizing, shell padding, and overall frame spacing
- maintain current visual identity where possible

### [src/views/indexs/index.vue](/d:/2313041935Program/ioftv-deploy-20260413050837/src/views/indexs/index.vue)

- refactor the inspection layout grid to the approved `22 / 54 / 24` ratio
- make button placement responsive
- tune row heights, panel spacing, and ultra-wide balance

### [src/components/scale-screen/scale-screen.vue](/d:/2313041935Program/ioftv-deploy-20260413050837/src/components/scale-screen/scale-screen.vue)

- no planned functional change
- the component may remain untouched if it is no longer used by the bigscreen shell

## Data Flow and Behavior

This is a presentation-layer change only.

- no route contract changes
- no store contract changes
- no API contract changes
- no widget data transformations introduced

All existing page behavior should remain the same after layout refactor.

## Error Handling and Fallbacks

- If a child panel overflows after the shell becomes responsive, fix the nearest layout container first rather than reintroducing scale behavior.
- If some widgets assume fixed heights, add local min-height or overflow rules only where required.
- If a specific 16:9 layout regresses, prefer bounded responsive constraints instead of separate duplicated templates.

## Verification Plan

### Manual viewport checks

Check at least:

- `21:9` target layout
- `16:9` baseline layout

Validate:

- page fills the full viewport without scale margins
- left column is visibly narrower than before, but not cramped
- center region feels wider and more usable
- header appears flatter on ultra-wide screens
- bottom band remains visually balanced
- overlay improves contrast without obscuring the background
- control buttons remain accessible and well aligned

### Regression checks

- login and route entry to bigscreen still work
- theme switching still works
- inspection / sales mode switching still works
- no IFC pages are affected

## Risks

- Some child widgets may have implicit fixed-height assumptions.
- Decorative assets sized for 16:9 may need minor responsive constraints.
- Over-tightening the left column could reduce legibility; the approved `22 / 54 / 24` ratio is intentionally conservative to manage that risk.

## Acceptance Criteria

- The dashboard no longer relies on a `1920x1080` scale shell to adapt to screen size.
- The bigscreen fills the viewport directly.
- The inspection layout uses the approved `22 / 54 / 24` responsive column balance.
- The page is visually improved for `21:9` screens.
- A black translucent overlay exists above the background image.
- Existing business behavior is preserved.
