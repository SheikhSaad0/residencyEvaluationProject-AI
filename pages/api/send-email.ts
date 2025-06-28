import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

const difficultyDescriptions = {
    standard: {
        1: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.',
        2: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.',
        3: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.'
    },
    lapAppy: {
        1: 'Low: Primary, straightforward case with normal anatomy',
        2: 'Moderate: Mild adhesions or anatomical variation',
        3: 'High: Dense adhesions, distorted anatomy, prior surgery, or perforated/complicated appendicitis'
    }
};

const EVALUATION_CONFIGS: { [key: string]: { procedureSteps: {key: string, name: string}[], caseDifficultyDescriptions: { [key: number]: string } } } = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space' },
            { key: 'meshPlacement', name: 'Mesh Placement' },
            { key: 'portClosure', name: 'Port Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.lapAppy,
    },
};

interface EvaluationStepData {
  score: number;
  time: string;
  comments: string;
  attendingScore?: number;
  attendingComments?: string;
  attendingTime?: string;
}

interface EvaluationData {
  [key: string]: EvaluationStepData | number | string | boolean | undefined;
  caseDifficulty: number;
  attendingCaseDifficulty?: number;
  additionalComments: string;
  attendingAdditionalComments?: string;
  transcription: string;
}

const createEmailHtml = (surgery: string, evaluation: EvaluationData, residentName?: string, additionalContext?: string) => {
  const config = EVALUATION_CONFIGS[surgery as keyof typeof EVALUATION_CONFIGS];
  if (!config) return `<p>Could not generate report for surgery: ${surgery}</p>`;

  const stepsHtml = config.procedureSteps.map(step => {
    const data = evaluation[step.key] as EvaluationStepData;
    const attendingScore = data.attendingScore ?? data.score;
    
    if (!data || attendingScore === 0) {
      return `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
          <h4 style="margin-top: 0; font-size: 16px;">${step.name}</h4>
          <p style="color: #666; font-style: italic;">${data?.attendingComments || data?.comments || 'This step was not performed or mentioned.'}</p>
        </div>
      `;
    }
    return `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
        <h4 style="margin-top: 0; font-size: 16px;">${step.name}</h4>
        <p><strong>AI Performance Score:</strong> ${data.score > 0 ? `${data.score} / 5` : 'N/A'}</p>
        <p><strong>Attending Performance Score:</strong> ${attendingScore} / 5</p>
        <p><strong>Time Taken:</strong> ${data.attendingTime ?? data.time}</p>
        <p><strong>AI Comments:</strong> ${data.comments}</p>
        ${data.attendingComments ? `<p><strong>Attending Comments:</strong> ${data.attendingComments}</p>` : ''}
      </div>
    `;
  }).join('');

  const descriptionsHtml = Object.entries(config.caseDifficultyDescriptions).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('');
  const residentHtml = residentName ? `<h3 style="font-size: 18px; color: #4a5568; text-align: center; margin-bottom: 20px;">Resident: ${residentName}</h3>` : '';
  const contextHtml = additionalContext
    ? `
    <div style="margin-bottom: 20px;">
      <h4 style="margin-top: 0; font-size: 16px;">Provided Context:</h4>
      <p style="background-color: #f7fafc; padding: 10px; border-radius: 5px; border: 1px solid #eee; font-style: italic;">${additionalContext}</p>
    </div>
    `
    : '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <h1 style="font-size: 24px; color: #1a202c; text-align: center;">Final Evaluation Report</h1>
      <h2 style="font-size: 20px; color: #2d3748; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">${surgery}</h2>
      ${residentHtml}
      
      <h3 style="font-size: 18px; color: #2d3748; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px;">Overall Assessment</h3>
      ${contextHtml}
      <div style="margin-bottom: 20px;">
        <h4 style="margin-top: 0; font-size: 16px;">Case Difficulty Descriptions:</h4>
        <ul style="list-style-position: inside; padding-left: 0;">${descriptionsHtml}</ul>
      </div>
      <p><strong>AI Case Difficulty:</strong> ${evaluation.caseDifficulty} / 3</p>
      <p><strong>Attending Case Difficulty:</strong> ${evaluation.attendingCaseDifficulty ?? evaluation.caseDifficulty} / 3</p>
      <p><strong>AI Final Remarks:</strong> ${evaluation.additionalComments}</p>
      <p><strong>Attending Final Remarks:</strong> ${evaluation.attendingAdditionalComments ?? evaluation.additionalComments}</p>

      <h3 style="font-size: 18px; color: #2d3748; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px;">Procedure Step Evaluation</h3>
      ${stepsHtml}

      <details style="margin-top: 30px;">
        <summary style="font-size: 18px; color: #2d3748; cursor: pointer;">Full Transcription</summary>
        <pre style="white-space: pre-wrap; background-color: #f7fafc; padding: 15px; border-radius: 5px; border: 1px solid #eee; font-size: 12px; max-height: 300px; overflow-y: auto;">${evaluation.transcription}</pre>
      </details>
    </div>
  `;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { to, surgery, evaluation, residentName, additionalContext } = req.body;
  const subject = `Final Evaluation Results for ${residentName || 'Resident'} - ${surgery}`;
  const html = createEmailHtml(surgery, evaluation, residentName, additionalContext);
  
  // Moved transporter creation inside the handler to avoid build-time errors
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Surgical AI Evaluator" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    res.status(200).json({ message: 'Email sent successfully!' });

  } catch (error) {
    console.error('Failed to send email:', error);
    res.status(500).json({ 
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : String(error)
    });
  }
}