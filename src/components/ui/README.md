# Franco UI — component library

Single source of truth for shared UI. Everything in this folder is a
reusable, prop-driven component. Rules:

- **Strict boundary (FRA-21).** Only files inside `src/components/ui/`
  may render native/intrinsic JSX elements (`div`, `span`, `button`, …)
  or use `style={}` props. Everything else in `src/` composes this
  library. Enforced by `npm run lint:ui`
  (`scripts/lint-ui-boundary.mjs`), which parses every
  `src/**/*.jsx|js` file's AST outside `src/components/ui/` and fails
  on any intrinsic element or `style={` prop. (`index.html` is out of
  scope; `React.Fragment` is fine.)
- **No `className` or `style` props on semantic components.**
  Components expose explicit semantic/layout props instead
  (`direction`, `gap`, `variant`, `tone`, `centered`, `nowrap`,
  `layout`, …) and own their visual mapping internally. If a treatment
  has no prop yet, add one — do not reach for className. The one
  exception is data-driven values that cannot be expressed as classes
  (e.g. `ProgressBar`'s fill width) — those live *inside* the
  component, never as a caller-supplied style.
- **Primitives may take `className`.** `Box`, `Text`, and `TextInput`
  — and only these three — accept a `className` prop so they can carry
  the app's existing `styles.css` hooks 1:1 when replacing an intrinsic
  element (`<div className="stack">` → `<Box className="stack">`).
  Everything else is passed via props (`as`, `href`, `onClick`,
  `aria-*`, layout props, …). Semantic components keep their fixed
  internal classes.
- **Visual contract = `src/styles.css`.** Components render the same
  classNames the app already used, so adopting them causes no visual
  regressions. Do not invent new visual variants here without a
  matching CSS class.

Import from the barrel:

```jsx
import { Button, Panel, Stack, Text } from '../components/ui';
```

## Presenters

Reusable helper logic lives in `src/presenters/` as pure functions (no JSX):

- File naming: `<name>.presenter.js`, with colocated tests in
  `<name>.presenter.test.js` (e.g. `format.presenter.js` +
  `format.presenter.test.js`).
- Only logic used **more than once** goes here. Single-use logic stays in
  its component.
- Every presenter module has test coverage; the `*.presenter.test.js`
  files run as part of `npm test`.
- Presenters never render JSX and never touch the DOM — they compute
  values (labels, states, formatted text, sanitized entries) that
  components consume via props.

## Components

| Component | Props | Renders |
|---|---|---|
| `Box` | `as` (default `div`), `className`, `display`, `direction` (`row`\|`column`), `gap` (`xs`\|`sm`\|`md`\|`lg`\|`xl`, same scale as `Stack`), `align`, `justify`, `wrap`, `id`, `role`, `title`, `type`, `disabled`, `onClick`, `onSubmit`, `href`, `target`, `rel`, `viewBox`, `preserveAspectRatio`, `d`, `aria-*` | Structural primitive: the tag given by `as` with the caller's `className`. Layout props map to an inline style owned by the component, computed only when at least one is set — otherwise no `style` attribute renders. No `style` prop, no other arbitrary props (non-`aria-*` extras are dropped). |
| `Stack` | `as`, `display` (`flex`\|`grid`), `direction` (`row`\|`column`), `gap` (`xs`\|`sm`\|`md`\|`lg`\|`xl`), `align`, `justify`, `wrap` | Flex/grid layout primitive (inline style owned by the component) |
| `Page` | `children` | `section.page-stack` page container |
| `Text` | `variant` (`body`\|`muted`\|`eyebrow`\|`lede`\|`note`), `size` (`sm`), `nowrap`, `as` (default `p`), `className` | Typography. `className` is appended after the variant/size classes so it can carry an existing `styles.css` hook (e.g. `concept-subtitle`, `reveal-word`, `lede-sub`). |
| `TextInput` | `type`, `name`, `value`, `onChange`, `onKeyDown`, `placeholder`, `autoComplete`, `autoFocus`, `required`, `className`, `aria-*` | Bare `<input>` (no wrapper class) for the places that render an input directly instead of inside `Field`. |
| `PageHeader` | `eyebrow`, `title`, `lede` | `eyebrow` + `h1.page-title` + `p.lede` |
| `Button` | `variant` (`primary`\|`text`\|`retry`\|`reset`\|`nav`\|`report`), `wide`, `centered`, `active`, `type`, `disabled`, `loading`, `icon`, `iconSize`, `iconPosition`, `onClick` | App buttons |
| `Panel` | `compact`, `layout` (`grid`), `as` | `section.panel` card |
| `PanelHeader` | `eyebrow`, `title`, `aside` | `div.panel-title` heading row |
| `Tabs` | `variant` (`section`\|`library`\|`roadmap`), `options` (`{id,label,icon}[]`), `value`, `onChange`, `compact`, `ariaLabel` | Tab rows |
| `Badge` | `variant` (`queue`\|`stub`\|`timer`\|`roadmap`), `kind`, `icon`, `children` | Pills/badges |
| `QueueKindLabel` | `kind` | `Badge variant="queue"` (legacy alias) |
| `Feedback` | `tone` (`correct`\|`incorrect`\|`info`), `title`, `message`, `revealLabel`, `reveal`, `onRetry`, `retryLabel`, `children` | `div.mcq-feedback` |
| `ErrorMessage` | `message` | `p.error-message` |
| `Field` | `label`, `icon`, `iconSize`, + input props | Labeled `input-wrap` field |
| `Textarea` | `rows`, + textarea props | `textarea.free-text-input` |
| `ProgressBar` | `label`, `percent`, `skeleton` | `div.skill-row` meter |
| `SkeletonBar` | `label` | `ProgressBar skeleton` (legacy alias) |
| `EmptyState` | `icon`, `title`, `text`, `action` | `div.empty-state` |
| `LoadingScreen` | — | Auth-style loading splash |
| `Modal` | `onClose`, `closeLabel`, `children`, + `ref` (forwardRef to the dialog node, for ref-based outside-click checks) | `div.concept-modal` dialog; Escape closes while open |
| `NavButton` | `icon`, `active`, `onClick` | Sidebar nav button |
| `Brand` | `large`, `onClick`, `label` | `fr` brand mark |
| `UserMenu` | `name`, `level`, `onClick` | Accessible sidebar/phone profile control |
| `StreakCard` | `streak` | Real current/best streak and zero state on Home |
| `SkillCard` | `title`, `gloss`, `description`, `done`, `total`, `percent`, `loading`, `onStart` | Shared skill box with donut; optional Start disabled for empty inventory |
| `RecordCount` | `count`, `label` | Big-number stat |
| `StreakChip` | `streak` | Sidebar flame chip (FRA-44) |
| `StreakHero` | `streak` | Home daily-panel streak summary / empty strip (FRA-44) |
| `StreakHeatmap` | `days`, `today` | GitHub-style activity heatmap (FRA-44) |
| `StreakPanel` | `streak` | Progress consistency panel: stats + heatmap (FRA-44) |
| `StatGroup` | `children` | `div.session-stats` |
| `ProfileRows` | `profile` | `div.record-list` rows |
| `DataContract` | `title`, `items` | `section.panel` + `ul.clean-list` |
| `ProgressRecords` | `progress` | `div.progress-grid` of compact panels |
| `Checklist` | `items` (`{id,title,sub}[]`), `checked`, `onToggle` | `ul.checklist` |
| `Steps` | `steps` (`{title,text}[]`) | `div.steps-row` |
| `Chip` | `icon`, `children` | `span.timer-chip` |
| `Banner` | `icon`, `title`, `text`, `actionLabel`, `onAction` | `div.placement-banner` |
| `Toolbar` | `meta`, `actions` | `div.session-toolbar` |
| `CollapsibleSection` | `title`, `badge`, `defaultOpen`, `children` | `details.content-module` |
| `AudioPlayer` | `src`, `transcript`, `emptyText` | `div.audio-player` |
| `ReadingPassage` | `title`, `text` | `div.reading-passage` |
| `RubricBox` | `title`, `items` (nodes) | `div.rubric-box` |
| `WordToken` | `placed`, `disabled`, `onClick` | `button.word-token` |
| `TokenTray` | `variant` (`answer`\|`bank`), `label`, `emptyHint` | Token drop zones |
| `ExerciseShell` | `eyebrow`, `answered` (`correct`\|`wrong`\|null) | `article.exercise-preview.mcq-card` |
| `ExerciseEyebrow` | `level`, `kind` | `level · kind` kicker |
| `OptionList` | `options` (`{key,label}[]`), `selectedKey`, `answered`, `correct`, `disabled`, `onSelect` | `div.mcq-options` |
| `AnswerForm` | `rows`, `value`, `onChange`, `placeholder`, `disabled`, `submitDisabled`, `hideSubmit`, `submitLabel`, `submitting`, `submittingLabel`, `onSubmit` | `form` + `Textarea` + submit `Button` |
| `ReportButton` | `itemId`, `token` | Report-a-problem toggle + form |
