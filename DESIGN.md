---
version: alpha
colors:
  background: '#12171e'
  surface: '#171e27'
  primary: '#64d6a4'
  text: '#c3cbd6'
  warning: '#e4bd7b'
  danger: '#ff9299'
typography:
  body:
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  code:
    fontFamily: 'Consolas, monospace'
rounded:
  control: '5px'
---
# Schneider PLC AI Studio

## Overview
Desktop engineering workbench, Italian locale, operators/programmers on Windows. Preserve the existing VS Code-like workspace. No marketing styling or decorative process animation.

## Colors
Runtime owner is frontend/src/style.css; the synoptic adapter maps --plant-* to the shared --studio-* variables defined there. Green means an observed active BOOL, amber marks assumptions pending confirmation, red indicates an observed alarm; labels accompany every state. Unknown is grey, never implicitly OFF.

## Typography
Segoe UI for controls, Consolas for code, variable names and simulation values. SVGs use the same palette and no external fonts.

## Layout
Existing desktop shell owns viewport/scrolling. Synoptic has a bounded React Flow canvas and scrollable inspector; inputs and warnings retain space. At narrow desktop width inspector moves below canvas. No change to sibling editor/archive layouts.

## Elevation & Depth
Flat engineering canvas, dotted grid, no animated flows suggesting physical transport.

## Shapes
Local fixed SVG motor, pump, valve, tank, sensor, button, lamp and numeric symbols. AI chooses only an allowlisted symbol name, never markup.

## Components
React Flow owns graph interaction; native labelled selects/inputs own forms; application statusbar owns save feedback; inline live messages own synoptic validation errors. Numeric X/Y fields and source/target selectors are keyboard alternatives to dragging.

## Do's and Don'ts
Show evidence/provenance on elements, associations and links. All links are functional references, never physical pipes/wiring. No level/fill animation inferred from a timer or BOOL. Keep user edits and tombstones through regeneration.
