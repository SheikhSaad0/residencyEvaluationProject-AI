import React from 'react';

const surgeries = [
  'Laparoscopic Inguinal Hernia Repair',
  'Appendectomy',
  'Cholecystectomy',
  'Bowel Resection'
];

interface Props {
  selected: string;
  setSelected: (val: string) => void;
}

const SurgerySelector: React.FC<Props> = ({ selected, setSelected }) => {
  return (
    // Container padding already there, but let's ensure text color
    <div className="p-4 text-gray-800">
      <label htmlFor="surgery-select" className="block mb-3 text-lg font-medium text-gray-700">
        Select a Surgery
      </label>
      <select
        id="surgery-select" // Added ID for label association
        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700
                   py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500
                   shadow-sm cursor-pointer" // Added cursor-pointer
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">-- Choose a surgery --</option>
        {surgeries.map((surgery) => (
          <option key={surgery} value={surgery}>
            {surgery}
          </option>
        ))}
      </select>
      {/* Optional: Add a custom arrow for the select box (requires more CSS) */}
      {/* For a quick win, `appearance-none` removes the default browser arrow. */}
    </div>
  );
};

export default SurgerySelector;