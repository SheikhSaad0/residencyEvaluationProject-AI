import { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv'; // Use Vercel KV instead of the direct Redis client

// Define the JobData interface to ensure type safety
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (typeof jobId !== 'string') {
    return res.status(400).json({ message: 'jobId must be a string.' });
  }

  try {
    // Use kv.get, which is consistent with your other API routes
    const job = await kv.get<JobData>(`job:${jobId}`);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    
    res.status(200).json(job);

  } catch (error) {
    console.error(`Error fetching job status for ${jobId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ message: errorMessage });
  }
}