import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { env } from "../../config/env.js"
import type { ImageType } from "./sniff.js"

export interface StoredImage {
  /** Provider-side identifier (file name on disk, public_id on Cloudinary). */
  key: string
  /** Absolute URL the browser can load. */
  url: string
  contentType: ImageType["mime"]
  bytes: number
}

export interface SaveInput {
  buffer: Buffer
  type: ImageType
  /** Used to namespace files per user; never used as a path segment from client input. */
  ownerId: string
  /** `https://api.example.com`: where this server is reachable (local adapter only). */
  baseUrl: string
}

/**
 * The seam for Cloudinary/S3: routes and the service only know this interface.
 * A CloudinaryStorage would upload `buffer` with its SDK and return `secure_url` as `url`;
 * nothing else in the app would change.
 */
export interface ImageStorage {
  save(input: SaveInput): Promise<StoredImage>
}

export const uploadRoot = () => path.resolve(process.cwd(), env.UPLOAD_DIR)

export class LocalDiskStorage implements ImageStorage {
  constructor(private root = uploadRoot()) {}

  async save({ buffer, type, ownerId, baseUrl }: SaveInput): Promise<StoredImage> {
    // The name is generated here (uuid + extension from the SNIFFED type): the client's file
    // name never reaches the file system, so there is no path traversal or double-extension trick.
    const key = `${ownerId}-${randomUUID()}.${type.ext}`
    await mkdir(this.root, { recursive: true })
    await writeFile(path.join(this.root, key), buffer)
    return {
      key,
      url: `${baseUrl}/uploads/${key}`,
      contentType: type.mime,
      bytes: buffer.length,
    }
  }
}

let current: ImageStorage = new LocalDiskStorage()
export const getStorage = () => current
/** Tests (or a future boot-time driver switch) replace the adapter here. */
export const setStorage = (s: ImageStorage) => {
  current = s
}
