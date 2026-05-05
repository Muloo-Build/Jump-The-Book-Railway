import path from "node:path";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
  StorageObjectFile,
  StorageObjectMetadata,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const DEFAULT_PRIVATE_OBJECT_DIR = "private";
const DEFAULT_PUBLIC_OBJECT_DIR = "public";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

class LocalObjectFile implements StorageObjectFile {
  public readonly name: string;
  private readonly filePath: string;
  private readonly metadataPath: string;

  constructor(rootDir: string, objectPath: string) {
    const safePath = normalizeStoragePath(objectPath);
    const resolvedRoot = path.resolve(rootDir);
    const resolvedFile = path.resolve(resolvedRoot, safePath);

    if (
      resolvedFile !== resolvedRoot &&
      !resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)
    ) {
      throw new ObjectNotFoundError();
    }

    this.name = safePath;
    this.filePath = resolvedFile;
    this.metadataPath = `${resolvedFile}.metadata.json`;
  }

  async exists(): Promise<[boolean]> {
    try {
      await access(this.filePath);
      return [true];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[StorageObjectMetadata]> {
    const fileStat = await stat(this.filePath);
    let stored: StorageObjectMetadata = {};

    try {
      stored = JSON.parse(
        await readFile(this.metadataPath, "utf8"),
      ) as StorageObjectMetadata;
    } catch {
      stored = {};
    }

    return [
      {
        ...stored,
        size: fileStat.size,
        contentType: stored.contentType ?? "application/octet-stream",
        metadata: stored.metadata ?? {},
      },
    ];
  }

  async setMetadata(nextMetadata: {
    metadata?: Record<string, string>;
  }): Promise<void> {
    const [current] = await this.getMetadata();
    const merged: StorageObjectMetadata = {
      ...current,
      metadata: {
        ...(current.metadata ?? {}),
        ...(nextMetadata.metadata ?? {}),
      },
    };
    await mkdir(path.dirname(this.metadataPath), { recursive: true });
    await writeFile(this.metadataPath, JSON.stringify(merged), "utf8");
  }

  async save(buffer: Buffer, contentType: string): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, buffer);
    await writeFile(
      this.metadataPath,
      JSON.stringify({
        contentType,
        metadata: {},
      } satisfies StorageObjectMetadata),
      "utf8",
    );
  }

  createReadStream(): NodeJS.ReadableStream {
    return createReadStream(this.filePath);
  }
}

export class ObjectStorageService {
  getStorageRoot(): string {
    const explicitDir = process.env.OBJECT_STORAGE_DIR?.trim();
    if (explicitDir) {
      return path.resolve(explicitDir);
    }

    const railwayVolumeDir = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
    if (railwayVolumeDir) {
      return path.resolve(railwayVolumeDir, "object-storage");
    }

    return path.resolve(process.cwd(), ".data/object-storage");
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr =
      process.env.PUBLIC_OBJECT_SEARCH_PATHS || DEFAULT_PUBLIC_OBJECT_DIR;
    return Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((searchPath) => normalizeStoragePath(searchPath))
          .filter((searchPath) => searchPath.length > 0),
      ),
    );
  }

  getPrivateObjectDir(): string {
    return normalizeStoragePath(
      process.env.PRIVATE_OBJECT_DIR || DEFAULT_PRIVATE_OBJECT_DIR,
    );
  }

  async searchPublicObject(filePath: string): Promise<LocalObjectFile | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const file = new LocalObjectFile(
        this.getStorageRoot(),
        path.join(searchPath, filePath),
      );
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: LocalObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  /**
   * Upload a buffer to a fixed `<namespace>/<uuid>` path under the private
   * object dir and return its canonical `/objects/<namespace>/<uuid>` path.
   * Railway deployments should attach a volume or set OBJECT_STORAGE_DIR if
   * these generated files need to survive redeploys.
   */
  async uploadBufferAsObjectEntity(
    buffer: Buffer,
    contentType = "application/octet-stream",
    namespace = "scene-images",
  ): Promise<string> {
    if (!/^[a-z0-9-]+$/.test(namespace)) {
      throw new Error(`Invalid storage namespace: ${namespace}`);
    }

    const objectId = randomUUID();
    const objectPath = path.join(
      this.getPrivateObjectDir(),
      namespace,
      objectId,
    );
    const file = new LocalObjectFile(this.getStorageRoot(), objectPath);
    await file.save(buffer, contentType);
    return `/objects/${namespace}/${objectId}`;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    throw new Error(
      "Direct signed object uploads are not available with filesystem storage. " +
        "Upload through the API server instead.",
    );
  }

  async getObjectEntityFile(objectPath: string): Promise<LocalObjectFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/").filter(Boolean);
    if (
      parts.length < 2 ||
      parts.some((part) => part === "." || part === "..")
    ) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    const objectEntityPath = path.join(this.getPrivateObjectDir(), entityId);
    const objectFile = new LocalObjectFile(
      this.getStorageRoot(),
      objectEntityPath,
    );
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = normalizeStoragePath(url.pathname);
    const privateObjectDir = this.getPrivateObjectDir();

    if (!rawObjectPath.startsWith(`${privateObjectDir}/`)) {
      return `/${rawObjectPath}`;
    }

    const entityId = rawObjectPath.slice(privateObjectDir.length + 1);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: LocalObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function normalizeStoragePath(rawPath: string): string {
  return rawPath
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part.length > 0 && part !== ".")
    .join("/");
}
