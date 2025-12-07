'use client';

import { Store } from '@tanstack/store';
import { useSyncExternalStore } from 'react';

type PendingAction =
  | { type: 'comment'; postId: string; text: string }
  | { type: 'reaction'; postId: string; emoji: string }
  | null;

type UIState = {
  nameDialogOpen: boolean;
  newPostDialogOpen: boolean;
  pendingAction: PendingAction;
  optimisticReactions: Record<string, Record<string, number>>;
};

const uiStore = new Store<UIState>({
  nameDialogOpen: false,
  newPostDialogOpen: false,
  pendingAction: null,
  optimisticReactions: {},
});

export function setNameDialogOpen(open: boolean, pending: PendingAction = null) {
  uiStore.setState((prev) => ({
    ...prev,
    nameDialogOpen: open,
    pendingAction: pending ?? prev.pendingAction,
  }));
}

export function setNewPostDialogOpen(open: boolean) {
  uiStore.setState((prev) => ({ ...prev, newPostDialogOpen: open }));
}

export function applyOptimisticReaction(postId: string, emoji: string) {
  uiStore.setState((prev) => {
    const postCounts = prev.optimisticReactions[postId] ?? {};
    const nextCount = (postCounts[emoji] ?? 0) + 1;
    return {
      ...prev,
      optimisticReactions: {
        ...prev.optimisticReactions,
        [postId]: { ...postCounts, [emoji]: nextCount },
      },
    };
  });
}

export function clearOptimisticReactions(postId: string) {
  uiStore.setState((prev) => {
    const clone = { ...prev.optimisticReactions };
    delete clone[postId];
    return { ...prev, optimisticReactions: clone };
  });
}

export function useUIState<T>(selector: (state: UIState) => T) {
  return useSyncExternalStore(
    (callback) => uiStore.subscribe(() => callback()),
    () => selector(uiStore.state),
    () => selector(uiStore.state),
  );
}

export function getUIStateSnapshot() {
  return uiStore.state;
}
