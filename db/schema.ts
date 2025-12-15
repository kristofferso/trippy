import { relations } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  json,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  username: text("username").unique(),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  email: text("email"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberSessions = pgTable("member_sessions", {
  id: text("id").primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => groupMembers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => groupMembers.id, { onDelete: "cascade" }),
  title: text("title"),
  body: text("body"),
  // Deprecated columns (keeping for now to avoid data loss until migration script is run)
  videoUrl: text("video_url"),
  imageUrls: text("image_urls").array(),
  // New column for unified media
  media: json("media")
    .$type<
      {
        type: "image" | "video";
        url: string;
        thumbnailUrl?: string;
        width?: number;
        height?: number;
      }[]
    >()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => groupMembers.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
    onDelete: "cascade",
  }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reactions = pgTable("reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => groupMembers.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const postViews = pgTable(
  "post_views",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.memberId] }),
  })
);

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  memberships: many(groupMembers),
}));

export const userSessionRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const groupRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  posts: many(posts),
  memberSessions: many(memberSessions),
}));

export const memberRelations = relations(groupMembers, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
}));

export const memberSessionRelations = relations(memberSessions, ({ one }) => ({
  group: one(groups, {
    fields: [memberSessions.groupId],
    references: [groups.id],
  }),
  member: one(groupMembers, {
    fields: [memberSessions.memberId],
    references: [groupMembers.id],
  }),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  group: one(groups, {
    fields: [posts.groupId],
    references: [groups.id],
  }),
  author: one(groupMembers, {
    fields: [posts.authorId],
    references: [groupMembers.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  member: one(groupMembers, {
    fields: [comments.memberId],
    references: [groupMembers.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "parent_child",
  }),
  replies: many(comments, {
    relationName: "parent_child",
  }),
}));

export const reactionRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  member: one(groupMembers, {
    fields: [reactions.memberId],
    references: [groupMembers.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type MemberSession = typeof memberSessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
