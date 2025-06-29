import { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

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


// We now expect JSON, so the default bodyParser can be used.
// You can remove the export const config block.

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
        await kv.set(`job:${jobId}`, job);

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