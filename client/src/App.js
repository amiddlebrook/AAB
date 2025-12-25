import React, { useState, useEffect } from 'react';
import './App.css';
import FrameworkList from './components/FrameworkList';
import FrameworkEditor from './components/FrameworkEditor';
import TestRunner from './components/TestRunner';
import Dashboard from './components/Dashboard';
import ChatAgentBuilder from './components/ChatAgentBuilder';
import CustomCodeEditor from './components/CustomCodeEditor';
import axios from 'axios';

// Use Cloudflare Worker in production, localhost in development
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://aab-api.amiddlebrook.workers.dev/api'
  : 'http://localhost:8787/api';

function App() {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFrameworks();
  }, []);

  const loadFrameworks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/frameworks`);
      setFrameworks(response.data);
    } catch (err) {
      console.error('Error loading frameworks:', err);
      setError('Failed to load frameworks. Using demo mode.');
      // Provide demo data when API is unavailable
      setFrameworks([
        {
          id: 'demo-1',
          name: 'Sequential Agent Chain',
          description: 'A simple sequential chain of agents processing data in order',
          nodes: [
            { id: 'input', type: 'input', position: { x: 100, y: 100 }, data: { label: 'Input' } },
            { id: 'agent1', type: 'agent', position: { x: 300, y: 100 }, data: { label: 'Agent 1', config: { model: 'anthropic/claude-3.5-sonnet', temperature: 0.7 } } },
            { id: 'output', type: 'output', position: { x: 500, y: 100 }, data: { label: 'Output' } }
          ],
          edges: [
            { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
            { id: 'e2', source: 'agent1', target: 'output', type: 'smoothstep' }
          ],
          metrics: { avgLatency: 1.5, successRate: 0.95, totalRuns: 10 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createFramework = async () => {
    try {
      const newFramework = {
        name: 'New Framework',
        description: 'A new agentic framework',
        nodes: [
          { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
          { id: 'output', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
        ],
        edges: []
      };

      const response = await axios.post(`${API_URL}/frameworks`, newFramework);
      const created = { ...newFramework, ...response.data, metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 } };
      setFrameworks([...frameworks, created]);
      setSelectedFramework(created);
      setActiveTab('editor');
    } catch (err) {
      console.error('Error creating framework:', err);
      // Demo mode fallback
      const demoFramework = {
        id: `demo-${Date.now()}`,
        name: 'New Framework',
        description: 'A new agentic framework',
        nodes: [
          { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
          { id: 'output', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [],
        metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 }
      };
      setFrameworks([...frameworks, demoFramework]);
      setSelectedFramework(demoFramework);
      setActiveTab('editor');
    }
  };

  const deleteFramework = async (id) => {
    try {
      await axios.delete(`${API_URL}/frameworks/${id}`);
      setFrameworks(frameworks.filter(f => f.id !== id));
      if (selectedFramework?.id === id) {
        setSelectedFramework(null);
      }
    } catch (err) {
      console.error('Error deleting framework:', err);
      // Demo mode fallback
      setFrameworks(frameworks.filter(f => f.id !== id));
      if (selectedFramework?.id === id) {
        setSelectedFramework(null);
      }
    }
  };

  const updateFramework = async (id, updates) => {
    try {
      const response = await axios.put(`${API_URL}/frameworks/${id}`, updates);
      setFrameworks(frameworks.map(f => f.id === id ? { ...f, ...response.data } : f));
      setSelectedFramework({ ...selectedFramework, ...response.data });
    } catch (err) {
      console.error('Error updating framework:', err);
      // Demo mode fallback
      setFrameworks(frameworks.map(f => f.id === id ? { ...f, ...updates } : f));
      setSelectedFramework({ ...selectedFramework, ...updates });
    }
  };

  const selectFramework = (framework) => {
    setSelectedFramework(framework);
    setActiveTab('editor');
  };

  const handleFrameworkGenerated = (framework) => {
    const newFramework = {
      ...framework,
      id: framework.id || `gen-${Date.now()}`,
      metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 }
    };
    setFrameworks([...frameworks, newFramework]);
    setSelectedFramework(newFramework);
    setActiveTab('editor');
  };

  if (loading) {
    return (
      <div className="App loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading AAB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 AAB - Agentic Architecture Platform</h1>
        <p>Build, Test, and Optimize Novel Agent Architectures</p>
        {error && <div className="error-banner">{error}</div>}
      </header>

      <nav className="App-nav">
        <button
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          📦 Frameworks
        </button>
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat Builder
        </button>
        <button
          className={activeTab === 'code' ? 'active' : ''}
          onClick={() => setActiveTab('code')}
        >
          💻 Code Editor
        </button>
        <button
          className={activeTab === 'editor' ? 'active' : ''}
          onClick={() => setActiveTab('editor')}
          disabled={!selectedFramework}
        >
          🔧 Visual Editor
        </button>
        <button
          className={activeTab === 'test' ? 'active' : ''}
          onClick={() => setActiveTab('test')}
          disabled={!selectedFramework}
        >
          ▶️ Test Runner
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button className="create-btn" onClick={createFramework}>
          + New Framework
        </button>
      </nav>

      <main className="App-main">
        {activeTab === 'list' && (
          <FrameworkList
            frameworks={frameworks}
            onSelect={selectFramework}
            onDelete={deleteFramework}
          />
        )}
        {activeTab === 'chat' && (
          <ChatAgentBuilder
            onFrameworkGenerated={handleFrameworkGenerated}
            apiUrl={API_URL}
          />
        )}
        {activeTab === 'code' && (
          <CustomCodeEditor
            framework={selectedFramework}
            onUpdate={updateFramework}
          />
        )}
        {activeTab === 'editor' && selectedFramework && (
          <FrameworkEditor
            framework={selectedFramework}
            onUpdate={updateFramework}
          />
        )}
        {activeTab === 'test' && selectedFramework && (
          <TestRunner
            framework={selectedFramework}
            apiUrl={API_URL}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard
            frameworks={frameworks}
          />
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by Cloudflare Workers • OpenRouter LLMs • ReactFlow</p>
      </footer>
    </div>
  );
}

export default App;
