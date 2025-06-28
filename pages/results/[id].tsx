import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
  attendingScore?: number;
  attendingComments?: string;
  attendingTime?: string;
}

interface ProcedureStep {
  key: string;
  name: string;
  goalTime: string;
}

interface EvaluationData {
  [key: string]: EvaluationStep | number | string | boolean | undefined;
  caseDifficulty: number;
  additionalComments: string;
  attendingCaseDifficulty?: number;
  attendingAdditionalComments?: string;
  transcription: string;
  surgery: string;
  residentName?: string;
  additionalContext?: string;
  isFinalized?: boolean;
}

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

const EVALUATION_CONFIGS: { [key: string]: { procedureSteps: ProcedureStep[], caseDifficultyDescriptions: { [key: number]: string } } } = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', goalTime: '15-30 minutes' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', goalTime: '15-30 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement', goalTime: '10-15 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.standard,
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
        caseDifficultyDescriptions: difficultyDescriptions.lapAppy,
    },
};

export default function ResultsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [editedEvaluation, setEditedEvaluation] = useState<EvaluationData | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [surgery, setSurgery] = useState('');
  const [residentName, setResidentName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [procedureSteps, setProcedureSteps] = useState<ProcedureStep[]>([]);
  const [showTranscription, setShowTranscription] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');


  useEffect(() => {
    if (id) {
        const resultData = localStorage.getItem(`evaluation-${id}`);
        if (resultData) {
            try {
                const parsedData = JSON.parse(resultData);
                setEvaluation(parsedData);
                setEditedEvaluation(JSON.parse(JSON.stringify(parsedData))); 
                setSurgery(parsedData.surgery);
                setResidentName(parsedData.residentName || '');
                setAdditionalContext(parsedData.additionalContext || '');
                setIsFinalized(parsedData.isFinalized || false);
    
                const config = EVALUATION_CONFIGS[parsedData.surgery as keyof typeof EVALUATION_CONFIGS];
                if (config) {
                    setProcedureSteps(config.procedureSteps);
                }
            } catch (error) {
                console.error("Failed to parse evaluation data from localStorage", error);
                router.push('/');
            }
        } else {
            router.push('/');
        }
    }
  }, [id, router]);

  const handleFinalize = () => {
      if (editedEvaluation) {
        const finalEvaluation = { ...editedEvaluation, isFinalized: true };
        localStorage.setItem(`evaluation-${id}`, JSON.stringify(finalEvaluation));
        setIsFinalized(true);
      }
  };
  
  const handleSendEmail = async () => {
    if (!email) {
      setEmailMessage('Please enter a valid email address.');
      return;
    }
    if (!editedEvaluation) {
        setEmailMessage('Evaluation data is not available to send.');
        return;
    }
    setIsSending(true);
    setEmailMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          surgery: surgery,
          evaluation: editedEvaluation,
          residentName: residentName,
          additionalContext: additionalContext,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email.');
      }

      setEmailMessage(`Email sent!`);
      setEmail('');
    } catch (error) {
      console.error(error);
      setEmailMessage(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleEvaluationChange = (stepKey: string, field: string, value: any) => {
    if (editedEvaluation) {
        const newEvaluation = { ...editedEvaluation };
        (newEvaluation[stepKey] as EvaluationStep) = {
            ...(newEvaluation[stepKey] as EvaluationStep),
            [field]: value,
        };
        setEditedEvaluation(newEvaluation);
    }
  };

  const handleOverallChange = (field: string, value: any) => {
    if (editedEvaluation) {
        setEditedEvaluation({ ...editedEvaluation, [field]: value });
    }
  };

  if (!evaluation || !editedEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
         <div className="text-center">
            <p className="text-xl text-gray-700 dark:text-gray-300">Loading evaluation results...</p>
         </div>
      </div>
    );
  }

  const descriptions = EVALUATION_CONFIGS[surgery as keyof typeof EVALUATION_CONFIGS]?.caseDifficultyDescriptions;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
              {isFinalized ? 'Final Evaluation' : 'AI-Generated Evaluation Draft'}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-300 mb-1">
              {surgery}
            </p>
            {residentName && <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-8">Resident: {residentName}</p>}
        </div>

        <div className="space-y-6">
            {procedureSteps.map((step) => (
                <EvaluationSection 
                    key={step.key}
                    step={step}
                    aiData={evaluation[step.key] as EvaluationStep}
                    editedData={editedEvaluation[step.key] as EvaluationStep}
                    isFinalized={isFinalized}
                    onChange={(field, value) => handleEvaluationChange(step.key, field, value)}
                />
            ))}
        </div>

        <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Overall Assessment</h2>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-slate-700/50 space-y-4">
                
                {additionalContext && (
                    <div>
                        <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Provided Context:</h4>
                        <p className="text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-600 p-4 rounded-md italic">{additionalContext}</p>
                    </div>
                )}

                {descriptions && (
                    <div className="mt-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Case Difficulty Descriptions:</h3>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-200 space-y-1">
                            {Object.entries(descriptions).map(([key, value]) => (
                                <li key={key}><strong>{key}:</strong> {value}</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <p className="text-gray-900 dark:text-white pt-4"><strong>AI Case Difficulty:</strong> <span className="font-bold text-lg text-brand-green">{evaluation.caseDifficulty} / 3</span></p>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-slate-600 p-4 rounded-md"><strong>AI Final Remarks:</strong> {evaluation.additionalComments}</p>

                <div className="mt-4">
                    <label className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Attending Case Difficulty:</label>
                    <input 
                        type="number" 
                        min="1" max="3" 
                        value={editedEvaluation.attendingCaseDifficulty ?? ''}
                        placeholder={evaluation.caseDifficulty?.toString()}
                        onChange={(e) => handleOverallChange('attendingCaseDifficulty', e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={isFinalized}
                        className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                    />
                </div>
                <div>
                    <label className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Attending Final Remarks:</label>
                    <textarea 
                        value={editedEvaluation.attendingAdditionalComments ?? ''}
                        placeholder={evaluation.additionalComments}
                        onChange={(e) => handleOverallChange('attendingAdditionalComments', e.target.value)}
                        disabled={isFinalized}
                        className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                        rows={4}
                    />
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
        
        {!isFinalized && (
            <button
                onClick={handleFinalize}
                className="mt-10 w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg font-semibold"
            >
                Finalize Evaluation
            </button>
        )}

        {isFinalized && (
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
        )}

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

const EvaluationSection = ({ step, aiData, editedData, isFinalized, onChange }: { step: ProcedureStep, aiData: EvaluationStep, editedData: EvaluationStep, isFinalized: boolean, onChange: (field: string, value: any) => void }) => {
    const [isManuallyOpened, setIsManuallyOpened] = useState(false);
    const wasPerformed = aiData && aiData.score > 0;

    if (!wasPerformed && !isManuallyOpened) {
        return (
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.name}</h3>
                <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1 italic">
                    {aiData?.comments || "This step was not performed or mentioned in the provided transcript."}
                </p>
                {!isFinalized && (
                    <button 
                        onClick={() => setIsManuallyOpened(true)}
                        className="mt-4 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500"
                    >
                        Manually Evaluate Step
                    </button>
                )}
            </div>
        );
    }
    
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-700 hover:shadow-md transition-shadow">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.name}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p className="font-medium text-gray-600 dark:text-gray-300">AI Performance Score:</p>
                <p className="text-2xl font-bold text-brand-green">{wasPerformed ? `${aiData.score} / 5` : 'N/A'}</p>
            </div>
            <div>
                <label className="font-medium text-gray-600 dark:text-gray-300">Attending Score:</label>
                <input 
                    type="number" 
                    min="0" max="5" 
                    value={editedData.attendingScore ?? ''}
                    placeholder={aiData.score > 0 ? aiData.score.toString() : '0'}
                    onChange={(e) => onChange('attendingScore', e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={isFinalized}
                    className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                />
            </div>
            <div>
                <p className="font-medium text-gray-600 dark:text-gray-300">Goal Time:</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{step.goalTime}</p>
            </div>
            <div>
                <label className="font-medium text-gray-600 dark:text-gray-300">Time Taken:</label>
                <input 
                    type="text"
                    value={editedData.attendingTime ?? ''}
                    placeholder={aiData.time}
                    onChange={(e) => onChange('attendingTime', e.target.value)}
                    disabled={isFinalized}
                    className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                />
            </div>
        </div>
        <div className="mt-4">
            <p className="font-medium text-gray-600 dark:text-gray-300">AI-Generated Comments:</p>
            <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1">{wasPerformed ? aiData.comments : 'N/A'}</p>
        </div>
        <div className="mt-4">
            <label className="font-medium text-gray-600 dark:text-gray-300">Attending Comments:</label>
            <textarea 
                value={editedData.attendingComments ?? ''}
                placeholder={aiData.comments}
                onChange={(e) => onChange('attendingComments', e.target.value)}
                disabled={isFinalized}
                className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500 mt-1"
                rows={3}
            />
        </div>
      </div>
    );
};