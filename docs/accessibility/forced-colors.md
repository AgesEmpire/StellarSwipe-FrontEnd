# Forced-colors accessibility notes

This app supports Windows High Contrast and browsers that expose
`forced-colors: active`.

## Findings

- Many interactive surfaces use Tailwind color utilities such as green, red,
  amber, blue, sky, and semantic accent classes.
- In forced-colors mode those custom colors can be overridden by the browser,
  which can make status badges, toggles, and focus rings lose contrast or lose
  their visual distinction.
- Key affected components include buttons, role-button cards, switch controls,
  pressed filter chips, signal direction badges, warning/error states, and
  provider/trust badges.

## Fix pattern

Global forced-colors rules live in `app/globals.css` under
`@media (forced-colors: active)`.

- Interactive controls use system colors such as `ButtonFace`, `ButtonText`,
  `Highlight`, and `HighlightText`.
- Focus indicators use an explicit `Highlight` outline so keyboard focus stays
  visible even when box shadows are removed.
- Pressed buttons and enabled switches map to `Highlight` / `HighlightText`.
- Status badges keep meaning without relying only on color:
  - success / BUY states use a solid border
  - danger / SELL states use a double border
  - warning states use a dashed border
- Blue / informational controls map to `LinkText` on `ButtonFace`.

## Guidance for new components

For new components, prefer semantic class names and ARIA state attributes
before adding one-off colors:

- use `aria-pressed` for toggle buttons
- use `role="switch"` with `aria-checked` for switches
- preserve a visible `:focus-visible` state
- do not rely on color alone for status badges; pair color with text, icon, or
  border style
- test new components with `forced-colors: active` browser emulation before
  shipping
