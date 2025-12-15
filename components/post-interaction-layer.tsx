"use client";

import { addReaction } from "@/app/actions";
import { CommentForm } from "@/components/comment-form";
import { CommentList, type CommentWithAuthor } from "@/components/comment-list";
import { EmojiRain } from "@/components/emoji-rain";
import { ReactionListDialog } from "@/components/reaction-list-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Post } from "@/db/schema";
import { setNameDialogOpen } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import {
  LaughIcon,
  MessageCircle,
  Plus,
  Smile,
  SmilePlus,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

const ALL_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👏",
  "🎉",
  "🔥",
  "💯",
  "👀",
  "🤝",
  "🙏",
  "💪",
  "🧠",
  "🚀",
  "🤔",
  "🤷",
  "🤡",
  "💩",
  "👻",
  "💀",
  "👽",
];

type Props = {
  postId: string;
  post: Post;
  counts: Record<string, number>;
  comments: CommentWithAuthor[];
  isAdmin: boolean;
  userReactions: string[];
};

export function PostInteractionLayer({
  postId,
  post,
  counts,
  comments,
  isAdmin,
  userReactions,
}: Props) {
  const [optimisticState, addOptimisticReaction] = useOptimistic(
    { counts, userReactions },
    (state, emoji: string) => {
      const hasReacted = state.userReactions.includes(emoji);
      const newCounts = { ...state.counts };
      let newUserReactions = [...state.userReactions];

      if (hasReacted) {
        newCounts[emoji] = Math.max(0, (newCounts[emoji] || 0) - 1);
        newUserReactions = newUserReactions.filter((e) => e !== emoji);
      } else {
        newCounts[emoji] = (newCounts[emoji] || 0) + 1;
        newUserReactions.push(emoji);
      }
      return { counts: newCounts, userReactions: newUserReactions };
    }
  );

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, newComment: CommentWithAuthor) => [newComment, ...state]
  );

  const [pending, startTransition] = useTransition();
  const [reactionDrawerOpen, setReactionDrawerOpen] = useState(false);
  const [activeRainEmoji, setActiveRainEmoji] = useState<string | null>(null);

  // State for Reaction List Dialog
  const [reactionListOpen, setReactionListOpen] = useState(false);
  const [selectedEmojiForList, setSelectedEmojiForList] = useState<
    string | null
  >(null);

  // State for Custom Emoji Dialog
  const [customEmojiDialogOpen, setCustomEmojiDialogOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  const activeReactions = useMemo(() => {
    return Object.entries(optimisticState.counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by count desc
  }, [optimisticState.counts]);

  const totalReactions = Object.values(optimisticState.counts).reduce(
    (a, b) => a + b,
    0
  );

  const handleReact = (emoji: string) => {
    setReactionDrawerOpen(false);
    setCustomEmojiDialogOpen(false);
    setCustomEmoji("");

    // Trigger rain only if adding
    const isAdding = !optimisticState.userReactions.includes(emoji);
    if (isAdding) {
      setActiveRainEmoji(null);
      setTimeout(() => setActiveRainEmoji(emoji), 10);
    }

    startTransition(async () => {
      addOptimisticReaction(emoji);
      const result = await addReaction(postId, emoji);
      if (result?.needsProfile) {
        setNameDialogOpen(true, { type: "reaction", postId, emoji });
        return;
      }
    });
  };

  const isMediaPost = !!post?.media && post?.media.length > 0;

  return (
    <>
      <EmojiRain emoji={activeRainEmoji} />

      {/* Bottom Overlay Container */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none flex items-end justify-between gap-4">
        {/* Left Side: Info & Reactions */}
        <div className="space-y-3 pointer-events-auto flex-1 min-w-0">
          {/* Text Info */}
          {isMediaPost && (
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-white drop-shadow-md line-clamp-2">
                {post.title || "Untitled Post"}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <time dateTime={new Date(post.createdAt).toISOString()}>
                  {formatDate(post.createdAt)}
                </time>
              </div>
              {post.body && (
                <p className="text-sm text-white/90 drop-shadow-sm line-clamp-3">
                  {post.body}
                </p>
              )}
            </div>
          )}

          {/* Existing Reactions */}
          {activeReactions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeReactions.map(([emoji, count]) => (
                <ReactionButton
                  key={emoji}
                  emoji={emoji}
                  count={count}
                  hasReacted={optimisticState.userReactions.includes(emoji)}
                  onClick={() => handleReact(emoji)}
                  onLongPress={() => {
                    setSelectedEmojiForList(emoji);
                    setReactionListOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-col items-center gap-6 pointer-events-auto shrink-0 pb-2">
          {/* Reaction Drawer Trigger */}
          <Drawer
            open={reactionDrawerOpen}
            onOpenChange={setReactionDrawerOpen}
          >
            <DrawerTrigger asChild>
              <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/40",
                    pending && "opacity-70"
                  )}
                >
                  <Smile className="size-5" />
                </Button>
                <span className="text-xs font-bold text-white shadow-black drop-shadow-md">
                  {totalReactions}
                </span>
              </div>
            </DrawerTrigger>
            <DrawerContent className="fixed bottom-0 left-0 right-0 min-h-[70dvh] outline-none">
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle className="text-center">
                    Choose a Reaction
                  </DrawerTitle>
                </DrawerHeader>
                <div className="grid grid-cols-6 gap-2 p-4 pb-8">
                  {ALL_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="flex aspect-square items-center justify-center rounded-xl text-2xl hover:bg-slate-100 active:scale-90 transition-transform"
                      onClick={() => handleReact(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}

                  <Dialog
                    open={customEmojiDialogOpen}
                    onOpenChange={setCustomEmojiDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <button className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-2xl hover:bg-slate-200 active:scale-90 transition-transform text-slate-500">
                        <Plus className="size-5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Custom Reaction</DialogTitle>
                        <DialogDescription>
                          Enter a single emoji to react to this post.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (customEmoji) {
                            handleReact(customEmoji);
                          }
                        }}
                        className="flex items-center gap-4 py-4"
                      >
                        <div className="relative flex-1">
                          <Input
                            id="emoji"
                            className="text-center text-4xl h-20"
                            value={customEmoji}
                            onChange={(e) => {
                              const val = e.target.value;
                              const chars = [...val];
                              if (chars.length > 0) {
                                setCustomEmoji(chars[chars.length - 1]);
                              } else {
                                setCustomEmoji("");
                              }
                            }}
                            placeholder="🔥"
                            autoFocus
                            maxLength={2}
                          />
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          disabled={!customEmoji || pending}
                        >
                          React
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Comments Drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors group-hover:bg-black/40">
                  <MessageCircle className="h-7 w-7 fill-white/90" />
                </div>
                <span className="text-xs font-bold text-white shadow-black drop-shadow-md">
                  {optimisticComments.length}
                </span>
              </div>
            </DrawerTrigger>
            <DrawerContent className="h-screen">
              <div className="mx-auto w-full max-w-md h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  <CommentList
                    comments={optimisticComments}
                    isAdmin={isAdmin}
                    postId={postId}
                    onOptimisticAdd={addOptimisticComment}
                  />
                </div>
                <div className="p-4 pb-8">
                  <CommentForm
                    postId={postId}
                    autoFocus={false}
                    onOptimisticAdd={addOptimisticComment}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <ReactionListDialog
        open={reactionListOpen}
        onOpenChange={setReactionListOpen}
        postId={postId}
        emoji={selectedEmojiForList}
      />
    </>
  );
}

function ReactionButton({
  emoji,
  count,
  hasReacted,
  onClick,
  onLongPress,
}: {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const handlers = useLongPress({
    onClick,
    onLongPress,
    onDoubleClick: onLongPress,
  });

  return (
    <button
      {...handlers}
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors select-none",
        hasReacted
          ? "bg-white/20 ring-1 ring-white/50 hover:bg-white/30"
          : "bg-black/40 hover:bg-black/60"
      )}
    >
      <span className="text-sm">{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

function useLongPress({
  onClick,
  onLongPress,
  onDoubleClick,
  delay = 500,
}: {
  onClick: () => void;
  onLongPress: () => void;
  onDoubleClick: () => void;
  delay?: number;
}) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const clickTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const clickCountRef = useRef(0);
  const targetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setLongPressTriggered(false);
      targetRef.current = e.target;
      timeoutRef.current = setTimeout(() => {
        setLongPressTriggered(true);
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    targetRef.current = null;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (longPressTriggered) {
        setLongPressTriggered(false);
        return;
      }

      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
        clickTimeoutRef.current = setTimeout(() => {
          if (clickCountRef.current === 1) {
            onClick();
          }
          clickCountRef.current = 0;
        }, 250);
      } else if (clickCountRef.current === 2) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = undefined;
        }
        clickCountRef.current = 0;
        onDoubleClick();
      }
    },
    [longPressTriggered, onClick, onDoubleClick]
  );

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
    onClick: handleClick,
  };
}
