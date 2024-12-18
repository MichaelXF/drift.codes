import { createRxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { listFiles, readFile } from "../../src/utils/file-utils";

export default class Database {
  constructor(options) {
    this.options = options;
    this.initDB();
    this.ready = false;

    this.indexQueue = [];

    this.indexed = new Set();
  }

  isIndexed(filePath) {
    return this.indexed.has(filePath);
  }

  async initDB() {
    this.db = await createRxDatabase({
      name: this.options.projectName, // <- name
      storage: getRxStorageDexie(), // <- RxStorage

      /* Optional parameters: */
      // password: "myPassword", // <- password (optional)
      multiInstance: true, // <- multiInstance (optional, default: true)
      // eventReduce: true, // <- eventReduce (optional, default: false)
      // cleanupPolicy: {}, // <- custom cleanup policy (optional)

      ignoreDuplicate: true,
    });

    const addCollections = await this.db.addCollections({
      documents: {
        schema: {
          version: 0,
          primaryKey: "id",
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            embedding: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
        },
      },
    });
    this.collection = addCollections.documents;

    this.ready = true;
    this.editorComponent.rerender();
  }

  get editorComponent() {
    return this.options.editorComponent;
  }

  get ai() {
    return this.options.editorComponent.ai;
  }

  async generateEmbeddings(text) {
    return await this.ai.generateEmbeddings(text);
  }

  async insertDocument(id, text) {
    const embedding = await this.generateEmbeddings(text);

    const doc = await this.collection.upsert({
      id: id,
      embedding: embedding,
    });

    return doc;
  }

  async getDocumentById(id) {
    return await this.collection.findOne(id).exec();
  }

  async searchDocuments(queryText) {
    const queryEmbedding = await this.generateEmbeddings(queryText);

    const results = await this.collection
      .find({
        selector: {
          // You'll need a custom function to calculate cosine similarity
          embedding: { $cosineSimilarity: queryEmbedding },
        },
      })
      .exec();

    return results;
  }

  get projectName() {
    return this.options.projectName;
  }

  runIndexQueue() {
    if (this.indexQueuePromise) return this.indexQueuePromise;
    return (this.indexQueuePromise = new Promise((resolve, reject) => {
      const indexBatch = async () => {
        if (this.indexQueue.length === 0) {
          this.indexQueuePromise = null;
          return;
        }

        var firstBatch = this.indexQueue.splice(0, 10);
        await Promise.allSettled(firstBatch.map((fn) => fn()));

        const timeout = (ms) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        await timeout(1000);
      };
      const indexLoop = async () => {
        while (this.indexQueue.length > 0) {
          await indexBatch();
        }

        this.indexQueuePromise = null;
      };

      indexLoop().then(resolve);
    }));
  }

  rerender() {
    this.editorComponent.rerender();
  }

  indexFile(file) {
    const indexFilePromise = async () => {
      var exists = await this.getDocumentById(file);
      if (exists) {
        this.rerender();
        this.indexed.add(file);
        return;
      }

      console.log("Indexing " + file);

      var text = await readFile(this.projectName, file);
      await this.insertDocument(file, text);

      this.indexed.add(file);
      this.rerender();
      return;
    };

    const promise = indexFilePromise;

    this.indexQueue.push(promise);

    this.runIndexQueue();

    return promise;
  }

  async indexProject() {
    var files = await listFiles(this.projectName);

    for (const file of files) {
      this.indexFile(file);
    }

    this.runIndexQueue();
  }
}
