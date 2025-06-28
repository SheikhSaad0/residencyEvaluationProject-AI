import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SurgerySelector from '../components/SurgerySelector'; 

interface PastEvaluation {
  id: string;
  surgery: string;
  date: string;
  residentName?: string;
}

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([]);
  const [residentName, setResidentName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const router = useRouter();

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('evaluation-'));
    const evaluations = keys
      .map((key): PastEvaluation | null => {
        const id = key.replace('evaluation-', '');
        try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.surgery) {
                return {
                    id,
                    surgery: data.surgery,
                    residentName: data.residentName,
                    date: new Date(parseInt(id, 10)).toLocaleString()
                };
            }
            return null;
        } catch (e) {
            console.error("Failed to parse past evaluation from localStorage", e);
            return null;
        }
      })
      .filter((item): item is PastEvaluation => item !== null)
      .sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));

    setPastEvaluations(evaluations);
  }, []);

  const handleSubmit = async () => {
    if (!selectedSurgery || !file || !residentName) {
      setError("Please select a surgery, enter the resident's name, and upload an audio or video file.");
      return;
    }
    if (!['audio/mpeg', 'video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
      setError('Please upload an MP3, MP4, WebM, or Ogg file.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    setProgressStep('Uploading file...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('surgery', selectedSurgery);
    formData.append('residentName', residentName);
    formData.append('additionalContext', additionalContext);

    try {
      setProgress(25);
      setProgressStep('Transcribing audio...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      setProgress(75);
      setProgressStep('Evaluating transcript...');
      const analysisResult = await response.json();
      
      setProgress(100);
      setProgressStep('Analysis complete!');

      const id = Date.now().toString();
      localStorage.setItem(`evaluation-${id}`, JSON.stringify({
        ...analysisResult,
        surgery: selectedSurgery,
        residentName: residentName,
        additionalContext: additionalContext,
      }));

      router.push(`/results/${id}`);
    } catch (error) {
      console.error('Error during analysis:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-xl w-full mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Surgical AI Evaluator
            </h1>
            <p className="text-md text-gray-500 dark:text-gray-400">
              Upload an audio or video recording of a procedure for automated evaluation.
            </p>
        </div>

        <div className="space-y-6">
          <div>
            <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
          </div>

          <div>
            <label htmlFor="resident-name" className="block mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                Resident Name
            </label>
            <input
                id="resident-name"
                type="text"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 px-4 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-brand-green-500 shadow-sm"
                placeholder="e.g., Dr. Smith"
            />
          </div>

          <div>
            <label htmlFor="additional-context" className="block mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                Additional Context (Optional)
            </label>
            <textarea
                id="additional-context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 px-4 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-brand-green-500 shadow-sm"
                placeholder="e.g., This was a simulation, patient had significant adhesions, etc."
                rows={3}
            />
          </div>

          <div>
            <label htmlFor="file-upload" className="block mb-2 text-lg font-medium text-gray-700 dark:text-gray-200">
              Upload Voice Recording (.mp3, .mp4, etc.)
            </label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-gray-500/50 px-6 py-10">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12A2.25 2.25 0 0120.25 20.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                </svg>
                <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-brand-green focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-green focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-brand-green-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="audio/mpeg,video/mp4,video/webm,video/ogg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">{file ? file.name : "MP3, MP4, WebM, Ogg (up to 200MB)"}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-6 rounded-md" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || !file || !selectedSurgery || !residentName}
            className="w-full bg-brand-green text-white px-6 py-3 rounded-lg shadow-md text-lg font-semibold
                      hover:bg-brand-green-500 hover:scale-105 transform transition-all duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2
                      disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Recording'}
          </button>
        </div>

        {isAnalyzing && (
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-2">{progressStep}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-brand-green h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {pastEvaluations.length > 0 && (
          <div className="mt-10">
            <details>
              <summary className="text-lg font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Past Evaluations
              </summary>
              <ul className="mt-4 space-y-2">
                {pastEvaluations.map(evalItem => (
                  <li key={evalItem.id} className="p-2 border rounded-md dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700">
                    <a href={`/results/${evalItem.id}`} className="flex justify-between">
                      <span>{evalItem.surgery}{evalItem.residentName ? ` - ${evalItem.residentName}`: ''}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{evalItem.date}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}