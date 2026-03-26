import { eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { feedItems } from "../db/schema/feed.js";
import { users } from "../db/schema/users.js";

export async function addFeedItem(
  groupId: string,
  actorId: string | null,
  type: (typeof feedItems.$inferInsert)["type"],
  data: Record<string, unknown>
) {
  const [item] = await db
    .insert(feedItems)
    .values({
      groupId,
      actorId,
      type,
      data,
    })
    .returning();

  return item;
}

export async function getGroupFeed(
  groupId: string,
  limit: number = 50,
  offset: number = 0
) {
  const items = await db
    .select({
      id: feedItems.id,
      groupId: feedItems.groupId,
      actorId: feedItems.actorId,
      type: feedItems.type,
      data: feedItems.data,
      createdAt: feedItems.createdAt,
      actorName: users.name,
      actorAvatar: users.avatar,
    })
    .from(feedItems)
    .leftJoin(users, eq(feedItems.actorId, users.id))
    .where(eq(feedItems.groupId, groupId))
    .orderBy(desc(feedItems.createdAt))
    .limit(limit)
    .offset(offset);

  return items;
}
