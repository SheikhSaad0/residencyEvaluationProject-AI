import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { jobId } = req.query;

    if (typeof jobId !== 'string') {
        return res.status(400).json({ message: 'jobId must be a string.' });
    }

    try {
        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        let result = undefined;
        if (job.result) {
            try {
                result = JSON.parse(job.result);
            } catch {
                result = job.result;
            }
        }

        res.status(200).json({
            id: job.id,
            status: job.status,
            gcsUrl: job.gcsUrl,
            surgeryName: job.surgeryName,
            residentName: job.residentName,
            additionalContext: job.additionalContext,
            result,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        });
    } catch (error) {
        console.error(`Error fetching job status for ${jobId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}