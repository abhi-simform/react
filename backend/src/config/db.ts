import mongoose from "mongoose"
import { env } from "./env.js"
import { logger } from "./logger.js"

export async function connectDb(uri: string = env.MONGODB_URI) {
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  logger.info(`MongoDB connected (${mongoose.connection.name})`)
}

export async function disconnectDb() {
  await mongoose.disconnect()
}

export const isDbReady = () => mongoose.connection.readyState === 1
