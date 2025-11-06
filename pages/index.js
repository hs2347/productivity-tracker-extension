import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

  // --- New state for Blocker ---
  const [blockInput, setBlockInput] = useState('');
  const [blockedList, setBlockedList] = useState([]);
  const [isBlocking, setIsBlocking] = useState(false); // To prevent double-clicks

  useEffect(() => {
    // The 'chrome' object is only available in the extension environment.
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (items) => {
        // Separate time data from our block list
        const timeData = { ...items };
        const blockListData = items.sessionBlockedDomains || [];
        delete timeData.sessionBlockedDomains; // Remove our blocker list key

        // Sort time data
        const sortedData = Object.entries(timeData)
          .sort(([, a], [, b]) => b - a)
          .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        
        setData(sortedData);
        setBlockedList(blockListData);
        setIsLoading(false);
      });

      // Also listen for real-time changes
      const storageListener = (changes, namespace) => {
        if (namespace === 'local') {
          // Use the functional update form to get the previous state
          setData(prevData => {
            const updatedData = { ...prevData };
            for (let [key, { newValue }] of Object.entries(changes)) {
              if (key === 'sessionBlockedDomains') continue; // Ignore changes to block list here

              if (newValue === undefined) {
                delete updatedData[key];
              } else {
                updatedData[key] = newValue;
              }
            }
            // Re-sort the data with the new changes
            return Object.entries(updatedData)
              .sort(([, a], [, b]) => b - a)
              .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
          });

          // Handle block list changes separately
          if (changes.sessionBlockedDomains) {
             setBlockedList(changes.sessionBlockedDomains.newValue || []);
          }
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
      setBlockedList(['example.com', 'demo.com']);
      setIsLoading(false);
    }
  }, []); // Empty dependency array is correct here

  const handleReset = () => {
     if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
         
         
         //  Tell background script to clear blocking rules and its list
         chrome.runtime.sendMessage({ type: 'resetSession' }, (response) => {
            if (response.success) {
              setBlockedList([]); // Clear UI list
              console.log('Session blocking rules cleared.');
            }
         });
     } else {
         alert('This feature is only available within the Chrome extension.');
         setData({});
         setBlockedList([]);
     }
  };

  //  Handler for adding a blocked domain ---
  const handleAddBlock = () => {
    if (!blockInput || isBlocking) return;
    
    // Simple sanitization to get the core domain
    const domainToBlock = blockInput
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .trim();

    if (!domainToBlock) {
      setBlockInput('');
      return;
    }

    if (blockedList.includes(domainToBlock)) {
      setBlockInput(''); // Already blocked, just clear input
      return;
    }
      
    setIsBlocking(true);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'addBlock', domain: domainToBlock }, (response) => {
        if (response.success) {
          // Manually update UI for instant feedback
          setBlockedList(prev => [...prev, domainToBlock]);
          setBlockInput('');
        }
        setIsBlocking(false);
      });
    } else {
      // Mock behavior for development
      setBlockedList(prev => [...prev, domainToBlock]);
      setBlockInput('');
      setIsBlocking(false);
    }
  };

  return (
    <div className="w-80 bg-slate-900 text-white font-sans p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-cyan-400">Productivity Tracker</h1>
        <div className="flex space-x-2">
          <Link href="/analytics" legacyBehavior>
            <a className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-xs font-bold py-1 px-2 rounded-md transition-colors duration-200"
               title="Show Analytics"
            >
              Chart
            </a>
          </Link>
          <button 
            onClick={handleReset}
            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded-md transition-colors duration-200"
            title="Reset all data and blockers"
          >
            Reset
          </button>
        </div>      
      </div>

      {/* --- New Blocker UI --- */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-cyan-500 mb-2">Block Site for Session</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBlock()}
            placeholder="e.g., instagram.com"
            className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleAddBlock}
            disabled={isBlocking}
            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded-md transition-colors duration-200 disabled:opacity-50"
          >
            {isBlocking ? '...' : 'Block'}
          </button>
        </div>
        {blockedList.length > 0 && (
          <ul className="mt-2 text-xs text-slate-400">
            <span className="font-semibold">Blocked:</span>
            {blockedList.map(domain => (
              <li key={domain} className="inline ml-1.5">- {domain}</li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Existing Tracker List --- */}
      <div className="max-h-60 overflow-y-auto">
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