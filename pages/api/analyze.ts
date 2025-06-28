import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { AssemblyAI } from 'assemblyai';

// Keep the same interface definitions as before
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

interface EvaluationData {
  [key: string]: EvaluationStep | number | string;
  caseDifficulty: number;
  additionalComments: string;
  transcription: string;
}

const EVALUATION_CONFIGS = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space'},
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space'},
            { key: 'meshPlacement', name: 'Mesh Placement'},
            { key: 'portClosure', name: 'Port Closure'},
            { key: 'skinClosure', name: 'Skin Closure'},
        ],
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division pf Cystic Artery and Duct'},
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' },
            { key: 'specimenRemoval', name: 'Specimen removal' },
            { key: 'portClosure', name: 'Port Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
    'Robotic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division pf Cystic Artery and Duct' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' },
            { key: 'specimenRemoval', name: 'Specimen removal' },
            { key: 'portClosure', name: 'Port Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'robotDocking', name: 'Docking the robot' },
            { key: 'instrumentPlacement', name: 'Instrument Placement' },
            { key: 'herniaReduction', name: 'Reduction of Hernia' },
            { key: 'flapCreation', name: 'Flap Creation' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation' },
            { key: 'flapClosure', name: 'Flap Closure' },
            { key: 'undocking', name: 'Undocking/trocar removal' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
    'Robotic Lap Ventral Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'robotDocking', name: 'Docking the robot' },
            { key: 'instrumentPlacement', name: 'Instrument Placement' },
            { key: 'herniaReduction', name: 'Reduction of Hernia' },
            { key: 'flapCreation', name: 'Flap Creation' },
            { key: 'herniaClosure', name: 'Hernia Closure' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation' },
            { key: 'flapClosure', name: 'Flap Closure' },
            { key: 'undocking', name: 'Undocking/trocar removal' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
    'Laparoscopic Appendicectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix' },
            { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base' },
            { key: 'specimenExtraction', name: 'Specimen Extraction' },
            { key: 'portClosure', name: 'Port Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log("\nReceived new request. Waiting for file upload to complete...");

  const form = formidable({});
  let audioFile: formidable.File | null = null;
  let surgeryName: string = '';

  try {
    const [fields, files] = await form.parse(req);
    audioFile = files.file?.[0] ?? null;
    surgeryName = fields.surgery?.[0] ?? '';

    console.log("✅ File upload complete.");

    if (!audioFile) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!surgeryName || !EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS]) {
      return res.status(400).json({ message: 'Invalid surgery name provided.' });
    }

    console.log("---");
    console.log("Step 1: Transcribing audio with AssemblyAI...");
    const transcription = await transcribeWithAssemblyAI(audioFile);
    console.log("✅ Transcription complete.");
    console.log("---");

    console.log("Step 2: Evaluating transcript with Gemini...");
    const evaluation = await evaluateTranscriptWithGemini(transcription, surgeryName);
    console.log("✅ Evaluation complete.");
    console.log("---");

    console.log("Step 3: Sending final response to the browser.");
    res.status(200).json({ ...evaluation, transcription });

  } catch (error) {
    console.error('An error occurred during analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
    res.status(500).json({ message: errorMessage });
  }
}

async function transcribeWithAssemblyAI(audioFile: formidable.File): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY environment variable not set. Please add it to your .env.local file.");
  }

  const client = new AssemblyAI({ apiKey });

  console.log("  -> Uploading file to AssemblyAI and starting transcription...");
  const transcript = await client.transcripts.transcribe({
    audio: audioFile.filepath,
  });

  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI Transcription failed: ${transcript.error}`);
  }
  
  const transcriptText = transcript.text || '';

  if (transcriptText.trim() === '') {
      throw new Error("Transcription failed: The API returned no text. The audio file may be silent.");
  }

  return transcriptText;
}


async function evaluateTranscriptWithGemini(transcription: string, surgeryName: string): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set.");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const EVALUATION_CONFIG = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];

    const RESPONSE_JSON_SCHEMA = {
      type: "OBJECT",
      properties: {
        ...EVALUATION_CONFIG.procedureSteps.reduce((acc: any, step: any) => {
          acc[step.key] = {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              time: { type: "STRING" },
              comments: { type: "STRING" }
            }
          };
          return acc;
        }, {}),
        caseDifficulty: { type: "NUMBER" },
        additionalComments: { type: "STRING" },
      }
    };

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on a raw transcript. The transcript does NOT contain speaker labels.

      **Procedure:** ${surgeryName}
      **Transcript:**
      ---
      ${transcription}
      ---

      **Instructions:**
      1.  The transcript is a raw dump of a conversation. Analyze the dialogue to infer which lines likely belong to the resident (the learner) and which belong to the attending (the teacher).
      2.  If the transcript is too short or lacks meaningful surgical dialogue, you MUST refuse to evaluate. Return a JSON object where 'additionalComments' explains why the evaluation is not possible, and all other fields are default values (score: 0, time: 'N/A', comments: 'Not applicable.').
      3.  Based on your inferences, evaluate the resident's performance for ALL procedure steps listed below.
      4.  **If a step WAS performed:**
          * 'score': (Number 1-5) based on the scoring scale.
          * 'time': (String) Provide a rough estimate of the time spent on this step in the format "X minutes Y seconds".
          * 'comments': (String) Provide DETAILED, constructive feedback.
      5.  **If a step was NOT performed or mentioned:**
          * 'score': 0
          * 'time': "N/A"
          * 'comments': "This step was not performed or mentioned in the provided transcript."
      6.  **Return ONLY the JSON object.**
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_JSON_SCHEMA,
      },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini evaluation API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const resultText = result.candidates[0].content.parts[0].text;
    return JSON.parse(resultText);
}
