import { Storage } from '@google-cloud/storage';

// Decode the Base64 service account key
const serviceAccountJson = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_B64 || '', 'base64').toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});

const bucketName = process.env.GCS_BUCKET_NAME || '';
if (!bucketName) {
  throw new Error("GCS_BUCKET_NAME environment variable not set.");
}
const bucket = storage.bucket(bucketName);

/**
 * Uploads a local file to Google Cloud Storage.
 * @param localPath The path to the local file to upload.
 * @param destination The destination path in the GCS bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToGCS(localPath: string, destination: string): Promise<string> {
  try {
    const options = {
      destination: destination,
      // Optional: Makes the file publicly readable.
      // Configure your bucket for public access if needed.
      public: true, 
      // Optional: Add metadata.
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    };

    await bucket.upload(localPath, options);
    
    console.log(`${localPath} uploaded to ${bucketName}/${destination}.`);
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
  } catch (error) {
    console.error('ERROR uploading file to GCS:', error);
    throw error;
  }
}

/**
 * This function is useful if Deepgram can transcribe directly from a public URL.
 * Ensure your bucket objects are publicly accessible if you use this approach.
 */
export function getPublicUrl(destination: string): string {
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}