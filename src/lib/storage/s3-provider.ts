import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { StorageProvider } from "./types";

export class S3StorageProvider implements StorageProvider {
    name = "s3" as const;
    private client: S3Client;
    private bucket: string;
    private endpoint?: string;

    constructor() {
        this.bucket = process.env.S3_BUCKET!;
        this.endpoint = process.env.S3_ENDPOINT || undefined;
        this.client = new S3Client({
            region: process.env.S3_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "",
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "",
            },
            endpoint: this.endpoint,
            forcePathStyle: !!this.endpoint,
        });
    }

    private validateKey(key: string): void {
        if (key.includes("..") || key.startsWith("/")) {
            throw new Error("Invalid storage key: path traversal detected");
        }
    }

    async save(key: string, buffer: Buffer, contentType?: string): Promise<string> {
        this.validateKey(key);
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            }),
        );
        return key;
    }

    async read(key: string): Promise<Buffer | null> {
        this.validateKey(key);
        try {
            const res = await this.client.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            );
            if (!res.Body) return null;
            return Buffer.from(await res.Body.transformToByteArray());
        } catch (err: any) {
            if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
            throw err;
        }
    }

    async delete(key: string): Promise<void> {
        this.validateKey(key);
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    getUrl(key: string): string {
        if (this.endpoint) return `${this.endpoint}/${this.bucket}/${key}`;
        return `https://${this.bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
    }
}
