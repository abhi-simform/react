import { MongoMemoryReplSet } from "mongodb-memory-server"

// One in-memory Mongo (replica set, so transactions work later) for the whole test run.
let mongod: MongoMemoryReplSet
export async function setup() {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  process.env.TEST_MONGODB_URI = mongod.getUri()
}
export async function teardown() {
  await mongod?.stop()
}
