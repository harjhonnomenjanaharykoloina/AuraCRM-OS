export interface StorageProvider {
    name: "local" | "s3";
    save(key: string, buffer: Buffer, contentType?: string): Promise<string>;
    read(key: string): Promise<Buffer | null>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
}

export interface StorageProviderFactoryOptions {
    provider?: "local" | "s3";
}
