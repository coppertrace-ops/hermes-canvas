"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Tab, TabList, IconButton } from "@hermes/ui";
import { ChangedBadge } from "@hermes/render";
import type { CanvasTabView } from "@hermes/render";

/**
 * Canvas tab bar (PANES; plan §7 "tab bar + tab lifecycle UI", §2.2 tab rules).
 *
 * Presentational + callback-driven: the parent (or the canvas shell) owns tab
 * state and supplies the lifecycle callbacks. Removal is archive-only — there is
 * no delete affordance, matching the API. Each tab surfaces its aggregate
 * changed-since-you-last-looked count via {@link ChangedBadge} (plan §3).
 *
 * Reorder is exposed as accessible move-left/move-right controls (one mutation
 * each) rather than only drag, so it works from the keyboard; a drag layer can be
 * added later without changing this contract.
 */
export interface TabBarProps {
  /** Active (non-archived) tabs. Rendered in `order`, ascending. */
  tabs: CanvasTabView[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCreateTab: (title: string) => void;
  onRenameTab: (tabId: string, title: string) => void;
  /** Move `tabId` to `toIndex` in the active-tab ordering. */
  onReorderTab: (tabId: string, toIndex: number) => void;
  onArchiveTab: (tabId: string) => void;
  /** Title used when the "+" control creates a tab (parent may then rename). */
  newTabTitle?: string;
  className?: string;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onReorderTab,
  onArchiveTab,
  newTabTitle = "New tab",
  className,
}: TabBarProps) {
  const ordered = [...tabs].sort((a, b) => a.order - b.order);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startRename = (tab: CanvasTabView) => {
    setEditingId(tab.id);
    setDraft(tab.title);
  };

  const commitRename = (tabId: string) => {
    const next = draft.trim();
    if (next.length > 0) onRenameTab(tabId, next);
    setEditingId(null);
    setDraft("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraft("");
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, tabId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(tabId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <div className={className ? `hc-tabbar ${className}` : "hc-tabbar"}>
      <TabList className="hc-tabbar__list" aria-label="Canvas tabs">
        {ordered.map((tab, index) => {
          const isEditing = editingId === tab.id;
          return (
            <div key={tab.id} className="hc-tabbar__item" data-active={tab.id === activeTabId || undefined}>
              {isEditing ? (
                <input
                  className="hc-tabbar__rename"
                  aria-label={`Rename ${tab.title}`}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => onEditKeyDown(e, tab.id)}
                  onBlur={() => commitRename(tab.id)}
                />
              ) : (
                <Tab
                  selected={tab.id === activeTabId}
                  onClick={() => onSelectTab(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                  trailing={
                    tab.changedCount > 0 ? (
                      <ChangedBadge count={tab.changedCount} label={tab.title} className="hc-tabbar__badge" />
                    ) : undefined
                  }
                >
                  {tab.title}
                </Tab>
              )}

              <span className="hc-tabbar__controls" aria-hidden={isEditing || undefined}>
                <IconButton
                  label={`Move ${tab.title} left`}
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onReorderTab(tab.id, index - 1)}
                >
                  <span aria-hidden>‹</span>
                </IconButton>
                <IconButton
                  label={`Move ${tab.title} right`}
                  size="sm"
                  disabled={index === ordered.length - 1}
                  onClick={() => onReorderTab(tab.id, index + 1)}
                >
                  <span aria-hidden>›</span>
                </IconButton>
                <IconButton label={`Rename ${tab.title}`} size="sm" onClick={() => startRename(tab)}>
                  <span aria-hidden>✎</span>
                </IconButton>
                <IconButton label={`Archive ${tab.title}`} size="sm" onClick={() => onArchiveTab(tab.id)}>
                  <span aria-hidden>×</span>
                </IconButton>
              </span>
            </div>
          );
        })}
      </TabList>

      <IconButton label="New tab" className="hc-tabbar__new" onClick={() => onCreateTab(newTabTitle)}>
        <span aria-hidden>＋</span>
      </IconButton>
    </div>
  );
}
