import React from 'react';

// A list of surgeries that the user can select from.
// This could be fetched from a database in a real application.
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
    <div>
      <label htmlFor="surgery-select" className="block mb-3 text-lg font-medium text-gray-700">
        Select a Surgery
      </label>
      <select
        id="surgery-select"
        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700
                   py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500
                   shadow-sm cursor-pointer"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">-- Choose a procedure --</option>
        {surgeries.map((surgery) => (
          <option key={surgery} value={surgery}>
            {surgery}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SurgerySelector;
