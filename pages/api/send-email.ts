// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

// This configuration is needed to get the names of the procedure steps.
const EVALUATION_CONFIGS = {
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

const createEmailHtml = (surgery: string, evaluation: any) => {
  const config = EVALUATION_CONFIGS[surgery as keyof typeof EVALUATION_CONFIGS];
  if (!config) return `<p>Could not generate report for surgery: ${surgery}</p>`;

  const stepsHtml = config.procedureSteps.map(step => {
    const data = evaluation[step.key];
    if (!data || data.score === 0) {
      return `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
          <h4 style="margin-top: 0; font-size: 16px;">${step.name}</h4>
          <p style="color: #666; font-style: italic;">${data?.comments || 'This step was not performed or mentioned in the provided transcript.'}</p>
        </div>
      `;
    }
    return `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
        <h4 style="margin-top: 0; font-size: 16px;">${step.name}</h4>
        <p><strong>Performance Score:</strong> ${data.score} / 5</p>
        <p><strong>Estimated Time:</strong> ${data.time}</p>
        <p><strong>AI Comments:</strong> ${data.comments}</p>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
      <h1 style="font-size: 24px; color: #1a202c; text-align: center;">AI-Generated Evaluation</h1>
      <h2 style="font-size: 20px; color: #2d3748; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">${surgery}</h2>
      
      <h3 style="font-size: 18px; color: #2d3748; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px;">Overall Assessment</h3>
      <p><strong>Case Difficulty:</strong> ${evaluation.caseDifficulty} / 3</p>
      <p><strong>Final Remarks:</strong> ${evaluation.additionalComments}</p>

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

  const { to, surgery, evaluation } = req.body;
  const subject = `Evaluation Results for ${surgery}`;
  const html = createEmailHtml(surgery, evaluation);
  
  // This uses your real email credentials from the .env.local file
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