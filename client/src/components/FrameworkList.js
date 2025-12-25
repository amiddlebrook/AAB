import React from 'react';
import './FrameworkList.css';

function FrameworkList({ frameworks, onSelect, onDelete }) {
  return (
    <div className="framework-list">
      <h2>Available Frameworks</h2>
      <div className="framework-grid">
        {frameworks.map(framework => (
          <div key={framework.id} className="framework-card">
            <div className="framework-header">
              <h3>{framework.name}</h3>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this framework?')) {
                    onDelete(framework.id);
                  }
                }}
              >
                🗑️
              </button>
            </div>
            <p className="framework-description">{framework.description}</p>
            <div className="framework-stats">
              <div className="stat">
                <span className="stat-label">Nodes:</span>
                <span className="stat-value">{framework.nodes.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Edges:</span>
                <span className="stat-value">{framework.edges.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Success Rate:</span>
                <span className="stat-value">{(framework.metrics.successRate * 100).toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg Latency:</span>
                <span className="stat-value">{framework.metrics.avgLatency.toFixed(2)}s</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Runs:</span>
                <span className="stat-value">{framework.metrics.totalRuns}</span>
              </div>
            </div>
            <button 
              className="select-btn"
              onClick={() => onSelect(framework)}
            >
              Open Editor
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FrameworkList;
