import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
// Import 'createClient' and 'DeepgramError' from the Deepgram SDK
import { createClient, DeepgramError } from '@deepgram/sdk';
import fs from 'fs';

// Interface definitions remain the same
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

// EVALUATION_CONFIGS remains the same
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

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

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
    console.log("Step 1: Transcribing audio with Deepgram...");
    const transcription = await transcribeWithDeepgram(audioFile);
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

    if (error instanceof DeepgramError) {
      return res.status(500).json({ message: `Deepgram Error: ${error.message}` });
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
    res.status(500).json({ message: errorMessage });
  }
}

async function transcribeWithDeepgram(audioFile: formidable.File): Promise<string> {
    if (!process.env.DEEPGRAM_API_KEY) {
        throw new Error("DEEPGRAM_API_KEY environment variable not set.");
    }

    console.log("  -> Uploading file to Deepgram and starting transcription with diarization...");

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fs.readFileSync(audioFile.filepath),
      {
        model: 'nova-2',
        diarize: true,
        punctuate: true,
        utterances: true,
      }
    );
  
    if (error) {
      throw error;
    }
    
    const utterances = result.results?.utterances;
    
    let transcriptText = '';
    if (utterances && utterances.length > 0) {
      // Let TypeScript infer the type of 'utt'
      transcriptText = utterances
        .map(utt => `[Speaker ${utt.speaker}] (${utt.start.toFixed(2)}s): ${utt.transcript}`)
        .join('\n');
    } else {
      throw new Error("Deepgram transcription failed to return utterances.");
    }
  
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
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on a transcript that includes speaker labels and timestamps.

      **Procedure:** ${surgeryName}
      **Transcript with Speaker Labels:**
      ---
      ${transcription}
      ---

      **Instructions:**
      1.  The transcript is a dialogue with speaker labels (e.g., [Speaker 0], [Speaker 1]) and timestamps. First, determine which speaker is the resident (learner) and which is the attending (teacher). The attending usually gives more instructions and guidance, while the resident asks more questions or is the one performing the actions being guided.
      2.  If the transcript is too short or lacks meaningful surgical dialogue, you MUST refuse to evaluate. Return a JSON object where 'additionalComments' explains why the evaluation is not possible, and all other fields are default values.
      3.  Based on the dialogue attributed to the resident, evaluate their performance for ALL procedure steps listed below. The evaluation should focus solely on the resident's actions and understanding.
      4.  **If a step WAS performed:**
          * 'score': (Number 1-5) based on the resident's performance according to a standard surgical scoring scale (1=unsafe, 5=expert).
          * 'time': (String) Provide a rough estimate of the time spent on this step in the format "X minutes Y seconds" by analyzing the timestamps of the relevant utterances.
          * 'comments': (String) Provide DETAILED, constructive feedback on the resident's actions and understanding.
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