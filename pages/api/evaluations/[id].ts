// pages/api/evaluations/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Job ID must be a string.' });
    }

    if (req.method === 'PUT') {
        try {
            const { updatedEvaluation } = req.body;

            if (!updatedEvaluation) {
                return res.status(400).json({ message: 'Updated evaluation data is required.' });
            }

            const job = await prisma.job.findUnique({ where: { id } });

            if (!job) {
                return res.status(404).json({ message: 'Job not found.' });
            }

            const updatedJob = await prisma.job.update({
                where: { id },
                data: {
                    result: JSON.stringify(updatedEvaluation),
                    updatedAt: new Date(),
                },
            });

            res.status(200).json(updatedJob);
        } catch (error) {
            console.error(`Error updating job ${id}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: errorMessage });
        }
    } else {
        res.setHeader('Allow', ['PUT']);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
}