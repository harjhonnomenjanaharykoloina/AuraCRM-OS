import { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
    if (_provider) return _provider;

    const providerName = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

    switch (providerName) {
        case "s3":
        case "minio":
            _provider = new S3StorageProvider();
            break;
        case "local":
        default:
            _provider = new LocalStorageProvider();
            break;
    }

    return _provider;
}

export function resetStorageProvider(): void {
    _provider = null;
}
