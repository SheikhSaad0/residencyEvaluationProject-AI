import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

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

export default function ResultsPage() {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [surgery, setSurgery] = useState('');
  const [procedureSteps, setProcedureSteps] = useState<{key: string, name: string}[]>([]);

  useEffect(() => {
    const resultData = sessionStorage.getItem('analysisResult');
    const surgeryName = sessionStorage.getItem('selectedSurgery');

    if (resultData && surgeryName) {
      setEvaluation(JSON.parse(resultData));
      setSurgery(surgeryName);
      const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
      if(config) {
        setProcedureSteps(config.procedureSteps);
      }
    } else {
      router.push('/');
    }
  }, [router]);

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
         <div className="text-center">
            <p className="text-xl text-gray-700">Loading evaluation results...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              AI-Generated Evaluation
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {surgery}
            </p>
        </div>

        <div className="space-y-6">
            {procedureSteps.map((step) => (
                <EvaluationSection 
                    key={step.key}
                    title={step.name}
                    data={evaluation[step.key] as EvaluationStep}
                />
            ))}
        </div>

        <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b pb-2">Overall Assessment</h2>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50 space-y-4">
                <p><strong>Case Difficulty:</strong> <span className="font-bold text-lg text-blue-600">{evaluation.caseDifficulty} / 3</span></p>
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-800">Final Remarks:</h3>
                    <p className="text-gray-700 leading-relaxed bg-white p-4 rounded-md">{evaluation.additionalComments}</p>
                </div>
            </div>
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b pb-2">Full Transcription</h2>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
            {evaluation.transcription && evaluation.transcription.trim() !== '' ? (
              <p className="text-gray-600 whitespace-pre-wrap font-mono text-sm">{evaluation.transcription}</p>
            ) : (
              <p className="text-gray-500">Full transcription is not available.</p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-10 w-full bg-gray-600 text-white px-6 py-4 rounded-lg shadow-md hover:bg-gray-700 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Evaluate Another Procedure
        </button>
      </div>
    </div>
  );
}

const EvaluationSection = ({ title, data }: { title: string; data: EvaluationStep }) => {
    if (!data) {
        return null;
    }

    if (data.score === 0) {
        return (
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 italic">{data.comments}</p>
            </div>
        );
    }

    return (
      <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p className="font-medium text-gray-600">Performance Score:</p>
                <p className="text-2xl font-bold text-blue-600">{data.score} / 5</p>
            </div>
            <div>
                <p className="font-medium text-gray-600">Estimated Time:</p>
                <p className="text-lg font-semibold">{data.time}</p>
            </div>
        </div>
        <div className="mt-4">
            <p className="font-medium text-gray-600">AI-Generated Comments:</p>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md mt-1">{data.comments}</p>
        </div>
      </div>
    );
};