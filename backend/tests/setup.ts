import os from "node:os"
import path from "node:path"
import mongoose from "mongoose"
import { afterAll, beforeAll, beforeEach } from "vitest"

// Must be set BEFORE src/config/env.ts is imported by any test.
process.env.NODE_ENV = "test"
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/shopsphere_test"
process.env.JWT_ACCESS_SECRET = "test-secret-test-secret-test-secret-123456"
process.env.MOCK_WEBHOOK_DELAY_MS = "0"
process.env.RAZORPAY_KEY_ID = ""
process.env.RAZORPAY_KEY_SECRET = ""
process.env.PAYMENT_MOCK = "true"
process.env.LOG_LEVEL = "silent"
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "shopsphere-test-uploads")
process.env.UPLOAD_MAX_BYTES = String(100 * 1024) // small cap so the size test stays fast

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
