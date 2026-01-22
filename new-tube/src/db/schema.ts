import { relations } from "drizzle-orm";
import { foreignKey, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createInsertSchema, createUpdateSchema, createSelectSchema } from "drizzle-zod";


// TODO : add limit for using ai services per user per day
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").unique().notNull(),
    username: text("username").unique().notNull(), // 🔥 NEW (Added Later)
    name: text("name").notNull(),
    //   TODO: add banner fields
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("clerk_id_idx").on(t.clerkId)]);


export const categories = pgTable("categories", {
    id : uuid("id").primaryKey().defaultRandom(),
    name : text("name").notNull().unique(),
    description : text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

}, (t) => [uniqueIndex("name_idx").on(t.name)]);


export const videoVisibilty = pgEnum("video_visibility", [
    "private",
    "public",
])

export const aiTitleStatusEnum = pgEnum("ai_title_status", [
  "idle",
  "pending",
]);

export const aiDescriptionStatusEnum = pgEnum("ai_description_status", [
  "idle",
  "pending",
]);



export const videos = pgTable("videos", {
    id : uuid("id").primaryKey().defaultRandom(),
    title : text("title").notNull(),
    aiTitleStatus : aiTitleStatusEnum("ai_title_status").default("idle").notNull(),
    description : text("description"),
    aiDescriptionStatus : aiDescriptionStatusEnum("ai_description_status").default("idle").notNull(),
    muxUploadId : text("mux_upload_id").unique(),
    muxStatus : text("mux_status"),
    muxAssetId : text("mux_asset_id").unique(),
    muxPlaybackId : text("mux_playback_id").unique(),
    muxTrackId : text("mux_track_id").unique(),
    muxTrackStatus : text("mux_track_status"),
    thumbnailUrl: text("thumbnail_url"), 
    thumbnailKey : text("thumbnail_key"),
    previewUrl : text("preview_url"),
    previewKey : text("preview_key"),
    duration : integer("duration").default(0).notNull(),
    visibility : videoVisibilty("visibility").default("private").notNull(),
    userId : uuid("user_id").references(() => users.id, {
        onDelete : "cascade",
        onUpdate : "cascade",
    }).notNull(),
    categoryId : uuid("category_id").references(() => categories.id, {
        onDelete : "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const videoInsertSchema = createInsertSchema(videos);
export const videoUpdateSchema = createUpdateSchema(videos);
export const videoSelectSchema = createSelectSchema(videos)



export const userRelations = relations(users, ({ many }) => ({
    videos : many(videos),
    videoViews : many(videoViews), 
    videoReactions : many(videoReactions),
    subscriptions : many(subscriptions, {
        relationName : "subscriptions_viewer_id_fkey"
    }),
    subscribers : many(subscriptions, {
        relationName : "subscriptions_creator_id_fkey"
    }),
    comments : many(comments),
    commentReactions : many(commentReactions),
}))

export const subscriptions = pgTable("subscription", {
    viewerId : uuid("viewer_id").references(() => users.id, { onDelete : "cascade" }).notNull(),
    creatorId : uuid("creator_id").references(() => users.id, { onDelete : "cascade" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    primaryKey({
        name : "subscriptions_pk",
        columns : [t.viewerId, t.creatorId],
    }), 
])


export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
    viewer : one(users, {
        fields : [subscriptions.viewerId],
        references : [users.id],
        relationName : "subscriptions_viewer_id_fkey",
    }),
    creator : one(users, {
        fields : [subscriptions.creatorId],
        references : [users.id],
        relationName : "subscriptions_creator_id_fkey",
    }),
}))



export const videoRelations = relations(videos, ({ one, many }) => ({
    user : one(users, {
        fields : [videos.userId],
        references : [users.id], 
    }),
    category : one(categories, {
        fields : [videos.categoryId],
        references : [categories.id], 
    }),
    views : many(videoViews),
    reactions : many(videoReactions),
    comments : many(comments),
}))

export const categoryRelations = relations(categories, ({ many }) => ({
    videos : many(videos),
}))


export const videoViews =  pgTable("video_views", {
    userId : uuid("user_id").references(() => users.id, { onDelete : "cascade"}).notNull(),
    videoId : uuid("video_id").references(() => videos.id, { onDelete : "cascade"}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    primaryKey({
        name : "video_views_pk",
        columns : [t.userId, t.videoId],
    })
]);

export const videoViewRelations = relations(videoViews, ({ one }) => ({
    user : one(users, {
        fields : [videoViews.userId],
        references : [users.id],
    }),
    video : one(videos, {
        fields : [videoViews.videoId],
        references : [videos.id],
    })
}))

export const videoViewsInsertSchema = createInsertSchema(videoViews);
export const videoViewsUpdateSchema = createUpdateSchema(videoViews);
export const videoViewsSelectSchema = createSelectSchema(videoViews);

export const reactionType = pgEnum("reaction_type", ["like", "dislike"]);

export const videoReactions =  pgTable("video_reactions", {
    userId : uuid("user_id").references(() => users.id, { onDelete : "cascade"}).notNull(),
    videoId : uuid("video_id").references(() => videos.id, { onDelete : "cascade"}).notNull(),
    type : reactionType("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    primaryKey({
        name : "video_reactions_pk",
        columns : [t.userId, t.videoId],
    })
]);

export const videoReactionRelations = relations(videoReactions, ({ one }) => ({
    user : one(users, {
        fields : [videoReactions.userId],
        references : [users.id],
    }),
    video : one(videos, {
        fields : [videoReactions.videoId],
        references : [videos.id],
    })
}))

export const videoReactionInsertSchema = createInsertSchema(videoReactions);
export const videoReactionUpdateSchema = createUpdateSchema(videoReactions);
export const videoReactionSelectSchema = createSelectSchema(videoReactions);


export const comments = pgTable("comments", {
    id : uuid("id").primaryKey().defaultRandom(),
    userId : uuid("user_id").references(() => users.id, { onDelete : "cascade"}).notNull(),
    videoId : uuid("video_id").references(() => videos.id, { onDelete : "cascade"}).notNull(),
    parentId : uuid("parent_id"),
    replyToUserId: uuid("reply_to_user_id").references(() => users.id, { onDelete: "set null" }),
    value : text("value").notNull(),
    createdAt: timestamp("created_at", {
        precision: 3,
        withTimezone: true, // 👈 timestamptz
        mode: "date",
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
        precision: 3,
        withTimezone: true,
        mode: "date",
     }).notNull().defaultNow(),
}, (t) => [
    foreignKey({
        columns : [t.parentId],
        foreignColumns : [t.id],
        name : "comments_parent_id_fkey",
    }).onDelete("cascade")
])


export const commentRelations = relations(comments, ({ one, many }) => ({
    user : one(users, {
        fields : [comments.userId],
        references : [users.id],
    }),
    video : one(videos,{
        fields : [comments.videoId],
        references : [videos.id],
    }),
    reactions : many(commentReactions),
    parent : one(comments,{
        fields : [comments.parentId],
        references : [comments.id],
        relationName : "comments_parent_id_fkey",
    }),
    replies : many(comments, {
        relationName : "comments_parent_id_fkey",
    }),
}))

export const commentInsertSchema = createInsertSchema(comments);
export const commentUpdateSchema = createUpdateSchema(comments);
export const commentSelectSchema = createSelectSchema(comments);


export const commentReactions =  pgTable("comment_reactions", {
    userId : uuid("user_id").references(() => users.id, { onDelete : "cascade"}).notNull(),
    commentId : uuid("video_id").references(() => comments.id, { onDelete : "cascade"}).notNull(),
    type : reactionType("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    primaryKey({
        name : "comment_reactions_pk",
        columns : [t.userId, t.commentId],
    })
]);
 
export const commentReactionRelations = relations(commentReactions, ({ one }) => ({
    user : one(users, {
        fields : [commentReactions.userId],
        references : [users.id],
    }),
    comment : one(comments, {
        fields : [commentReactions.commentId],
        references : [comments.id],
    })
}))