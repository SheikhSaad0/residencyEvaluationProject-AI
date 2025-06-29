import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        const job = await prisma.job.create({
            data: {
                status: 'pending',
                gcsUrl,
                surgeryName,
                residentName,
                additionalContext,
            },
        });

        // You do NOT "fire and forget" background processing here anymore.
        // The worker script will poll the DB for new jobs.

        res.status(202).json({ jobId: job.id });
    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}