import React, { useState, useMemo } from 'react';
import './Dashboard.css';

// Calculate cost estimates based on model pricing
const MODEL_PRICING = {
  'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015, name: 'Claude 3.5 Sonnet' },
  'openai/gpt-4o': { input: 0.005, output: 0.015, name: 'GPT-4o' },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006, name: 'GPT-4o Mini' },
  'google/gemini-pro-1.5': { input: 0.00125, output: 0.005, name: 'Gemini Pro 1.5' },
  'google/gemini-flash-1.5': { input: 0.000075, output: 0.0003, name: 'Gemini Flash 1.5' },
  'meta-llama/llama-3.1-70b': { input: 0.0009, output: 0.0009, name: 'Llama 3.1 70B' },
};

function Dashboard({ frameworks }) {
  const [timeRange, setTimeRange] = useState('all');

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const totalRuns = frameworks.reduce((sum, f) => sum + (f.metrics?.totalRuns || 0), 0);
    const avgSuccessRate = frameworks.length > 0
      ? frameworks.reduce((sum, f) => sum + (f.metrics?.successRate || 0), 0) / frameworks.length
      : 0;
    const avgLatency = frameworks.length > 0
      ? frameworks.reduce((sum, f) => sum + (f.metrics?.avgLatency || 0), 0) / frameworks.length
      : 0;

    // Aggregate model usage
    const modelUsage = {};
    frameworks.forEach(f => {
      f.nodes?.forEach(node => {
        if (node.data?.config?.model) {
          const model = node.data.config.model;
          modelUsage[model] = (modelUsage[model] || 0) + 1;
        }
      });
    });

    // Aggregate node types
    const nodeTypeCount = {};
    frameworks.forEach(f => {
      f.nodes?.forEach(node => {
        const type = node.type || 'default';
        nodeTypeCount[type] = (nodeTypeCount[type] || 0) + 1;
      });
    });

    // Estimate costs (simulated based on runs)
    const estimatedCost = totalRuns * 0.002; // ~$0.002 per run average
    const estimatedTokens = totalRuns * 500; // ~500 tokens per run average

    return {
      totalRuns,
      avgSuccessRate,
      avgLatency,
      modelUsage,
      nodeTypeCount,
      estimatedCost,
      estimatedTokens,
      totalNodes: frameworks.reduce((sum, f) => sum + (f.nodes?.length || 0), 0),
      totalEdges: frameworks.reduce((sum, f) => sum + (f.edges?.length || 0), 0),
    };
  }, [frameworks]);

  const bestPerforming = useMemo(() => {
    if (frameworks.length === 0) return null;
    return frameworks.reduce((best, current) =>
      (current.metrics?.successRate || 0) > (best.metrics?.successRate || 0) ? current : best
    );
  }, [frameworks]);

  const fastestFramework = useMemo(() => {
    if (frameworks.length === 0) return null;
    const validFrameworks = frameworks.filter(f => f.metrics?.avgLatency > 0);
    if (validFrameworks.length === 0) return null;
    return validFrameworks.reduce((fastest, current) =>
      current.metrics.avgLatency < fastest.metrics.avgLatency ? current : fastest
    );
  }, [frameworks]);

  const mostEfficientFramework = useMemo(() => {
    if (frameworks.length === 0) return null;
    return frameworks.reduce((best, current) => {
      const bestScore = (best.metrics?.successRate || 0) / (best.metrics?.avgLatency || 1);
      const currentScore = (current.metrics?.successRate || 0) / (current.metrics?.avgLatency || 1);
      return currentScore > bestScore ? current : best;
    });
  }, [frameworks]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Analytics Dashboard</h2>
        <div className="time-filter">
          <button
            className={timeRange === 'today' ? 'active' : ''}
            onClick={() => setTimeRange('today')}
          >Today</button>
          <button
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >7 Days</button>
          <button
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >30 Days</button>
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >All Time</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{frameworks.length}</div>
            <div className="stat-label">Frameworks</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-number">{metrics.totalRuns}</div>
            <div className="stat-label">Total Runs</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{(metrics.avgSuccessRate * 100).toFixed(1)}%</div>
            <div className="stat-label">Avg Success</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-number">{metrics.avgLatency.toFixed(2)}s</div>
            <div className="stat-label">Avg Latency</div>
          </div>
        </div>

        <div className="stat-card cost">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">${metrics.estimatedCost.toFixed(4)}</div>
            <div className="stat-label">Est. Cost</div>
          </div>
        </div>

        <div className="stat-card tokens">
          <div className="stat-icon">🔤</div>
          <div className="stat-content">
            <div className="stat-number">{metrics.estimatedTokens.toLocaleString()}</div>
            <div className="stat-label">Total Tokens</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-section">
          <h3>📈 Framework Performance</h3>
          <div className="performance-chart">
            {frameworks.map((framework) => (
              <div key={framework.id} className="framework-row">
                <div className="framework-info">
                  <span className="framework-name">{framework.name}</span>
                  <span className="framework-stats">
                    {framework.nodes?.length || 0} nodes | {framework.metrics?.totalRuns || 0} runs
                  </span>
                </div>
                <div className="metrics-visual">
                  <div className="metric-item">
                    <div className="metric-bar-wrapper">
                      <div
                        className="metric-bar-fill success"
                        style={{ width: `${(framework.metrics?.successRate || 0) * 100}%` }}
                      />
                    </div>
                    <span className="metric-value">{((framework.metrics?.successRate || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="metric-item">
                    <div className="metric-bar-wrapper latency">
                      <div
                        className="metric-bar-fill speed"
                        style={{ width: `${Math.min(100, Math.max(0, 100 - ((framework.metrics?.avgLatency || 0) / 5) * 100))}%` }}
                      />
                    </div>
                    <span className="metric-value">{(framework.metrics?.avgLatency || 0).toFixed(2)}s</span>
                  </div>
                </div>
              </div>
            ))}
            {frameworks.length === 0 && (
              <div className="empty-state">
                <span>📭</span>
                <p>No frameworks yet. Create one to see analytics!</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-section">
          <h3>🤖 Model Usage</h3>
          <div className="model-usage">
            {Object.entries(metrics.modelUsage).length > 0 ? (
              Object.entries(metrics.modelUsage).map(([model, count]) => (
                <div key={model} className="model-item">
                  <div className="model-info">
                    <span className="model-name">{MODEL_PRICING[model]?.name || model}</span>
                    <span className="model-count">{count} nodes</span>
                  </div>
                  <div className="model-bar">
                    <div
                      className="model-bar-fill"
                      style={{
                        width: `${(count / Math.max(...Object.values(metrics.modelUsage))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state small">
                <span>🤖</span>
                <p>Add agents to see model distribution</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-section">
          <h3>🧩 Node Types Distribution</h3>
          <div className="node-distribution">
            {Object.entries(metrics.nodeTypeCount).length > 0 ? (
              <div className="node-grid">
                {Object.entries(metrics.nodeTypeCount).map(([type, count]) => (
                  <div key={type} className={`node-type-card ${type}`}>
                    <span className="count">{count}</span>
                    <span className="type">{type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state small">
                <span>🧩</span>
                <p>Create frameworks to see node distribution</p>
              </div>
            )}
          </div>
        </div>

        <div className="highlights-section">
          <h3>🏆 Top Performers</h3>
          <div className="highlights-grid">
            {bestPerforming && (
              <div className="highlight-card success">
                <div className="highlight-icon">🎯</div>
                <div className="highlight-content">
                  <div className="highlight-title">Most Accurate</div>
                  <div className="highlight-name">{bestPerforming.name}</div>
                  <div className="highlight-value">
                    {((bestPerforming.metrics?.successRate || 0) * 100).toFixed(1)}% success
                  </div>
                </div>
              </div>
            )}

            {fastestFramework && (
              <div className="highlight-card speed">
                <div className="highlight-icon">⚡</div>
                <div className="highlight-content">
                  <div className="highlight-title">Fastest</div>
                  <div className="highlight-name">{fastestFramework.name}</div>
                  <div className="highlight-value">
                    {fastestFramework.metrics?.avgLatency.toFixed(2)}s avg
                  </div>
                </div>
              </div>
            )}

            {mostEfficientFramework && (
              <div className="highlight-card efficiency">
                <div className="highlight-icon">💎</div>
                <div className="highlight-content">
                  <div className="highlight-title">Most Efficient</div>
                  <div className="highlight-name">{mostEfficientFramework.name}</div>
                  <div className="highlight-value">
                    Best quality/speed ratio
                  </div>
                </div>
              </div>
            )}

            {frameworks.length === 0 && (
              <div className="empty-highlights">
                <p>Create and run frameworks to see top performers</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="insights-section">
        <h3>💡 Insights & Recommendations</h3>
        <div className="insights-grid">
          {frameworks.length === 0 ? (
            <div className="insight-card">
              <span className="insight-icon">🚀</span>
              <p>Get started by creating your first framework using the Chat Builder or Visual Editor!</p>
            </div>
          ) : (
            <>
              {metrics.avgSuccessRate > 0.9 && (
                <div className="insight-card success">
                  <span className="insight-icon">✨</span>
                  <p>Excellent work! Your frameworks have an average success rate above 90%.</p>
                </div>
              )}
              {metrics.avgSuccessRate < 0.7 && metrics.avgSuccessRate > 0 && (
                <div className="insight-card warning">
                  <span className="insight-icon">⚠️</span>
                  <p>Some frameworks need optimization. Consider adjusting prompts or model selection.</p>
                </div>
              )}
              {metrics.avgLatency > 3 && (
                <div className="insight-card warning">
                  <span className="insight-icon">🐢</span>
                  <p>High latency detected. Consider using faster models like Gemini Flash or GPT-4o Mini.</p>
                </div>
              )}
              {Object.keys(metrics.modelUsage).length <= 1 && frameworks.length > 1 && (
                <div className="insight-card info">
                  <span className="insight-icon">🔄</span>
                  <p>Try experimenting with different models to find the best fit for your use case.</p>
                </div>
              )}
              {metrics.totalNodes > 20 && (
                <div className="insight-card info">
                  <span className="insight-icon">📊</span>
                  <p>You have {metrics.totalNodes} nodes across your frameworks - great complexity!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
