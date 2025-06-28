import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { createClient, DeepgramError } from '@deepgram/sdk';
import fs from 'fs';

// Define a type for a single step in the evaluation config
interface ProcedureStepConfig {
    key: string;
    name: string;
}

// Define the structure of the evaluation for a single procedure step
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

// This interface will hold the result from the Gemini evaluation.
// It uses an index signature to allow for dynamic property names based on procedure steps.
interface GeminiEvaluationResult {
  [key: string]: EvaluationStep | number | string;
  caseDifficulty: number;
  additionalComments: string;
}

// Define the main configuration object structure
interface EvaluationConfigs {
    [key: string]: {
        procedureSteps: ProcedureStepConfig[];
    };
}

const EVALUATION_CONFIGS: EvaluationConfigs = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space' },
            { key: 'meshPlacement', name: 'Mesh Placement' },
            { key: 'portClosure', name: 'Port Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' },
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
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' },
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
  let additionalContext: string = '';

  try {
    const [fields, files] = await form.parse(req);
    audioFile = files.file?.[0] ?? null;
    surgeryName = fields.surgery?.[0] ?? '';
    additionalContext = fields.additionalContext?.[0] ?? '';

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
    const evaluation = await evaluateTranscriptWithGemini(transcription, surgeryName, additionalContext);
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

// Define the type for the accumulator in the reduce function
interface SchemaProperties {
    [key: string]: {
        type: string;
        properties?: {
            [key: string]: { type: string };
        };
    };
}

async function evaluateTranscriptWithGemini(transcription: string, surgeryName: string, additionalContext: string): Promise<GeminiEvaluationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set.");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const EVALUATION_CONFIG = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];

    const RESPONSE_JSON_SCHEMA = {
        type: "OBJECT",
        properties: {
            ...EVALUATION_CONFIG.procedureSteps.reduce((acc: SchemaProperties, step: ProcedureStepConfig) => {
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

    const contextPromptSection = additionalContext
        ? `
      **Additional Context to Consider:**
      ---
      ${additionalContext}
      ---
      `
        : '';

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on a transcript and the provided context.

      **Procedure:** ${surgeryName}
      ${contextPromptSection}
      **Transcript with Speaker Labels:**
      ---
      ${transcription}
      ---

      **Instructions:**
      1.  Review all the information provided, including the procedure, transcript, and any additional context.
      2.  First, determine which speaker is the resident (learner) and which is the attending (teacher). The evaluation should focus on the resident's actions and understanding.
      3.  If the transcript is too short or lacks meaningful surgical dialogue, you MUST refuse to evaluate. Return a JSON object where 'additionalComments' explains why the evaluation is not possible, 'caseDifficulty' is 0, and all step scores are 0.
      4.  For EACH procedure step listed in the JSON schema, evaluate the resident's performance based on the transcript.
          * **If a step WAS performed:**
              * 'score': (Number 1-5) based on a standard surgical scoring scale (1=unsafe, 5=expert).
              * 'time': (String) Estimate the time spent on this step in the format "X minutes Y seconds" by analyzing timestamps.
              * 'comments': (String) Provide DETAILED, constructive feedback, taking into account the additional context if provided.
          * **If a step was NOT performed or mentioned:**
              * 'score': 0
              * 'time': "N/A"
              * 'comments': "This step was not performed or mentioned."
      5.  **Overall Assessment:**
          * 'caseDifficulty': (Number 1-3) Analyze the entire transcript and provided context to determine the overall case difficulty (1=Low, 2=Moderate, 3=High).
          * 'additionalComments': (String) Provide a concise summary of the resident's overall performance, including strengths and areas for improvement. This is for the final remarks. Make sure to incorporate the additional context in your assessment.
      6.  **Return ONLY the JSON object.** The entire response must be a single JSON object conforming to a schema.
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
    return JSON.parse(resultText) as GeminiEvaluationResult;
}