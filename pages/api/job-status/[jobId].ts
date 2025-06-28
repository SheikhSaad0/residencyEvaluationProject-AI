import { NextApiRequest, NextApiResponse } from 'next';
import { redis } from '../../../lib/redis'; // Use our new Redis client

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
    // Use redis.get instead of kv.get
    const job = await redis.get<JobData>(`job:${jobId}`);

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
