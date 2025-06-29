import { Storage, Bucket } from '@google-cloud/storage';

let storage: Storage | null = null;
let bucket: Bucket | null = null;

function initializeGCS() {
    // Already initialized
    if (storage && bucket) {
        return;
    }

    const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!serviceAccountB64 || !bucketName) {
        throw new Error("GCS environment variables (GCP_SERVICE_ACCOUNT_B64, GCS_BUCKET_NAME) are not set.");
    }

    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    const credentials = JSON.parse(serviceAccountJson);

    storage = new Storage({
        projectId: credentials.project_id,
        credentials,
    });

    bucket = storage.bucket(bucketName);
}

/**
 * Uploads a local file to Google Cloud Storage. (Used by the backend)
 * @param localPath The path to the local file to upload.
 * @param destination The destination path in the GCS bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToGCS(localPath: string, destination: string): Promise<string> {
    initializeGCS(); // Initialize on first use
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized. Check your environment variables.');
    }

    try {
        const options = {
            destination: destination,
            public: true, 
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        };

        await bucket.upload(localPath, options);
    
        console.log(`${localPath} uploaded to ${process.env.GCS_BUCKET_NAME}/${destination}.`);
    
        return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${destination}`;
    } catch (error) {
        console.error('ERROR uploading file to GCS:', error);
        throw error;
    }
}

/**
 * Gets the public URL for a file in GCS.
 */
export function getPublicUrl(destination: string): string {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("GCS_BUCKET_NAME environment variable not set.");
    }
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
}


/**
 * NEW FUNCTION
 * Generates a v4 signed URL for uploading a file directly from the client.
 * @param destination The destination path in the GCS bucket (e.g., 'uploads/my-file.mp3').
 * @param contentType The MIME type of the file being uploaded.
 * @returns A promise that resolves to the signed URL for a PUT request.
 */
export async function generateV4UploadSignedUrl(destination: string, contentType: string): Promise<string> {
    initializeGCS(); // Ensure GCS is initialized
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized. Check your environment variables.');
    }

    const options = {
        version: 'v4' as const,
        action: 'write' as const,
        expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
        contentType,
    };

    try {
        const [url] = await bucket.file(destination).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error('ERROR generating signed GCS URL:', error);
        throw error;
    }
}