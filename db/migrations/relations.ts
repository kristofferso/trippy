import { relations } from "drizzle-orm/relations";
import { posts, comments, groupMembers, groups, reactions, users, userSessions, memberSessions } from "./schema";

export const commentsRelations = relations(comments, ({one, many}) => ({
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id]
	}),
	groupMember: one(groupMembers, {
		fields: [comments.memberId],
		references: [groupMembers.id]
	}),
	comment: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "comments_parentId_comments_id"
	}),
	comments: many(comments, {
		relationName: "comments_parentId_comments_id"
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	comments: many(comments),
	group: one(groups, {
		fields: [posts.groupId],
		references: [groups.id]
	}),
	groupMember: one(groupMembers, {
		fields: [posts.authorId],
		references: [groupMembers.id]
	}),
	reactions: many(reactions),
}));

export const groupMembersRelations = relations(groupMembers, ({one, many}) => ({
	comments: many(comments),
	posts: many(posts),
	reactions: many(reactions),
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
	memberSessions: many(memberSessions),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	posts: many(posts),
	groupMembers: many(groupMembers),
	memberSessions: many(memberSessions),
}));

export const reactionsRelations = relations(reactions, ({one}) => ({
	post: one(posts, {
		fields: [reactions.postId],
		references: [posts.id]
	}),
	groupMember: one(groupMembers, {
		fields: [reactions.memberId],
		references: [groupMembers.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	groupMembers: many(groupMembers),
	userSessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const memberSessionsRelations = relations(memberSessions, ({one}) => ({
	group: one(groups, {
		fields: [memberSessions.groupId],
		references: [groups.id]
	}),
	groupMember: one(groupMembers, {
		fields: [memberSessions.memberId],
		references: [groupMembers.id]
	}),
}));