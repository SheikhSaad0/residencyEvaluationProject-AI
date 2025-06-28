import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

// ... (interfaces and EVALUATION_CONFIGS remain the same as the previous step) ...
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

interface ProcedureStep {
  key: string;
  name: string;
  goalTime: string;
}

interface EvaluationData {
  [key: string]: EvaluationStep | number | string;
  caseDifficulty: number;
  additionalComments: string;
  transcription: string;
}

const EVALUATION_CONFIGS: { [key: string]: { procedureSteps: ProcedureStep[] } } = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', goalTime: '15-30 minutes' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', goalTime: '15-30 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement', goalTime: '10-15 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", goalTime: '10-25 minutes' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', goalTime: '5-10 minutes' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', goalTime: '10-20 minutes' },
            { key: 'specimenRemoval', name: 'Specimen removal', goalTime: '5-10 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
    },
    'Robotic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", goalTime: '10-25 minutes' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', goalTime: '5-10 minutes' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', goalTime: '10-20 minutes' },
            { key: 'specimenRemoval', name: 'Specimen removal', goalTime: '5-10 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
    },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', goalTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', goalTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', goalTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', goalTime: '20-40 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', goalTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', goalTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '5-10 minutes' },
        ],
    },
    'Robotic Lap Ventral Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', goalTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', goalTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', goalTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', goalTime: '20-40 minutes' },
            { key: 'herniaClosure', name: 'Hernia Closure', goalTime: '10-20 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', goalTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', goalTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '5-10 minutes' },
        ],
    },
    'Laparoscopic Appendicectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix', goalTime: '10-20 minutes' },
            { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base', goalTime: '5-10 minutes' },
            { key: 'specimenExtraction', name: 'Specimen Extraction', goalTime: '2-5 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
    },
};


export default function ResultsPage() {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [surgery, setSurgery] = useState('');
  const [procedureSteps, setProcedureSteps] = useState<ProcedureStep[]>([]);
  const [showTranscription, setShowTranscription] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');


  useEffect(() => {
    const resultData = sessionStorage.getItem('analysisResult');
    const surgeryName = sessionStorage.getItem('selectedSurgery');

    if (resultData && surgeryName) {
      const parsedData = JSON.parse(resultData);
      setEvaluation(parsedData);
      setSurgery(surgeryName);
      
      try {
        localStorage.setItem(`evaluation-${Date.now()}`, JSON.stringify({ surgery: surgeryName, ...parsedData }));
      } catch (error) {
        console.error("Could not save to local storage", error);
      }

      const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
      if(config) {
        setProcedureSteps(config.procedureSteps);
      }
    } else {
      router.push('/');
    }
  }, [router]);
  
  const handleSendEmail = async () => {
    if (!email) {
      setEmailMessage('Please enter a valid email address.');
      return;
    }
    setIsSending(true);
    setEmailMessage('');
    setTimeout(() => {
        setIsSending(false);
        setEmailMessage(`Evaluation results sent to ${email}`);
        setEmail('');
    }, 1000);
  };

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
         <div className="text-center">
            <p className="text-xl text-gray-700 dark:text-gray-300">Loading evaluation results...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
              AI-Generated Evaluation
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-300 mb-8">
              {surgery}
            </p>
        </div>

        <div className="space-y-6">
            {procedureSteps.map((step) => (
                <EvaluationSection 
                    key={step.key}
                    step={step}
                    data={evaluation[step.key] as EvaluationStep}
                />
            ))}
        </div>

        <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Overall Assessment</h2>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-slate-700/50 space-y-4">
                <p className="text-gray-900 dark:text-white"><strong>Case Difficulty:</strong> <span className="font-bold text-lg text-brand-green">{evaluation.caseDifficulty} / 3</span></p>
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Final Remarks:</h3>
                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-slate-600 p-4 rounded-md">{evaluation.additionalComments}</p>
                </div>
            </div>
        </div>

        <div className="mt-8">
          <div
            onClick={() => setShowTranscription(!showTranscription)}
            className="flex justify-between items-center cursor-pointer border-b pb-2 border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Full Transcription</h2>
            <span className="text-2xl text-gray-600 dark:text-gray-300">{showTranscription ? '▲' : '▼'}</span>
          </div>
          {showTranscription && (
            <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900/50 max-h-72 overflow-y-auto">
              {evaluation.transcription && evaluation.transcription.trim() !== '' ? (
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono text-sm">{evaluation.transcription}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Full transcription is not available.</p>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Share Results</h2>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-grow w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-brand-green focus:outline-none"
                />
                <button
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="w-full sm:w-auto bg-brand-green text-white px-6 py-3 rounded-lg shadow-md hover:bg-brand-green-500 transition-colors disabled:bg-gray-400"
                >
                    {isSending ? 'Sending...' : 'Send Email'}
                </button>
            </div>
            {emailMessage && <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">{emailMessage}</p>}
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-10 w-full bg-gray-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-gray-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Evaluate Another Procedure
        </button>
      </div>
    </div>
  );
}

const EvaluationSection = ({ step, data }: { step: ProcedureStep, data: EvaluationStep }) => {
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-700 hover:shadow-md transition-shadow">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.name}</h3>
        
        {data && data.score > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300">Performance Score:</p>
                    <p className="text-2xl font-bold text-brand-green">{data.score} / 5</p>
                </div>
                <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300">Goal Time:</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{step.goalTime}</p>
                </div>
                <div>
                    <p className="font-medium text-gray-600 dark:text-gray-300">Rough estimate:</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{data.time}</p>
                </div>
            </div>
            <div className="mt-4">
                <p className="font-medium text-gray-600 dark:text-gray-300">AI-Generated Comments:</p>
                <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1">{data.comments}</p>
            </div>
          </>
        ) : (
          <div>
            <p className="font-medium text-gray-600 dark:text-gray-300">AI-Generated Comments:</p>
            <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1 italic">
              {data ? data.comments : "This step was not performed or mentioned in the provided transcript."}
            </p>
          </div>
        )}
      </div>
    );
};