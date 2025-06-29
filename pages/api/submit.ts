import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { uploadFileToGCS } from '../../lib/gcs';
import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

interface JobData {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  gcsUrl?: string;
  surgeryName?: string;
  residentName?: string;
  additionalContext?: string;
  result?: any;
  error?: string;
  createdAt: number;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const audioFile = files.file?.[0];

    const surgeryName = fields.surgery?.[0] as string;
    const residentName = fields.residentName?.[0] as string;
    const additionalContext = fields.additionalContext?.[0] as string;

    if (!audioFile || !audioFile.originalFilename) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!surgeryName) {
        return res.status(400).json({ message: 'Surgery name is required.' });
    }

    // 1. Upload file to Google Cloud Storage
    const destination = `uploads/${Date.now()}-${audioFile.originalFilename}`;
    const gcsUrl = await uploadFileToGCS(audioFile.filepath, destination);

    // 2. Create and store job metadata in Vercel KV
    const jobId = randomUUID();
    const job: JobData = {
      id: jobId,
      status: 'pending',
      gcsUrl,
      surgeryName,
      residentName,
      additionalContext,
      createdAt: Date.now(),
    };
    await kv.set(`job:${jobId}`, job);

    // 3. Trigger the processing job asynchronously (fire and forget).
    // The base URL is dynamically determined from Vercel's environment variables.
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    fetch(`${baseUrl}/api/process-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
    });

    // 4. Return the Job ID to the client immediately
    res.status(202).json({ jobId });

  } catch (error) {
    console.error('Error submitting job:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ message: errorMessage });
  }
}