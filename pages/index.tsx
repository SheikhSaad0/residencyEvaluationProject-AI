import { useState } from 'react';
import { useRouter } from 'next/router';
import SurgerySelector from '../components/SurgerySelector'; // Make sure this path is correct!

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedSurgery || !file) {
      setError('Please select a surgery and upload an audio file.');
      return;
    }
    // Only accept mp3 files for now
    if (file.type !== 'audio/mpeg') {
      setError('Please upload an MP3 audio file.');
      return;
    }


    setError(null);
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('surgery', selectedSurgery);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const analysisResult = await response.json();

      // Store results in session storage to pass them to the results page
      // This is a simple way to pass data between pages without complex state management
      sessionStorage.setItem('analysisResult', JSON.stringify(analysisResult));
      sessionStorage.setItem('selectedSurgery', selectedSurgery);


      router.push('/results');
    } catch (error) {
      console.error('Error during analysis:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Surgical AI Evaluator
            </h1>
            <p className="text-md text-gray-500 mb-8">
              Upload an audio recording of a procedure for automated evaluation.
            </p>
        </div>


        {/* Surgery Selector Section */}
        <div className="mb-6">
          <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <label htmlFor="file-upload" className="block mb-3 text-lg font-medium text-gray-700">
            Upload Voice Recording (.mp3)
          </label>
          <input
            id="file-upload"
            type="file"
            accept="audio/mpeg" // Restrict to MP3 files
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100
                       border border-gray-300 rounded-lg shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent p-2 cursor-pointer"
          />
        </div>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleSubmit}
          disabled={isAnalyzing || !file || !selectedSurgery}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg shadow-md text-lg font-semibold
                     hover:bg-blue-700 transition-all duration-200 ease-in-out
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Recording'}
        </button>
      </div>
    </div>
  );
}
