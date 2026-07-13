/**
 * Integration surface (OWNER: PROOF). The app mounts `<IntegrationApp />` to get
 * the assembled Wave 1 product — chat, canvas, and history wired together.
 */

export { IntegrationApp } from "./IntegrationApp";
export { useDemoCanvasAdapter } from "./useDemoCanvasAdapter";
export { useConvexCanvasAdapter } from "./useConvexCanvasAdapter";
export { useConvexHistoryAdapter } from "./useConvexHistoryAdapter";
export { createConvexChatBackend } from "./convexChatBackend";
export { buildDemoSeed, buildDemoChatItems } from "./demoSeed";
export type { DemoSeed, DemoArtifact, DemoTab } from "./demoSeed";
export { resolveWorkspaceMode, bannerFor } from "./workspaceMode";
export type { WorkspaceMode, LiveDataProbe, BannerCopy } from "./workspaceMode";
