import axios from 'axios';
import React, { useState, useCallback } from 'react';
import './ABTesting.css';

function ABTesting({ frameworks }) {
    const [frameworkA, setFrameworkA] = useState(null);
    const [frameworkB, setFrameworkB] = useState(null);
    const [testInput, setTestInput] = useState('Sample input for A/B comparison test');
    const [numRuns, setNumRuns] = useState(5);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [runHistory, setRunHistory] = useState([]);
    const [runError, setRunError] = useState('');

    // Execute both saved architectures against the same inputs on the actual Worker.
    const runABTest = useCallback(async () => {
        if (!frameworkA || !frameworkB) return;
        setIsRunning(true);
        setResults(null);
        setRunError('');
        const resultsA = [], resultsB = [];
        try {
            for (let i = 0; i < numRuns; i++) {
                const [a, b] = await Promise.all([
                    axios.post('/api/tests/' + frameworkA.id + '/run', { testInput }),
                    axios.post('/api/tests/' + frameworkB.id + '/run', { testInput })
                ]);
                for (const [response, bucket] of [[a, resultsA], [b, resultsB]]) {
                    const r = response.data;
                    bucket.push({ run: i + 1, latency: r.latency, success: r.success, tokens: r.totalTokens, cost: r.totalCost });
                }
            }
            const metricsA = calculateMetrics(resultsA), metricsB = calculateMetrics(resultsB);
            const testResult = {
                id: 'ab-' + Date.now(), timestamp: new Date().toISOString(), testInput, numRuns,
                frameworkA: { id: frameworkA.id, name: frameworkA.name, results: resultsA, metrics: metricsA },
                frameworkB: { id: frameworkB.id, name: frameworkB.name, results: resultsB, metrics: metricsB },
                winner: determineWinner(metricsA, metricsB)
            };
            setResults(testResult);
            setRunHistory(prev => [testResult, ...prev.slice(0, 9)]);
        } catch (error) {
            setRunError(error.response?.data?.error || error.message);
        } finally { setIsRunning(false); }
    }, [frameworkA, frameworkB, testInput, numRuns]);

    // Calculate metrics from results
    const calculateMetrics = (results) => {
        const totalLatency = results.reduce((sum, r) => sum + r.latency, 0);
        const successCount = results.filter(r => r.success).length;
        const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
        const totalCost = results.reduce((sum, r) => sum + parseFloat(r.cost), 0);

        return {
            avgLatency: totalLatency / results.length,
            successRate: successCount / results.length,
            totalTokens,
            totalCost,
            minLatency: Math.min(...results.map(r => r.latency)),
            maxLatency: Math.max(...results.map(r => r.latency)),
            p50Latency: calculatePercentile(results.map(r => r.latency), 50),
            p95Latency: calculatePercentile(results.map(r => r.latency), 95)
        };
    };

    // Calculate percentile
    const calculatePercentile = (values, percentile) => {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    };

    // Determine winner based on composite score
    const determineWinner = (metricsA, metricsB) => {
        // Score based on success rate (60%), latency (30%), cost (10%)
        const maxLatency = Math.max(metricsA.avgLatency, metricsB.avgLatency, 0.001);
        const scoreA = metricsA.successRate * 0.7 + (1 - metricsA.avgLatency / maxLatency) * 0.3;
        const scoreB = metricsB.successRate * 0.7 + (1 - metricsB.avgLatency / maxLatency) * 0.3;

        if (Math.abs(scoreA - scoreB) < 0.05) return 'tie';
        return scoreA > scoreB ? 'A' : 'B';
    };

    // Get comparison class
    const getComparisonClass = (valueA, valueB, lowerIsBetter = false) => {
        if (valueA === valueB) return 'equal';
        if (lowerIsBetter) {
            return valueA < valueB ? 'winner' : 'loser';
        }
        return valueA > valueB ? 'winner' : 'loser';
    };

    return (
        <div className="ab-testing">
            <div className="ab-header">
                <h2>⚖️ A/B Testing</h2>
                <p>Compare framework performance side-by-side</p>
            </div>

            {runError && <p role="alert" className="error-banner">{runError}</p>}

            <div className="ab-setup">
                <div className="framework-select">
                    <div className="select-group">
                        <label>Framework A</label>
                        <select
                            value={frameworkA?.id || ''}
                            onChange={(e) => setFrameworkA(frameworks.find(f => f.id === e.target.value) || null)}
                        >
                            <option value="">Select framework...</option>
                            {frameworks.map(f => (
                                <option key={f.id} value={f.id} disabled={f.id === frameworkB?.id}>
                                    {f.name} ({f.nodes?.length || 0} nodes)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="vs-divider">VS</div>

                    <div className="select-group">
                        <label>Framework B</label>
                        <select
                            value={frameworkB?.id || ''}
                            onChange={(e) => setFrameworkB(frameworks.find(f => f.id === e.target.value) || null)}
                        >
                            <option value="">Select framework...</option>
                            {frameworks.map(f => (
                                <option key={f.id} value={f.id} disabled={f.id === frameworkA?.id}>
                                    {f.name} ({f.nodes?.length || 0} nodes)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="test-params">
                    <div className="param-group">
                        <label>Test Input</label>
                        <textarea
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            placeholder="Enter test input for both frameworks..."
                            rows={2}
                        />
                    </div>

                    <div className="param-group small">
                        <label>Number of Runs</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={numRuns}
                            onChange={(e) => setNumRuns(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        />
                    </div>
                </div>

                <button
                    className={`run-button ${isRunning ? 'running' : ''}`}
                    onClick={runABTest}
                    disabled={!frameworkA || !frameworkB || isRunning}
                >
                    {isRunning ? '⏳ Running Tests...' : '🚀 Start A/B Test'}
                </button>
            </div>

            {results && (
                <div className="ab-results">
                    <div className="results-header">
                        <h3>📊 Results</h3>
                        {results.winner !== 'tie' && (
                            <span className="winner-badge">
                                🏆 Winner: Framework {results.winner}
                            </span>
                        )}
                        {results.winner === 'tie' && (
                            <span className="tie-badge">🤝 Too close to call!</span>
                        )}
                    </div>

                    <div className="comparison-grid">
                        <div className={`framework-result ${results.winner === 'A' ? 'winner' : ''}`}>
                            <div className="result-header">
                                <span className="label">A</span>
                                <h4>{results.frameworkA.name}</h4>
                            </div>
                            <div className="metrics-grid">
                                <div className="metric">
                                    <span className="metric-label">Success Rate</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkA.metrics.successRate, results.frameworkB.metrics.successRate)}`}>
                                        {(results.frameworkA.metrics.successRate * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Avg Latency</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkA.metrics.avgLatency, results.frameworkB.metrics.avgLatency, true)}`}>
                                        {results.frameworkA.metrics.avgLatency.toFixed(2)}s
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">P95 Latency</span>
                                    <span className="metric-value">
                                        {results.frameworkA.metrics.p95Latency.toFixed(2)}s
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Total Tokens</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkB.metrics.totalTokens, results.frameworkA.metrics.totalTokens)}`}>
                                        {results.frameworkA.metrics.totalTokens}
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Total Cost</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkB.metrics.totalCost, results.frameworkA.metrics.totalCost)}`}>
                                        ${results.frameworkA.metrics.totalCost.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`framework-result ${results.winner === 'B' ? 'winner' : ''}`}>
                            <div className="result-header">
                                <span className="label">B</span>
                                <h4>{results.frameworkB.name}</h4>
                            </div>
                            <div className="metrics-grid">
                                <div className="metric">
                                    <span className="metric-label">Success Rate</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkB.metrics.successRate, results.frameworkA.metrics.successRate)}`}>
                                        {(results.frameworkB.metrics.successRate * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Avg Latency</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkB.metrics.avgLatency, results.frameworkA.metrics.avgLatency, true)}`}>
                                        {results.frameworkB.metrics.avgLatency.toFixed(2)}s
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">P95 Latency</span>
                                    <span className="metric-value">
                                        {results.frameworkB.metrics.p95Latency.toFixed(2)}s
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Total Tokens</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkA.metrics.totalTokens, results.frameworkB.metrics.totalTokens)}`}>
                                        {results.frameworkB.metrics.totalTokens}
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Total Cost</span>
                                    <span className={`metric-value ${getComparisonClass(results.frameworkA.metrics.totalCost, results.frameworkB.metrics.totalCost)}`}>
                                        ${results.frameworkB.metrics.totalCost.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="run-details">
                        <h4>Run-by-Run Comparison</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Run</th>
                                    <th>A Latency</th>
                                    <th>A Status</th>
                                    <th>B Latency</th>
                                    <th>B Status</th>
                                    <th>Faster</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.frameworkA.results.map((runA, idx) => {
                                    const runB = results.frameworkB.results[idx];
                                    return (
                                        <tr key={idx}>
                                            <td>{runA.run}</td>
                                            <td className={runA.latency < runB.latency ? 'faster' : ''}>{runA.latency.toFixed(2)}s</td>
                                            <td>{runA.success ? '✅' : '❌'}</td>
                                            <td className={runB.latency < runA.latency ? 'faster' : ''}>{runB.latency.toFixed(2)}s</td>
                                            <td>{runB.success ? '✅' : '❌'}</td>
                                            <td>{runA.latency < runB.latency ? '🅰️' : runB.latency < runA.latency ? '🅱️' : '🤝'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {runHistory.length > 0 && !results && (
                <div className="test-history">
                    <h3>📜 Previous Tests</h3>
                    <div className="history-grid">
                        {runHistory.map(test => (
                            <div key={test.id} className="history-item" onClick={() => setResults(test)}>
                                <div className="history-frameworks">
                                    <span>{test.frameworkA.name}</span>
                                    <span className="vs">vs</span>
                                    <span>{test.frameworkB.name}</span>
                                </div>
                                <div className="history-meta">
                                    <span>{test.numRuns} runs</span>
                                    <span>•</span>
                                    <span>{new Date(test.timestamp).toLocaleString()}</span>
                                </div>
                                {test.winner !== 'tie' && (
                                    <span className="history-winner">Winner: {test.winner === 'A' ? test.frameworkA.name : test.frameworkB.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {frameworks.length < 2 && (
                <div className="empty-state">
                    <span>⚖️</span>
                    <h3>Need at least 2 frameworks</h3>
                    <p>Create more frameworks to enable A/B testing comparison.</p>
                </div>
            )}
        </div>
    );
}

export default ABTesting;
