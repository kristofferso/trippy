import { relations } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  email: text('email'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => groupMembers.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => groupMembers.id, { onDelete: 'cascade' }),
  title: text('title'),
  body: text('body'),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => groupMembers.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reactions = pgTable('reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => groupMembers.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groupRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  posts: many(posts),
  sessions: many(sessions),
}));

export const memberRelations = relations(groupMembers, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  group: one(groups, {
    fields: [sessions.groupId],
    references: [groups.id],
  }),
  member: one(groupMembers, {
    fields: [sessions.memberId],
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

export const commentRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  member: one(groupMembers, {
    fields: [comments.memberId],
    references: [groupMembers.id],
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

export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
