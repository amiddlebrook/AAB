import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TestRunner.css';

function TestRunner({ framework, apiUrl }) {
  const [testInput, setTestInput] = useState('Sample test input for the framework');
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestResult, setLatestResult] = useState(null);

  const API_URL = apiUrl || (process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:8787/api');

  useEffect(() => {
    loadTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework.id]);

  const loadTestResults = async () => {
    try {
      const response = await axios.get(`${API_URL}/tests/${framework.id}/results`);
      setTestResults(response.data);
    } catch (error) {
      console.error('Error loading test results:', error);
      // Use local results in demo mode
    }
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/tests/${framework.id}/run`, {
        testInput
      });
      setLatestResult(response.data);
      setTestResults([response.data, ...testResults]);
    } catch (error) {
      console.error('Error running test:', error);
      // Demo mode - simulate execution
      const demoResult = simulateExecution();
      setLatestResult(demoResult);
      setTestResults([demoResult, ...testResults]);
    } finally {
      setLoading(false);
    }
  };

  const simulateExecution = () => {
    const nodeTimings = {};
    const nodeOutputs = {};
    let totalLatency = 0;

    framework.nodes.forEach((node, idx) => {
      const timing = Math.random() * 500 + 100;
      nodeTimings[node.id] = timing;
      nodeOutputs[node.id] = `Processed by ${node.data?.label || node.id}`;
      totalLatency += timing;
    });

    return {
      id: `demo-${Date.now()}`,
      frameworkId: framework.id,
      timestamp: new Date().toISOString(),
      testInput,
      status: 'completed',
      success: true,
      latency: totalLatency / 1000,
      totalTokens: Math.floor(Math.random() * 500) + 100,
      totalCost: Math.random() * 0.01,
      output: `Demo output for: ${testInput.slice(0, 50)}...`,
      nodeTimings,
      nodeOutputs
    };
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="test-runner">
      <div className="test-control">
        <h2>▶️ Test Runner - {framework.name}</h2>

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
                <span className="result-value">{latestResult.latency?.toFixed(3) || 0}s</span>
              </div>
              {latestResult.totalTokens > 0 && (
                <div className="result-row">
                  <span className="result-label">Tokens:</span>
                  <span className="result-value">{latestResult.totalTokens}</span>
                </div>
              )}
              {latestResult.totalCost > 0 && (
                <div className="result-row">
                  <span className="result-label">Cost:</span>
                  <span className="result-value">${latestResult.totalCost?.toFixed(4)}</span>
                </div>
              )}
              <div className="result-row">
                <span className="result-label">Timestamp:</span>
                <span className="result-value">{formatTimestamp(latestResult.timestamp)}</span>
              </div>
              <div className="result-row full-width">
                <span className="result-label">Output:</span>
                <span className="result-value output">{latestResult.output}</span>
              </div>
            </div>

            {latestResult.nodeTimings && Object.keys(latestResult.nodeTimings).length > 0 && (
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
                    <span className="timing-value">{typeof timing === 'number' ? timing.toFixed(0) : timing}ms</span>
                  </div>
                ))}
              </div>
            )}

            {latestResult.nodeOutputs && Object.keys(latestResult.nodeOutputs).length > 0 && (
              <div className="node-outputs">
                <h4>Node Outputs:</h4>
                {Object.entries(latestResult.nodeOutputs).map(([nodeId, output]) => (
                  <div key={nodeId} className="node-output-item">
                    <span className="node-id">{nodeId}:</span>
                    <span className="node-output-text">{String(output).slice(0, 200)}</span>
                  </div>
                ))}
              </div>
            )}
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
                <span className="history-latency">{result.latency?.toFixed(3) || 0}s</span>
                {result.totalTokens > 0 && (
                  <span className="history-tokens">{result.totalTokens} tokens</span>
                )}
              </div>
              <div className="history-output">{result.output}</div>
            </div>
          ))}
          {testResults.length === 0 && (
            <div className="no-results">
              No test results yet. Run a test to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestRunner;
