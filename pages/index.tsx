import { useState } from 'react';
import { useRouter } from 'next/router';
import SurgerySelector from '../components/SurgerySelector'; // Make sure this path is correct!

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleSubmit = () => {
    if (selectedSurgery && file) {
      router.push({ pathname: '/results', query: { surgery: selectedSurgery } });
    } else {
      // --- IMPORTANT: Replace alert() with a proper UI notification ---
      // For now, let's keep it simple for testing, but ideally use a modal or toast.
      alert('Please select a surgery and upload a file.');
    }
  };

  return (
    // Updated container: max-width, auto-margins for centering, padding, background
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl"> {/* Added shadow and rounded corners */}
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
          Surgical Evaluation Dashboard
        </h1>

        {/* Surgery Selector Section */}
        <div className="mb-6"> {/* Added margin-bottom */}
          <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
        </div>

        {/* File Upload Section */}
        <div className="mb-8"> {/* Increased margin-bottom */}
          <label htmlFor="file-upload" className="block mb-3 text-lg font-medium text-gray-700">
            Upload Voice Recording
          </label>
          <input
            id="file-upload" // Added ID for label association
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            // Enhanced file input styling
            className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100
                       border border-gray-300 rounded-lg shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent p-2"
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md
                     hover:bg-blue-700 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Analyze Recording
        </button>
      </div>
    </div>
  );
}