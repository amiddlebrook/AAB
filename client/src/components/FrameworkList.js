import React, { useState } from 'react';
import './FrameworkList.css';

// Node type icons for visualization
const NODE_ICONS = {
  input: '📥',
  output: '📤',
  agent: '🤖',
  processor: '⚙️',
  rag: '📚',
  router: '🔀',
  tool: '🔧',
  memory: '🧠',
  parallel: '⚡',
  merge: '🔗',
  default: '⬡'
};

function FrameworkList({ frameworks, onSelect, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort frameworks
  const filteredFrameworks = frameworks
    .filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'nodes':
          return (b.nodes?.length || 0) - (a.nodes?.length || 0);
        case 'runs':
          return (b.metrics?.totalRuns || 0) - (a.metrics?.totalRuns || 0);
        case 'success':
          return (b.metrics?.successRate || 0) - (a.metrics?.successRate || 0);
        default:
          return 0;
      }
    });

  // Get unique node types for a framework
  const getNodeTypes = (framework) => {
    const types = {};
    framework.nodes?.forEach(node => {
      const type = node.type || 'default';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  };

  return (
    <div className="framework-list">
      <div className="list-header">
        <h2>📦 Frameworks</h2>
        <div className="list-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search frameworks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="nodes">Sort by Nodes</option>
            <option value="runs">Sort by Runs</option>
            <option value="success">Sort by Success Rate</option>
          </select>
        </div>
      </div>

      {filteredFrameworks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>{searchTerm ? 'No frameworks match your search' : 'No frameworks yet'}</h3>
          <p>
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first framework using the Chat Builder or Visual Editor'}
          </p>
        </div>
      ) : (
        <div className="framework-grid">
          {filteredFrameworks.map(framework => {
            const nodeTypes = getNodeTypes(framework);
            const successRate = (framework.metrics?.successRate || 0) * 100;

            return (
              <div
                key={framework.id}
                className="framework-card"
                onClick={() => onSelect(framework)}
              >
                <div className="card-header">
                  <h3>{framework.name}</h3>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this framework?')) {
                        onDelete(framework.id);
                      }
                    }}
                    title="Delete framework"
                  >
                    ×
                  </button>
                </div>

                <p className="card-description">
                  {framework.description || 'No description'}
                </p>

                <div className="node-types">
                  {Object.entries(nodeTypes).map(([type, count]) => (
                    <span key={type} className={`node-badge ${type}`} title={`${count} ${type} node(s)`}>
                      {NODE_ICONS[type] || '⬡'} {count}
                    </span>
                  ))}
                </div>

                <div className="card-metrics">
                  <div className="metric">
                    <span className="metric-value">{framework.nodes?.length || 0}</span>
                    <span className="metric-label">Nodes</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{framework.edges?.length || 0}</span>
                    <span className="metric-label">Edges</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{framework.metrics?.totalRuns || 0}</span>
                    <span className="metric-label">Runs</span>
                  </div>
                </div>

                <div className="success-bar">
                  <div className="success-bar-fill" style={{ width: `${successRate}%` }} />
                  <span className="success-label">
                    {successRate.toFixed(0)}% success
                  </span>
                </div>

                {framework.metrics?.avgLatency > 0 && (
                  <div className="latency-badge">
                    ⚡ {framework.metrics.avgLatency.toFixed(2)}s avg
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="list-footer">
        <span>{filteredFrameworks.length} of {frameworks.length} frameworks</span>
      </div>
    </div>
  );
}

export default FrameworkList;
