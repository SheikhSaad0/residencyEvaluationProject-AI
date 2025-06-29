import { NextApiRequest, NextApiResponse } from 'next';
import { generateV4UploadSignedUrl, getPublicUrl } from '../../lib/gcs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ message: 'fileName and fileType are required.' });
        }

        // Create a unique destination path in your bucket
        const destination = `uploads/${Date.now()}-${fileName.replace(/\s/g, '_')}`;
        
        // Get the signed URL for the client to use
        const signedUrl = await generateV4UploadSignedUrl(destination, fileType);
        
        // Get the final public URL of the file after it's uploaded
        const gcsUrl = getPublicUrl(destination);

        res.status(200).json({ signedUrl, gcsUrl });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: `Failed to generate upload URL: ${errorMessage}` });
    }
}