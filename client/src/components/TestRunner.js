import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TestRunner.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function TestRunner({ framework }) {
  const [testInput, setTestInput] = useState('Sample test input for the framework');
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    loadTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework.id]);

  const loadTestResults = async () => {
    try {
      const response = await axios.get(`${API_URL}/frameworks/${framework.id}/results`);
      setTestResults(response.data);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/frameworks/${framework.id}/test`, {
        testInput
      });
      setLatestResult(response.data);
      setTestResults([response.data, ...testResults]);
      setLoading(false);
    } catch (error) {
      console.error('Error running test:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="test-runner">
      <div className="test-control">
        <h2>Test Runner - {framework.name}</h2>
        
        <div className="test-input-section">
          <label>Test Input:</label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter test input..."
            rows={4}
          />
          <button 
            className="run-test-btn"
            onClick={runTest}
            disabled={loading}
          >
            {loading ? '⏳ Running...' : '▶️ Run Test'}
          </button>
        </div>

        {latestResult && (
          <div className={`latest-result ${latestResult.success ? 'success' : 'failure'}`}>
            <h3>Latest Test Result</h3>
            <div className="result-details">
              <div className="result-row">
                <span className="result-label">Status:</span>
                <span className={`result-value ${latestResult.success ? 'success' : 'failure'}`}>
                  {latestResult.success ? '✅ Success' : '❌ Failed'}
                </span>
              </div>
              <div className="result-row">
                <span className="result-label">Latency:</span>
                <span className="result-value">{latestResult.latency.toFixed(3)}s</span>
              </div>
              <div className="result-row">
                <span className="result-label">Timestamp:</span>
                <span className="result-value">{formatTimestamp(latestResult.timestamp)}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Output:</span>
                <span className="result-value">{latestResult.output}</span>
              </div>
            </div>

            <div className="node-timings">
              <h4>Node Execution Timings:</h4>
              {Object.entries(latestResult.nodeTimings).map(([nodeId, timing]) => (
                <div key={nodeId} className="timing-bar">
                  <span className="timing-label">{nodeId}</span>
                  <div className="timing-progress">
                    <div 
                      className="timing-fill"
                      style={{ 
                        width: `${(timing / Math.max(...Object.values(latestResult.nodeTimings))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="timing-value">{timing.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="test-history">
        <h3>Test History ({testResults.length} runs)</h3>
        <div className="history-list">
          {testResults.map((result) => (
            <div key={result.id} className={`history-item ${result.success ? 'success' : 'failure'}`}>
              <div className="history-header">
                <span className={`status-badge ${result.success ? 'success' : 'failure'}`}>
                  {result.success ? '✅' : '❌'}
                </span>
                <span className="history-time">{formatTimestamp(result.timestamp)}</span>
                <span className="history-latency">{result.latency.toFixed(3)}s</span>
              </div>
              <div className="history-output">{result.output}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TestRunner;
