import mongoose from "mongoose"
import { afterAll, beforeAll, beforeEach } from "vitest"

// Must be set BEFORE src/config/env.ts is imported by any test.
process.env.NODE_ENV = "test"
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/shopsphere_test"
process.env.JWT_ACCESS_SECRET = "test-secret-test-secret-test-secret-123456"
process.env.LOG_LEVEL = "silent"

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!)
})
beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
})
afterAll(async () => {
  await mongoose.disconnect()
})
