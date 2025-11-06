import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

// Colors for the pie chart, matching your theme
const COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#334155', '#475569'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = payload[0].percent; 
    // --- END FIX ---

    return (
      <div className="bg-slate-800 text-white p-2 rounded border border-slate-700 shadow-lg">
        <p className="font-bold">{data.name}</p>
        <p>{`Time: ${formatTime(data.value)}`}</p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (items) => {
        // Process data for recharts: [{ name: 'domain', value: timeInSeconds }, ...]
        const processedData = Object.entries(items)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value); // Sort descending
        
        setData(processedData);
        setIsLoading(false);
      });
    } else {
      // Mock data for development
      console.log("Not in extension environment. Using mock data.");
      setData([
        { name: 'github.com', value: 3665 },
        { name: 'stackoverflow.com', value: 1250 },
        { name: 'developer.chrome.com', value: 850 },
        { name: 'other-site.com', value: 400 },
      ]);
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="w-80 bg-slate-900 text-white font-sans p-4" style={{ minHeight: '400px' }}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-cyan-400">Analytics</h1>
        <Link href="/" legacyBehavior>
          <a className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-xs font-bold py-1 px-2 rounded-md transition-colors duration-200">
            Back
          </a>
        </Link>
      </div>

      <div className="h-80 w-full">
        {isLoading ? (
          <p className="text-slate-400">Loading chart...</p>
        ) : data.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No data to display.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                labelLine={false}
               
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                layout="vertical" 
                align="center" 
                verticalAlign="bottom" 
                wrapperStyle={{ fontSize: "12px", color: "#cbd5e1" }}
                payload={data.slice(0, 5).map((entry, index) => ({ // Show top 5 in legend
                    value: entry.name,
                    type: "square",
                    color: COLORS[index % COLORS.length]
                }))}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}