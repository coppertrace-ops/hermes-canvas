/**
 * Chat subsystem public surface (OWNER: COURIER, plan §7).
 *
 * The app integrates chat through this barrel only. Today: mount `<MockChatPane />`
 * for a self-contained surface, or `<ChatProvider backend={…}><ChatPane/></…>` to
 * supply your own backend. When the live loop lands, a Convex-backed `ChatBackend`
 * is passed to `<ChatProvider>` and nothing else here changes.
 */

// --- Assembled surfaces ------------------------------------------------------
export { ChatPane, MockChatPane } from "./ChatPane";
export type { ChatPaneProps } from "./ChatPane";

// --- Seam (provider + hook + backend contract) -------------------------------
export { ChatProvider, useChat, useChatBackend } from "./ChatProvider";
export type { ChatProviderProps, UseChat } from "./ChatProvider";
export type { ChatBackend, SendDraft, UploadCallbacks, UploadFile, UploadHandle } from "./backend";

// --- Backends ----------------------------------------------------------------
export { createMockChatBackend } from "./mockBackend";
export type { MockBackendOptions, MockChatBackend } from "./mockBackend";

// --- Components (for custom layouts) -----------------------------------------
export { MessageList } from "./MessageList";
export type { MessageListProps } from "./MessageList";
export { MessageBubble } from "./MessageBubble";
export type { MessageBubbleProps } from "./MessageBubble";
export { SystemEventRow } from "./SystemEventRow";
export type { SystemEventRowProps } from "./SystemEventRow";
export { ToolCallRow, ToolCallCluster } from "./ToolCallRow";
export type { ToolCallRowProps, ToolCallClusterProps } from "./ToolCallRow";
export { Composer } from "./Composer";
export type { ComposerProps } from "./Composer";
export { AttachmentPicker } from "./AttachmentPicker";
export type { AttachmentPickerProps } from "./AttachmentPicker";
export { ConnectionBanner } from "./ConnectionBanner";
export { CopyButton } from "./CopyButton";
export type { CopyButtonProps } from "./CopyButton";
export { StreamingDots } from "./StreamingDots";
export { AttachmentPreview, ProgressBar } from "./AttachmentPreview";
export type { AttachmentPreviewProps } from "./AttachmentPreview";

// --- View-model types + pure helpers -----------------------------------------
export type {
  AttachmentStatus,
  AttachmentView,
  ChatItem,
  ChatMessage,
  ChatRole,
  ChatSnapshot,
  ConnectionState,
  MessageStatus,
  SystemEvent,
  ToolCall,
  ToolCallStatus,
} from "./types";
export {
  describeToolStatus,
  formatToolDuration,
  isSubagentCall,
  majoritySession,
} from "./toolCalls";
export type { ToolStatusMeta } from "./toolCalls";
export {
  MAX_ATTACHMENT_BYTES,
  attachmentStatusTone,
  canSendDraft,
  formatBytes,
  guardAttachment,
  isImageMime,
} from "./attachments";
export type { FileLike, GuardResult } from "./attachments";
export { describeSystemEvent, isSystemLineKind } from "./events";
export { buildTimeline } from "./timeline";
export { GROUP_WINDOW_MS, layoutTimeline } from "./grouping";
export type { DayDividerRow, MessageRow, SystemRow, TimelineRow, ToolRow, ToolClusterRow } from "./grouping";
export {
  dayKey,
  formatDayDivider,
  formatExactTime,
  formatMessageTime,
  isSameDay,
} from "./time";
