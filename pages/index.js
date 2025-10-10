import React, { useState, useEffect } from 'react';

// A simple utility to format seconds into a readable string
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s]
    .map((v) => (v < 10 ? '0' + v : v))
    .filter((v, i) => v !== '00' || i > 0)
    .join(':') || '0s';
};

export default function Home() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // The 'chrome' object is only available in the extension environment.
    // We check for its existence to avoid errors during development.
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (items) => {
        // Sort items by time spent, descending
        const sortedData = Object.entries(items)
          .sort(([, a], [, b]) => b - a)
          .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        
        setData(sortedData);
        setIsLoading(false);
      });

      // Also listen for real-time changes
      const storageListener = (changes, namespace) => {
        if (namespace === 'local') {
          let updatedData = { ...data };
          for (let [key, { newValue }] of Object.entries(changes)) {
            updatedData[key] = newValue;
          }
           const sortedData = Object.entries(updatedData)
            .sort(([, a], [, b]) => b - a)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
          setData(sortedData);
        }
      };

      chrome.storage.onChanged.addListener(storageListener);

      // Cleanup listener on component unmount
      return () => {
        chrome.storage.onChanged.removeListener(storageListener);
      };

    } else {
      // We are not in the extension environment, provide mock data for development
      console.log("Not in extension environment. Using mock data.");
      setData({
        'github.com': 3665,
        'stackoverflow.com': 1250,
        'developer.chrome.com': 850,
      });
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleReset = () => {
     if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
         chrome.storage.local.clear(() => {
             setData({});
             console.log('All tracking data cleared.');
         });
     } else {
         alert('This feature is only available within the Chrome extension.');
     }
  };

  return (
    <div className="w-80 bg-slate-900 text-white font-sans p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-cyan-400">Productivity Tracker</h1>
        <button 
          onClick={handleReset}
          className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded-md transition-colors duration-200"
          title="Reset all data"
        >
          Reset
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <p className="text-slate-400">Loading data...</p>
        ) : Object.keys(data).length === 0 ? (
          <p className="text-slate-400 text-center py-4">No websites tracked yet. Start browsing!</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(data).map(([domain, time]) => (
              <li key={domain} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg shadow">
                <span className="text-sm font-medium text-slate-300 truncate w-4/6" title={domain}>{domain}</span>
                <span className="text-sm font-semibold bg-cyan-500 text-slate-900 px-2 py-1 rounded-md">{formatTime(time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}