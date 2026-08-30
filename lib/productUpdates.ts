import { Db, ObjectId } from "mongodb";
import {
  PRODUCT_UPDATE_BODY_MAX,
  PRODUCT_UPDATE_TITLE_MAX,
} from "@/lib/productUpdates.constants";

export {
  PRODUCT_UPDATE_BODY_MAX,
  PRODUCT_UPDATE_TITLE_MAX,
} from "@/lib/productUpdates.constants";

export type ProductUpdateDoc = {
  _id: ObjectId;
  title?: string | null;
  body: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string | null;
};

export type ProductUpdatePublic = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  createdByName: string | null;
  dismissed?: boolean;
};

function mapDoc(doc: ProductUpdateDoc): ProductUpdatePublic {
  return {
    id: String(doc._id),
    title: doc.title?.trim() || null,
    body: doc.body,
    createdAt: doc.createdAt.toISOString(),
    createdByName: doc.createdByName?.trim() || null,
  };
}

export async function listProductUpdatesForUser(
  db: Db,
  userId: string,
  options?: { isAdmin?: boolean },
): Promise<ProductUpdatePublic[]> {
  if (!ObjectId.isValid(userId)) return [];

  const updates = (await db
    .collection<ProductUpdateDoc>("product_updates")
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()) as ProductUpdateDoc[];

  if (updates.length === 0) return [];

  const dismissed = await db
    .collection("product_update_dismissals")
    .find({
      userId: new ObjectId(userId),
      updateId: { $in: updates.map((u) => u._id) },
    })
    .project({ updateId: 1 })
    .toArray();

  const dismissedIds = new Set(dismissed.map((row) => String(row.updateId)));

  return updates
    .filter((update) => options?.isAdmin || !dismissedIds.has(String(update._id)))
    .map((doc) => ({
      ...mapDoc(doc),
      ...(options?.isAdmin
        ? { dismissed: dismissedIds.has(String(doc._id)) }
        : {}),
    }));
}

export async function listAllProductUpdates(
  db: Db,
): Promise<ProductUpdatePublic[]> {
  const updates = (await db
    .collection<ProductUpdateDoc>("product_updates")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()) as ProductUpdateDoc[];

  return updates.map(mapDoc);
}

export async function createProductUpdate(
  db: Db,
  input: {
    body: string;
    title?: string | null;
    createdBy: string;
    createdByName?: string | null;
  },
): Promise<ProductUpdatePublic> {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Message is required");
  }
  if (body.length > PRODUCT_UPDATE_BODY_MAX) {
    throw new Error(`Message must be ${PRODUCT_UPDATE_BODY_MAX} characters or less`);
  }

  const title = input.title?.trim() || null;
  if (title && title.length > PRODUCT_UPDATE_TITLE_MAX) {
    throw new Error(`Title must be ${PRODUCT_UPDATE_TITLE_MAX} characters or less`);
  }

  const doc: Omit<ProductUpdateDoc, "_id"> = {
    body,
    title,
    createdAt: new Date(),
    createdBy: input.createdBy,
    createdByName: input.createdByName?.trim() || null,
  };

  const result = await db.collection("product_updates").insertOne(doc);
  return mapDoc({ _id: result.insertedId, ...doc });
}

export async function dismissProductUpdate(
  db: Db,
  userId: string,
  updateId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(updateId)) return false;

  const exists = await db.collection("product_updates").findOne({
    _id: new ObjectId(updateId),
  });
  if (!exists) return false;

  await db.collection("product_update_dismissals").updateOne(
    {
      userId: new ObjectId(userId),
      updateId: new ObjectId(updateId),
    },
    {
      $set: { dismissedAt: new Date() },
      $setOnInsert: {
        userId: new ObjectId(userId),
        updateId: new ObjectId(updateId),
      },
    },
    { upsert: true },
  );

  return true;
}

export async function deleteProductUpdate(
  db: Db,
  updateId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(updateId)) return false;

  const result = await db.collection("product_updates").deleteOne({
    _id: new ObjectId(updateId),
  });

  if (result.deletedCount === 0) return false;

  await db.collection("product_update_dismissals").deleteMany({
    updateId: new ObjectId(updateId),
  });

  return true;
}
