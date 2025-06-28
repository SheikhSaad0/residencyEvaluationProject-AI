import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { SpeechClient, protos } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage'; // Import the Storage client

// Define a type for our evaluation data for better type safety
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
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', avgTime: '15-30 minutes' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', avgTime: '15-30 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement', avgTime: '10-15 minutes' },
            { key: 'portClosure', name: 'Port Closure', avgTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '2-5 minutes' },
        ],
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', avgTime: '5-10' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", avgTime: '10-25' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division pf Cystic Artery and Duct', avgTime: '5-10' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', avgTime: '10-20' },
            { key: 'specimenRemoval', name: 'Specimen removal', avgTime: '5-10' },
            { key: 'portClosure', name: 'Port Closure', avgTime: '5-10' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '2-5' },
        ],
    },
    'Robotic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', avgTime: '5-10' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", avgTime: '10-25' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division pf Cystic Artery and Duct', avgTime: '5-10' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', avgTime: '10-20' },
            { key: 'specimenRemoval', name: 'Specimen removal', avgTime: '5-10' },
            { key: 'portClosure', name: 'Port Closure', avgTime: '5-10' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '2-5' },
        ],
    },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', avgTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', avgTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', avgTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', avgTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', avgTime: '20-40 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', avgTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', avgTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', avgTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '5-10 minutes' },
        ],
    },
    'Robotic Lap Ventral Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', avgTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', avgTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', avgTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', avgTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', avgTime: '20-40 minutes' },
            { key: 'herniaClosure', name: 'Hernia Closure', avgTime: '10-20 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', avgTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', avgTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', avgTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '5-10 minutes' },
        ],
    },
    'Laparoscopic Appendicectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', avgTime: '5–10 min' },
            { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix', avgTime: '10–20 min' },
            { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base', avgTime: '5–10 min' },
            { key: 'specimenExtraction', name: 'Specimen Extraction', avgTime: '2–5 min' },
            { key: 'portClosure', name: 'Port Closure', avgTime: '5–10 min' },
            { key: 'skinClosure', name: 'Skin Closure', avgTime: '2–5 min' },
        ],
    },
};

const scoringScale = [
    { score: 1, description: 'Resident observed only or attempted but was unsafe; attending performed the step.' },
    { score: 2, description: 'Resident performed less than 50% of the step before the attending took over.' },
    { score: 3, description: 'Resident performed more than 50% of the step but required assistance.' },
    { score: 4, description: 'Resident completed the entire step with coaching or guidance from the attending.' },
    { score: 5, description: 'Resident completed the entire step independently, without assistance.' },
];

const difficultyRating = [
    { level: 1, description: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.' },
    { level: 2, description: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.' },
    { level: 3, description: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.' },
];

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = formidable({});
  let audioFile: formidable.File | null = null;
  let surgeryName:string = '';

  try {
    const [fields, files] = await form.parse(req);
    audioFile = files.file?.[0] ?? null;
    surgeryName = fields.surgery?.[0] ?? '';

    if (!audioFile) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!surgeryName || !EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS]) {
      return res.status(400).json({ message: 'Invalid surgery name provided.' });
    }

    console.log('Starting transcription for large file...');
    const transcription = await transcribeWithSpeechToText(audioFile);
    console.log('Transcription complete.');

    console.log('Starting evaluation...');
    const evaluation = await evaluateTranscriptWithGemini(transcription, surgeryName);
    console.log('Evaluation complete.');

    res.status(200).json({ ...evaluation, transcription });

  } catch (error) {
    console.error('An error occurred during analysis:', error);
    res.status(500).json({ message: 'Error processing file.', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function transcribeWithSpeechToText(audioFile: formidable.File): Promise<string> {
    const speechClient = new SpeechClient();
    const storage = new Storage();
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!bucketName) {
        throw new Error("GCS_BUCKET_NAME environment variable not set.");
    }

    // 1. Upload the file to Google Cloud Storage
    const destination = `audio-uploads/${audioFile.newFilename}-${Date.now()}`;
    await storage.bucket(bucketName).upload(audioFile.filepath, {
        destination: destination,
    });
    console.log(`${audioFile.filepath} uploaded to ${bucketName}/${destination}`);
    const gcsUri = `gs://${bucketName}/${destination}`;

    // 2. Configure the long-running recognition request
    const audio = {
        uri: gcsUri,
    };

    const diarizationConfig: protos.google.cloud.speech.v1.ISpeakerDiarizationConfig = {
        enableSpeakerDiarization: true,
        minSpeakerCount: 2,
        maxSpeakerCount: 2,
    };

    const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
        encoding: 'MP3',
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
        diarizationConfig: diarizationConfig,
        // The sampleRateHertz is not needed for files on GCS; the API determines it automatically.
    };

    const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest = {
        audio: audio,
        config: config,
    };

    // 3. Start the long-running recognition job
    const [operation] = await speechClient.longRunningRecognize(request);

    // 4. Wait for the job to complete
    const [response] = await operation.promise();
    console.log('Long-running transcription job finished.');

    // 5. Delete the file from GCS to save space and costs
    await storage.bucket(bucketName).file(destination).delete();
    console.log(`Deleted ${destination} from GCS.`);


    // 6. Process the results into a transcript string (same as before)
    let fullTranscript = '';
    if (response.results) {
        response.results.forEach((result: protos.google.cloud.speech.v1.ISpeechRecognitionResult) => {
            if (result.alternatives && result.alternatives.length > 0) {
                const alternative = result.alternatives[0];
                if (alternative.words) {
                    alternative.words.forEach((wordInfo: protos.google.cloud.speech.v1.IWordInfo) => {
                        const startTime = `${wordInfo.startTime?.seconds}.${(wordInfo.startTime?.nanos || 0).toString().substring(0, 3)}`;
                        const speakerTag = wordInfo.speakerTag;
                        fullTranscript += `[${startTime}s Speaker ${speakerTag}]: ${wordInfo.word}\n`;
                    });
                }
            }
        });
    }

    return fullTranscript;
}


async function evaluateTranscriptWithGemini(transcription: string, surgeryName: string): Promise<EvaluationData> {
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
      You are an expert surgical education analyst. Your task is to evaluate a resident's performance during a surgical procedure based on the provided transcript. The transcript includes timestamps and speaker labels.
      
      **Procedure:** ${surgeryName}
      
      **Transcript:**
      ---
      ${transcription}
      ---
      
      **Evaluation Criteria:**
      
      **1. Scoring Scale:**
      ${scoringScale.map(s => `- ${s.score}: ${s.description}`).join('\n')}
      
      **2. Procedure Steps & Average Times:**
      ${EVALUATION_CONFIG.procedureSteps.map((p: any) => `- ${p.name} (${p.avgTime})`).join('\n')}
      
      **3. Case Difficulty Rating:**
      ${difficultyRating.map(d => `- Level ${d.level}: ${d.description}`).join('\n')}
      
      **Instructions:**
      1.  Read the entire transcript carefully, paying attention to the speaker labels and timestamps. Assume 'Speaker 1' is the resident and 'Speaker 2' is the attending surgeon.
      2.  For each procedure step, determine the resident's performance score based on the scoring scale and the conversation between the speakers.
      3.  **Calculate the time taken for each step by finding the start and end timestamps of the relevant section in the transcript. The time should be in the format "X minutes Y seconds".**
      4.  Provide specific, constructive comments for each step, quoting the transcript where relevant to justify your assessment. Use the speaker labels to differentiate between the resident's actions and the attending's guidance.
      5.  Assess the overall case difficulty based on the criteria.
      6.  Write a concise summary in the "additionalComments" field.
      7.  Return your analysis ONLY as a valid JSON object matching the provided schema. Do not include any other text or explanations.
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
    return JSON.parse(resultText) as EvaluationData;
}