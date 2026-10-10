# Franco UI — component library

Single source of truth for shared UI. Everything in this folder is a
reusable, prop-driven component. Rules:

- **No `className` or `style` props.** Components expose explicit
  semantic/layout props instead (`direction`, `gap`, `variant`, `tone`,
  `centered`, `nowrap`, `layout`, …) and own their visual mapping
  internally. If a treatment has no prop yet, add one — do not reach
  for className. The one exception is data-driven values that cannot be
  expressed as classes (e.g. `ProgressBar`'s fill width) — those live
  *inside* the component, never as a caller-supplied style.
- **Visual contract = `src/styles.css`.** Components render the same
  classNames the app already used, so adopting them causes no visual
  regressions. Do not invent new visual variants here without a
  matching CSS class.

Import from the barrel:

```jsx
import { Button, Panel, Stack, Text } from '../components/ui';
```

## Components

| Component | Props | Renders |
|---|---|---|
| `Stack` | `as`, `display` (`flex`\|`grid`), `direction` (`row`\|`column`), `gap` (`xs`\|`sm`\|`md`\|`lg`\|`xl`), `align`, `justify`, `wrap` | Flex/grid layout primitive (inline style owned by the component) |
| `Page` | `children` | `section.page-stack` page container |
| `Text` | `variant` (`body`\|`muted`\|`eyebrow`\|`lede`\|`note`), `size` (`sm`), `nowrap`, `as` | Typography |
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
| `RecordCount` | `count`, `label` | Big-number stat |
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
