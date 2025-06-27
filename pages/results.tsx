import { useRouter } from 'next/router';
import React from 'react'; // React import is good practice for JSX files

export default function ResultsPage() {
  const router = useRouter();
  const { surgery } = router.query;

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
          Evaluation Results
        </h1>

        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded">
          <p className="font-semibold text-lg">Selected Surgery:</p>
          <p className="text-2xl font-bold">{surgery || 'N/A'}</p> {/* Handle case where surgery might be undefined */}
        </div>

        <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">AI Analysis Summary</h2>
          {/* Placeholder until you connect APIs */}
          <p className="text-gray-700 leading-relaxed">
            This is where a detailed summary of the AI analysis will be displayed.
            It could include key metrics, identified patterns, and overall conclusions
            related to the {surgery ? `"${surgery}"` : 'selected surgery'} recording.
            Expect to see data visualizations, confidence scores, and recommendations here.
          </p>
          {/* Add more placeholder content to fill it out */}
          <ul className="list-disc list-inside text-gray-600 mt-4">
            <li>Identified keywords and phrases.</li>
            <li>Emotion and tone analysis.</li>
            <li>Speech clarity and pace assessment.</li>
            <li>Comparison to optimal surgical dialogue.</li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-8 bg-gray-600 text-white px-6 py-3 rounded-lg shadow-md
                     hover:bg-gray-700 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Go Back to Dashboard
        </button>
      </div>
    </div>
  );
}