import { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

// Define evaluation interfaces to avoid 'any'
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

interface GeminiEvaluationResult {
  [key: string]: EvaluationStep | number | string;
  caseDifficulty: number;
  additionalComments: string;
}

// Define the JobData interface to ensure type safety
interface JobData {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  gcsUrl?: string;
  surgeryName?: string;
  residentName?: string;
  additionalContext?: string;
  result?: GeminiEvaluationResult; // Changed from any
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