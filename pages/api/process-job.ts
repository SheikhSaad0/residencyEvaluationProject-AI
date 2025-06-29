import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import type { Job } from '@prisma/client';
import { createClient, DeepgramError } from '@deepgram/sdk';

const prisma = new PrismaClient();
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- Your interfaces and helper functions (transcribeWithDeepgram, evaluateTranscriptWithGemini, etc.) go here ---
// --- This part is the same as your previous file. ---
interface ProcedureStepConfig { key: string; name: string; }
interface EvaluationStep { score: number; time: string; comments: string; }
interface GeminiEvaluationResult { [key: string]: EvaluationStep | number | string; caseDifficulty: number; additionalComments: string; }
interface EvaluationConfigs { [key: string]: { procedureSteps: ProcedureStepConfig[]; }; }
const EVALUATION_CONFIGS: EvaluationConfigs = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space' }, { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space' }, { key: 'meshPlacement', name: 'Mesh Placement' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Laparoscopic Cholecystectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Cholecystectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Lap Ventral Hernia Repair (TAPP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'herniaClosure', name: 'Hernia Closure' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Laparoscopic Appendicectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix' }, { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base' }, { key: 'specimenExtraction', name: 'Specimen Extraction' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
};
interface SchemaProperties { [key: string]: { type: string; properties?: { [key: string]: { type: string } } }; }
async function transcribeWithDeepgram(gcsUrl: string): Promise<string> { console.log(`Starting transcription for ${gcsUrl}...`); const { result, error } = await deepgram.listen.prerecorded.transcribeUrl( { url: gcsUrl }, { model: 'nova-2', diarize: true, punctuate: true, utterances: true } ); if (error) { console.error("Deepgram transcription error:", error); throw new DeepgramError(error.message); }; const utterances = result.results?.utterances; if (!utterances || utterances.length === 0) { throw new Error("Transcription returned no utterances. The audio might be silent or in an unsupported format."); } return utterances .map(utt => `[Speaker ${utt.speaker}] (${utt.start.toFixed(2)}s): ${utt.transcript}`) .join('\n'); }
async function evaluateTranscriptWithGemini(transcription: string, surgeryName: string, additionalContext: string): Promise<GeminiEvaluationResult> { console.log(`Starting Gemini evaluation for ${surgeryName}...`); const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set."); const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; const EVALUATION_CONFIG = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS]; if (!EVALUATION_CONFIG) { throw new Error(`Invalid surgery name provided to Gemini evaluator: ${surgeryName}`); } const RESPONSE_JSON_SCHEMA = { type: "OBJECT", properties: { ...EVALUATION_CONFIG.procedureSteps.reduce((acc: SchemaProperties, step: ProcedureStepConfig) => { acc[step.key] = { type: "OBJECT", properties: { score: { type: "NUMBER" }, time: { type: "STRING" }, comments: { type: "STRING" } } }; return acc; }, {}), caseDifficulty: { type: "NUMBER" }, additionalComments: { type: "STRING" }, } }; const contextPromptSection = additionalContext ? `\n      **Additional Context to Consider:**\n      ---\n      ${additionalContext}\n      ---\n    ` : ''; const prompt = `\n      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on a transcript and the provided context.\n      **Procedure:** ${surgeryName}\n      ${contextPromptSection}\n      **Transcript with Speaker Labels:**\n      ---\n      ${transcription}\n      ---\n      **Instructions:**\n      1. Review all the information provided.\n      2. Determine which speaker is the resident (learner) and which is the attending (teacher). The evaluation should focus on the resident's actions.\n      3. If the transcript is too short or lacks meaningful surgical dialogue, you MUST refuse to evaluate. Return a JSON object where 'additionalComments' explains why the evaluation is not possible, 'caseDifficulty' is 0, and all step scores are 0.\n      4. For EACH procedure step listed in the JSON schema, evaluate the resident's performance.\n          * If a step WAS performed: 'score' (1-5), 'time' (estimate "X minutes Y seconds"), 'comments' (constructive feedback).\n          * If a step was NOT performed/mentioned: 'score': 0, 'time': "N/A", 'comments': "This step was not performed or mentioned."\n      5.  **Overall Assessment:**\n          * 'caseDifficulty': (Number 1-3)\n          * 'additionalComments': (String) Provide a concise summary of overall performance.\n      6.  **Return ONLY the JSON object.** The entire response must be a single JSON object.\n    `; const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_JSON_SCHEMA, }, }; const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) { const errorBody = await response.text(); throw new Error(`Gemini evaluation API request failed: ${response.status} ${response.statusText} - ${errorBody}`); } const result = await response.json(); const resultText = result.candidates[0]?.content?.parts[0]?.text; if (!resultText) { throw new Error("Gemini API returned an empty or invalid response."); } return JSON.parse(resultText) as GeminiEvaluationResult; }
async function processJob(job: Job) { console.log(`Processing job ${job.id} for surgery: ${job.surgeryName}`); if (!job.gcsUrl || !job.surgeryName) { throw new Error('Job is-missing gcsUrl or surgeryName.'); } const transcription = await transcribeWithDeepgram(job.gcsUrl); console.log(`Job ${job.id}: Transcription complete.`); const evaluation = await evaluateTranscriptWithGemini(transcription, job.surgeryName, job.additionalContext || ''); console.log(`Job ${job.id}: Gemini evaluation complete.`); const finalResult = { ...evaluation, transcription, surgery: job.surgeryName, residentName: job.residentName, additionalContext: job.additionalContext, isFinalized: false, }; return finalResult; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // This endpoint should not be publicly accessible, hence the secret check.
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }

    const jobToProcess = await prisma.job.findUnique({ where: { id: jobId } });

    if (!jobToProcess) {
        return res.status(404).json({ message: 'Job not found.' });
    }
    
    // Respond to the trigger request immediately so it doesn't hang
    res.status(202).json({ message: `Processing started for job ${jobId}`});

    // --- Perform the actual processing in the background ---
    try {
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: { status: 'processing' },
        });

        const result = await processJob(jobToProcess);

        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: {
                status: 'complete',
                result: JSON.stringify(result),
                error: null,
            },
        });
        console.log(`[Processing] Job ${jobToProcess.id} completed successfully.`);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[Processing] Job ${jobToProcess.id} failed:`, errorMessage);
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: {
                status: 'failed',
                error: errorMessage,
            },
        });
    }
}