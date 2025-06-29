import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function processJob(job: any): Promise<any> {
    // Your actual job logic here
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return {
        message: 'Job processed successfully',
        surgery: job.surgeryName,
    };
}

async function main() {
    while (true) {
        const pendingJob = await prisma.job.findFirst({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });

        if (!pendingJob) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
        }

        await prisma.job.update({
            where: { id: pendingJob.id },
            data: { status: 'processing' },
        });

        try {
            const result = await processJob(pendingJob);
            await prisma.job.update({
                where: { id: pendingJob.id },
                data: {
                    status: 'complete',
                    result: JSON.stringify(result),
                    error: null,
                },
            });
            console.log(`Job ${pendingJob.id} completed`);
        } catch (e) {
            await prisma.job.update({
                where: { id: pendingJob.id },
                data: {
                    status: 'failed',
                    error: e instanceof Error ? e.message : String(e),
                },
            });
            console.error(`Job ${pendingJob.id} failed:`, e);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());