import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

// Define a type for our evaluation data for better type safety
// This should match the JSON structure returned by the /api/analyze endpoint
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
}

interface EvaluationData {
  portPlacement: EvaluationStep;
  herniaDissection: EvaluationStep;
  meshPlacement: EvaluationStep;
  portClosure: EvaluationStep;
  skinClosure: EvaluationStep;
  caseDifficulty: number;
  additionalComments: string;
  transcription: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [surgery, setSurgery] = useState('');

  useEffect(() => {
    // Retrieve data from session storage on component mount
    const resultData = sessionStorage.getItem('analysisResult');
    const surgeryName = sessionStorage.getItem('selectedSurgery');

    if (resultData && surgeryName) {
      setEvaluation(JSON.parse(resultData));
      setSurgery(surgeryName);
    } else {
      // If no data is found, redirect back to the home page
      // This prevents users from accessing the page directly
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

  // Map keys to human-readable titles
  const sectionTitles: { [key in keyof Omit<EvaluationData, 'caseDifficulty' | 'additionalComments' | 'transcription'>]: string } = {
      portPlacement: 'Port Placement & Preperitoneal Space Creation',
      herniaDissection: 'Hernia Sac Reduction & Dissection',
      meshPlacement: 'Mesh Placement',
      portClosure: 'Port Closure',
      skinClosure: 'Skin Closure',
  };

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


        {/* Evaluation Details Sections */}
        <div className="space-y-6">
            {Object.keys(sectionTitles).map((key) => (
                <EvaluationSection 
                    key={key} 
                    title={sectionTitles[key as keyof typeof sectionTitles]} 
                    data={evaluation[key as keyof typeof sectionTitles]} 
                />
            ))}
        </div>

        {/* Case Difficulty and Additional Comments */}
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


        {/* Full Transcription */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b pb-2">Full Transcription</h2>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
            <p className="text-gray-600 whitespace-pre-wrap font-mono text-sm">{evaluation.transcription}</p>
          </div>
        </div>


        <button
          onClick={() => router.push('/')}
          className="mt-10 w-full bg-gray-600 text-white px-6 py-4 rounded-lg shadow-md
                     hover:bg-gray-700 transition-all duration-200 ease-in-out
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Evaluate Another Procedure
        </button>
      </div>
    </div>
  );
}

// Helper component to render each section of the evaluation, keeping the main component clean
const EvaluationSection = ({ title, data }: { title: string; data: EvaluationStep }) => (
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
