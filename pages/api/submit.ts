import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { gcsUrl, surgeryName, residentName, additionalContext } = req.body;

        if (!gcsUrl || !surgeryName) {
            return res.status(400).json({ message: 'gcsUrl and surgeryName are required.' });
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

        // --- UPDATED TRIGGER ---
        const host = req.headers.host || 'localhost:3000';
        const protocol = /^localhost/.test(host) ? 'http' : 'https';
        // Note the new path and the jobId query parameter
        const processUrl = new URL(`${protocol}://${host}/api/process-job?jobId=${job.id}`);

        fetch(processUrl.href, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        }).catch(error => {
            console.error('[Trigger Error] Failed to start job processing:', error);
        });
        // --- END OF UPDATE ---

        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}