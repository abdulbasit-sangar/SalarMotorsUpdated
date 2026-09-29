import "dotenv/config";
import mongoose from "mongoose";

const COLLECTION_NAME = "cars";
const FIELD_NAME = "steeringType";
const applyChanges = process.argv.includes("--apply");

try {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI must be set in the environment or Backend/.env",
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const database = mongoose.connection.db;
  const collectionExists = await database
    .listCollections({ name: COLLECTION_NAME }, { nameOnly: true })
    .hasNext();

  if (!collectionExists) {
    console.log(
      `Collection "${COLLECTION_NAME}" does not exist; nothing to migrate.`,
    );
  } else {
    const collection = database.collection(COLLECTION_NAME);
    const [documents, indexes] = await Promise.all([
      collection.countDocuments({ [FIELD_NAME]: { $exists: true } }),
      collection.indexes(),
    ]);
    const obsoleteIndexes = indexes.filter(
      (index) => index.name !== "_id_" && Object.hasOwn(index.key, FIELD_NAME),
    );

    console.log(`Car documents containing the retired field: ${documents}`);
    console.log(
      `Indexes containing the retired field: ${obsoleteIndexes.map((index) => index.name).join(", ") || "none"}`,
    );

    if (!applyChanges) {
      console.log(
        "Dry run only. Rerun with --apply to unset the field and drop those indexes.",
      );
    } else {
      const result = await collection.updateMany(
        { [FIELD_NAME]: { $exists: true } },
        { $unset: { [FIELD_NAME]: "" } },
      );

      for (const index of obsoleteIndexes) {
        await collection.dropIndex(index.name);
      }

      console.log(
        `Removed the field from ${result.modifiedCount} car documents.`,
      );
      console.log(`Dropped ${obsoleteIndexes.length} obsolete indexes.`);
    }
  }
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
