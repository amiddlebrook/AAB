import React from 'react';
import './Dashboard.css';

function Dashboard({ frameworks }) {
  const totalRuns = frameworks.reduce((sum, f) => sum + f.metrics.totalRuns, 0);
  const avgSuccessRate = frameworks.length > 0
    ? frameworks.reduce((sum, f) => sum + f.metrics.successRate, 0) / frameworks.length
    : 0;
  const avgLatency = frameworks.length > 0
    ? frameworks.reduce((sum, f) => sum + f.metrics.avgLatency, 0) / frameworks.length
    : 0;

  const bestPerforming = frameworks.length > 0
    ? frameworks.reduce((best, current) =>
        current.metrics.successRate > best.metrics.successRate ? current : best
      )
    : null;

  const fastestFramework = frameworks.length > 0
    ? frameworks.reduce((fastest, current) =>
        current.metrics.avgLatency < fastest.metrics.avgLatency ? current : fastest
      )
    : null;

  return (
    <div className="dashboard">
      <h2>Dashboard Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Frameworks</div>
            <div className="stat-number">{frameworks.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-label">Total Test Runs</div>
            <div className="stat-number">{totalRuns}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Avg Success Rate</div>
            <div className="stat-number">{(avgSuccessRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">Avg Latency</div>
            <div className="stat-number">{avgLatency.toFixed(2)}s</div>
          </div>
        </div>
      </div>

      <div className="comparison-section">
        <h3>Framework Comparison</h3>
        <div className="comparison-chart">
          {frameworks.map((framework) => (
            <div key={framework.id} className="framework-bar">
              <div className="framework-name">{framework.name}</div>
              <div className="metric-bars">
                <div className="metric-bar-container">
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-bar">
                    <div
                      className="metric-fill success"
                      style={{ width: `${framework.metrics.successRate * 100}%` }}
                    />
                  </div>
                  <div className="metric-value">{(framework.metrics.successRate * 100).toFixed(1)}%</div>
                </div>
                <div className="metric-bar-container">
                  <div className="metric-label">Speed</div>
                  <div className="metric-bar">
                    <div
                      className="metric-fill speed"
                      style={{
                        width: `${Math.max(0, 100 - (framework.metrics.avgLatency / 5) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="metric-value">{framework.metrics.avgLatency.toFixed(2)}s</div>
                </div>
              </div>
              <div className="framework-runs">{framework.metrics.totalRuns} runs</div>
            </div>
          ))}
        </div>
      </div>

      <div className="highlights-section">
        {bestPerforming && (
          <div className="highlight-card success">
            <h4>🏆 Best Success Rate</h4>
            <div className="highlight-name">{bestPerforming.name}</div>
            <div className="highlight-value">{(bestPerforming.metrics.successRate * 100).toFixed(1)}%</div>
            <div className="highlight-detail">
              {bestPerforming.metrics.totalRuns} runs | {bestPerforming.metrics.avgLatency.toFixed(2)}s avg
            </div>
          </div>
        )}

        {fastestFramework && (
          <div className="highlight-card speed">
            <h4>⚡ Fastest Framework</h4>
            <div className="highlight-name">{fastestFramework.name}</div>
            <div className="highlight-value">{fastestFramework.metrics.avgLatency.toFixed(2)}s</div>
            <div className="highlight-detail">
              {fastestFramework.metrics.totalRuns} runs | {(fastestFramework.metrics.successRate * 100).toFixed(1)}% success
            </div>
          </div>
        )}
      </div>

      <div className="insights-section">
        <h3>💡 Insights</h3>
        <ul className="insights-list">
          <li>
            {frameworks.length === 0
              ? 'No frameworks yet. Create your first framework to get started!'
              : frameworks.length === 1
              ? 'Create more frameworks to compare different architectures.'
              : `You have ${frameworks.length} frameworks to compare and optimize.`}
          </li>
          {totalRuns > 0 && (
            <li>
              Total of {totalRuns} test runs executed across all frameworks.
            </li>
          )}
          {avgSuccessRate > 0.9 && (
            <li>
              Excellent overall performance! Average success rate is above 90%.
            </li>
          )}
          {avgSuccessRate < 0.7 && (
            <li>
              ⚠️ Some frameworks need optimization. Average success rate is below 70%.
            </li>
          )}
          {avgLatency > 3 && (
            <li>
              ⚠️ High latency detected. Consider optimizing slow frameworks.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
