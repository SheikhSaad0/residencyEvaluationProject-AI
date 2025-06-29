// pages/api/evaluations/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const jobs = await prisma.job.findMany({
            where: {
                status: 'complete',
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const evaluations = jobs.map(job => {
            if (job.result) {
                try {
                    const result = JSON.parse(job.result);
                    return {
                        id: job.id,
                        surgery: result.surgery,
                        residentName: result.residentName,
                        date: new Date(job.createdAt).toLocaleString(),
                    };
                } catch {
                    return null;
                }
            }
            return null;
        }).filter(Boolean);

        res.status(200).json(evaluations);
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}