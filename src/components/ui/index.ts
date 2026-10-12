// Franco UI component library — single source of truth for shared UI.
// Import from here, not from individual files:
//
//   import { Button, Panel, Stack, Text } from '../components/ui';
//
// Prop types ship alongside each component (`export type XProps`);
// import types with `import type { ButtonProps } from '../components/ui'`.

export { Stack, Page } from './Stack';
export type { StackProps, PageProps, StackGap } from './Stack';
export { Box } from './Box';
export type { BoxProps, BoxGap } from './Box';
export { Text, PageHeader } from './Text';
export type { TextProps, PageHeaderProps, TextVariant } from './Text';
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';
export { Panel, PanelHeader } from './Panel';
export type { PanelProps, PanelHeaderProps } from './Panel';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Tabs } from './Tabs';
export type { TabsProps, TabsVariant, TabOption } from './Tabs';
export { Badge, QueueKindLabel } from './Badge';
export type { BadgeProps, BadgeVariant, QueueKindLabelProps } from './Badge';
export { Feedback, ErrorMessage } from './Feedback';
export type { FeedbackProps, FeedbackTone, ErrorMessageProps } from './Feedback';
export { Field, Textarea } from './Field';
export type { FieldProps, TextareaProps } from './Field';
export { ProgressBar, SkeletonBar } from './ProgressBar';
export type { ProgressBarProps, SkeletonBarProps } from './ProgressBar';
export { ProgressRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { LoadingScreen } from './Loading';
export { NavButton, Brand } from './Nav';
export type { NavButtonProps, BrandProps } from './Nav';
export { RecordCount, StatGroup, ProfileRows, DataContract, ProgressRecords } from './Data';
export type {
  RecordCountProps, StatGroupProps, ProfileRowsProps, LearnerProfile,
  DataContractProps, ProgressRecordsProps, ProgressRow,
} from './Data';
export { StreakChip, StreakHero, StreakHeatmap, StreakPanel } from './Streak';
export type {
  StreakChipProps, StreakHeroProps, StreakHeatmapProps, StreakPanelProps,
  StreakPayload, StreakDay,
} from './Streak';
export { Checklist } from './Checklist';
export type { ChecklistProps, ChecklistItem } from './Checklist';
export { Steps } from './Steps';
export type { StepsProps, Step } from './Steps';
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { Banner } from './Banner';
export type { BannerProps } from './Banner';
export { Toolbar } from './Toolbar';
export type { ToolbarProps } from './Toolbar';
export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';
export { AudioPlayer } from './AudioPlayer';
export type { AudioPlayerProps } from './AudioPlayer';
export { ReadingPassage } from './ReadingPassage';
export type { ReadingPassageProps } from './ReadingPassage';
export { RubricBox } from './RubricBox';
export type { RubricBoxProps } from './RubricBox';
export { WordToken, TokenTray } from './Token';
export type { WordTokenProps, TokenTrayProps, TokenTrayVariant } from './Token';
export { ExerciseEyebrow, ExerciseShell, OptionList, AnswerForm } from './Exercise';
export type {
  ExerciseEyebrowProps, ExerciseShellProps, AnsweredState,
  OptionListProps, ExerciseOption, AnswerFormProps,
} from './Exercise';
export { ReportButton } from './Report';
export type { ReportButtonProps, ReportState } from './Report';
