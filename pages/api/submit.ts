// sheikhsaad0/residencyevaluationproject-ai/residencyEvaluationProject-AI-68d256d059a5b9bf8db75a362617c9e644066573/pages/api/submit.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { redis } from '@/lib/redis'; // USE PATH ALIAS
import { randomUUID } from 'crypto';

// ... rest of the file remains the same

// Define required types
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

interface EvaluationResult {
  [key: string]: EvaluationStep | number | string | boolean | undefined;
  caseDifficulty: number;
  additionalComments: string;
  transcription: string;
  surgery: string;
  residentName?: string;
  additionalContext?: string;
  isFinalized: boolean;
}

interface JobData {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  gcsUrl?: string;
  surgeryName?: string;
  residentName?: string;
  additionalContext?: string;
  result?: EvaluationResult;
  error?: string;
  createdAt: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { gcsUrl, surgeryName, residentName, additionalContext } = req.body;

        if (!gcsUrl) {
            return res.status(400).json({ message: 'gcsUrl is required.' });
        }
        if (!surgeryName) {
            return res.status(400).json({ message: 'Surgery name is required.' });
        }

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
        await redis.set(`job:${jobId}`, JSON.stringify(job));

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        fetch(`${baseUrl}/api/process-job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId }),
        });

        res.status(202).json({ jobId });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}