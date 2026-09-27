import { promises as fs } from "fs";
import { deleteFileSafe, ensureParentDir, resolveStoragePath } from "@/lib/file-storage";
import { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
    name = "local" as const;

    async save(key: string, buffer: Buffer, _contentType?: string): Promise<string> {
        const absolutePath = resolveStoragePath(key);
        await ensureParentDir(absolutePath);
        await fs.writeFile(absolutePath, buffer);
        return key;
    }

    async read(key: string): Promise<Buffer | null> {
        try {
            const absolutePath = resolveStoragePath(key);
            return await fs.readFile(absolutePath);
        } catch (error: any) {
            if (error?.code === "ENOENT") return null;
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        const absolutePath = resolveStoragePath(key);
        await deleteFileSafe(absolutePath);
    }

    getUrl(key: string): string {
        return `/${key}`;
    }
}
