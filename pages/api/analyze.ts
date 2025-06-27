import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

// This is the main configuration for your evaluation.
// It defines the structure and scoring for the AI.
const EVALUATION_CONFIG = {
  // The name of the surgery, passed to the AI for context.
  surgeryName: 'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)',
  
  // The different steps of the procedure that the AI will evaluate.
  procedureSteps: [
    { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', avgTime: '15-30 minutes' },
    { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', avgTime: '15-30 minutes' },
    { key: 'meshPlacement', name: 'Mesh Placement', avgTime: '10-15 minutes' },
    { key: 'portClosure', name: 'Port Closure', avgTime: '5-10 minutes' },
    { key: 'skinClosure', name: 'Skin Closure', avgTime: '2-5 minutes' },
  ],

  // The scoring scale that the AI will use to rate each step.
  scoringScale: [
    { score: 1, description: 'Resident observed only or attempted but was unsafe; attending performed the step.' },
    { score: 2, description: 'Resident performed less than 50% of the step before the attending took over.' },
    { score: 3, description: 'Resident performed more than 50% of the step but required assistance.' },
    { score: 4, description: 'Resident completed the entire step with coaching or guidance from the attending.' },
    { score: 5, description: 'Resident completed the entire step independently, without assistance.' },
  ],

  // The criteria for assessing the overall difficulty of the case.
  difficultyRating: [
    { level: 1, description: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.' },
    { level: 2, description: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.' },
    { level: 3, description: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.' },
  ],
};


// Define the expected structure of the JSON output from the AI.
// This helps ensure the AI's response is consistent and easy to work with.
const RESPONSE_JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    portPlacement: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        time: { type: "STRING" },
        comments: { type: "STRING" }
      }
    },
    herniaDissection: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        time: { type: "STRING" },
        comments: { type: "STRING" }
      }
    },
    meshPlacement: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        time: { type: "STRING" },
        comments: { type: "STRING" }
      }
    },
    portClosure: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        time: { type: "STRING" },
        comments: { type: "STRING" }
      }
    },
    skinClosure: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        time: { type: "STRING" },
        comments: { type: "STRING" }
      }
    },
    caseDifficulty: { type: "NUMBER" },
    additionalComments: { type: "STRING" },
  }
};


// Disable Next.js body parsing to allow formidable to handle the file stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main handler for the /api/analyze endpoint.
 * It receives an audio file, transcribes it, and then sends the transcript
 * to an AI model to generate a structured surgical evaluation.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // --- 1. PARSE THE INCOMING FILE ---
  const form = formidable({});
  let audioFile: formidable.File | null = null;

  try {
    const [fields, files] = await form.parse(req);
    audioFile = files.file?.[0] ?? null;

    if (!audioFile) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // --- 2. TRANSCRIBE THE AUDIO FILE ---
    console.log('Starting transcription...');
    const fileContent = fs.readFileSync(audioFile.filepath);
    const audioBytes = fileContent.toString('base64');
    
    // We are using a generic Gemini model for transcription here.
    // In a production scenario, you would use a dedicated Speech-to-Text API for better results.
    const transcription = await transcribeAudioWithGemini(audioBytes);
    console.log('Transcription complete.');


    // --- 3. EVALUATE THE TRANSCRIPT ---
    console.log('Starting evaluation...');
    const evaluation = await evaluateTranscriptWithGemini(transcription);
    console.log('Evaluation complete.');

    // --- 4. RETURN THE RESULT ---
    // The final result includes the AI-generated evaluation and the full transcript for review.
    res.status(200).json({ ...evaluation, transcription });

  } catch (error) {
    console.error('An error occurred during analysis:', error);
    res.status(500).json({ message: 'Error processing file.', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * Transcribes an audio file using the Gemini API.
 * @param audioBase64 - The Base64-encoded audio data.
 * @returns The transcribed text.
 */
async function transcribeAudioWithGemini(audioBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set.");
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: "Transcribe this audio of a surgical procedure. Provide a clean, readable transcript." },
          {
            inlineData: {
              mimeType: "audio/mp3",
              data: audioBase64
            }
          }
        ]
      }
    ],
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini transcription API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

/**
 * Evaluates a surgical transcript using the Gemini API and a structured prompt.
 * @param transcription - The text transcript of the surgery.
 * @returns A structured JSON object containing the evaluation.
 */
async function evaluateTranscriptWithGemini(transcription: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set.");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // This detailed prompt instructs the AI on exactly how to perform the evaluation.
    const prompt = `
      You are an expert surgical education analyst. Your task is to evaluate a resident's performance during a surgical procedure based on the provided transcript.
      
      **Procedure:** ${EVALUATION_CONFIG.surgeryName}
      
      **Transcript:**
      ---
      ${transcription}
      ---
      
      **Evaluation Criteria:**
      
      **1. Scoring Scale:**
      ${EVALUATION_CONFIG.scoringScale.map(s => `- ${s.score}: ${s.description}`).join('\n')}
      
      **2. Procedure Steps & Average Times:**
      ${EVALUATION_CONFIG.procedureSteps.map(p => `- ${p.name} (${p.avgTime})`).join('\n')}
      
      **3. Case Difficulty Rating:**
      ${EVALUATION_CONFIG.difficultyRating.map(d => `- Level ${d.level}: ${d.description}`).join('\n')}
      
      **Instructions:**
      1.  Read the entire transcript carefully.
      2.  For each procedure step, determine the resident's performance score based on the scoring scale.
      3.  Estimate the time taken for each step based on the conversation flow.
      4.  Provide specific, constructive comments for each step, quoting the transcript where relevant to justify your assessment.
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
    // The response text is a JSON string, so we need to parse it.
    return JSON.parse(result.candidates[0].content.parts[0].text);
}
