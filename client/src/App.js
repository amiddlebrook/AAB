import React, { useState, useEffect } from 'react';
import './App.css';
import FrameworkList from './components/FrameworkList';
import FrameworkEditor from './components/FrameworkEditor';
import TestRunner from './components/TestRunner';
import Dashboard from './components/Dashboard';
import ChatAgentBuilder from './components/ChatAgentBuilder';
import CustomCodeEditor from './components/CustomCodeEditor';
import ImportExport from './components/ImportExport';
import ABTesting from './components/ABTesting';
import axios from 'axios';

// Use Cloudflare Worker in production, localhost in development
const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
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
      // Auto-select first framework
      if (response.data.length > 0) {
        setSelectedFramework(response.data[0]);
      }
    } catch (err) {
      console.error('Error loading frameworks:', err);
      setError('Failed to load frameworks. Using demo mode.');
      // Provide rich demo data when API is unavailable
      setFrameworks([
        {
          id: 'demo-1',
          name: 'Sequential Agent Chain',
          description: 'A simple sequential chain of agents processing data in order',
          nodes: [
            { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'agent1', type: 'agent', position: { x: 300, y: 200 }, data: { label: 'Analyzer', config: { model: 'meta-llama/llama-3.3-70b-instruct:free', temperature: 0.7 } } },
            { id: 'output', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
          ],
          edges: [
            { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
            { id: 'e2', source: 'agent1', target: 'output', type: 'smoothstep' }
          ],
          metrics: { avgLatency: 1.5, successRate: 0.95, totalRuns: 25 }
        },
        {
          id: 'demo-2',
          name: 'RAG Pipeline',
          description: 'Retrieval-augmented generation with vector search for context-aware responses',
          nodes: [
            { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Query' } },
            { id: 'rag', type: 'rag', position: { x: 280, y: 200 }, data: { label: 'Vector Search', config: { topK: 3 } } },
            { id: 'agent', type: 'agent', position: { x: 460, y: 200 }, data: { label: 'Generator', config: { model: 'openai/gpt-4o', temperature: 0.5 } } },
            { id: 'output', type: 'output', position: { x: 640, y: 200 }, data: { label: 'Response' } }
          ],
          edges: [
            { id: 'e1', source: 'input', target: 'rag', type: 'smoothstep' },
            { id: 'e2', source: 'rag', target: 'agent', type: 'smoothstep' },
            { id: 'e3', source: 'agent', target: 'output', type: 'smoothstep' }
          ],
          metrics: { avgLatency: 2.1, successRate: 0.92, totalRuns: 18 }
        },
        {
          id: 'demo-3',
          name: 'Model Racing',
          description: 'Parallel execution across multiple LLMs with result merging',
          nodes: [
            { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
            { id: 'parallel', type: 'parallel', position: { x: 250, y: 200 }, data: { label: 'Split' } },
            { id: 'claude', type: 'agent', position: { x: 400, y: 100 }, data: { label: 'Claude', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'gpt', type: 'agent', position: { x: 400, y: 200 }, data: { label: 'GPT-4o', config: { model: 'openai/gpt-4o' } } },
            { id: 'gemini', type: 'agent', position: { x: 400, y: 300 }, data: { label: 'Gemini', config: { model: 'google/gemini-flash-1.5' } } },
            { id: 'merge', type: 'merge', position: { x: 550, y: 200 }, data: { label: 'Best Result' } },
            { id: 'output', type: 'output', position: { x: 700, y: 200 }, data: { label: 'Output' } }
          ],
          edges: [
            { id: 'e1', source: 'input', target: 'parallel' },
            { id: 'e2', source: 'parallel', target: 'claude' },
            { id: 'e3', source: 'parallel', target: 'gpt' },
            { id: 'e4', source: 'parallel', target: 'gemini' },
            { id: 'e5', source: 'claude', target: 'merge' },
            { id: 'e6', source: 'gpt', target: 'merge' },
            { id: 'e7', source: 'gemini', target: 'merge' },
            { id: 'e8', source: 'merge', target: 'output' }
          ],
          metrics: { avgLatency: 1.8, successRate: 0.98, totalRuns: 42 }
        },
        {
          id: 'demo-4',
          name: 'Tool-Augmented Agent',
          description: 'Agent with web search and calculator tool access',
          nodes: [
            { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Query' } },
            { id: 'planner', type: 'agent', position: { x: 280, y: 200 }, data: { label: 'Planner', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'search', type: 'tool', position: { x: 460, y: 120 }, data: { label: 'Web Search', config: { endpoint: 'search' } } },
            { id: 'calc', type: 'tool', position: { x: 460, y: 280 }, data: { label: 'Calculator', config: { endpoint: 'calc' } } },
            { id: 'synth', type: 'agent', position: { x: 640, y: 200 }, data: { label: 'Synthesizer', config: { model: 'anthropic/claude-3.5-sonnet' } } },
            { id: 'output', type: 'output', position: { x: 820, y: 200 }, data: { label: 'Answer' } }
          ],
          edges: [
            { id: 'e1', source: 'input', target: 'planner' },
            { id: 'e2', source: 'planner', target: 'search' },
            { id: 'e3', source: 'planner', target: 'calc' },
            { id: 'e4', source: 'search', target: 'synth' },
            { id: 'e5', source: 'calc', target: 'synth' },
            { id: 'e6', source: 'synth', target: 'output' }
          ],
          metrics: { avgLatency: 3.2, successRate: 0.88, totalRuns: 15 }
        }
      ]);
      // Auto-select first demo framework
      setSelectedFramework({
        id: 'demo-1',
        name: 'Sequential Agent Chain',
        description: 'A simple sequential chain of agents processing data in order',
        nodes: [
          { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
          { id: 'agent1', type: 'agent', position: { x: 300, y: 200 }, data: { label: 'Analyzer', config: { model: 'meta-llama/llama-3.3-70b-instruct:free', temperature: 0.7 } } },
          { id: 'output', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
        ],
        edges: [
          { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
          { id: 'e2', source: 'agent1', target: 'output', type: 'smoothstep' }
        ],
        metrics: { avgLatency: 1.5, successRate: 0.95, totalRuns: 25 }
      });
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

  const handleImportFramework = (framework) => {
    const newFramework = {
      ...framework,
      id: framework.id || `import-${Date.now()}`,
      metrics: framework.metrics || { avgLatency: 0, successRate: 0, totalRuns: 0 }
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
        <h1>AAB</h1>
        <span className="header-divider">|</span>
        <span className="header-subtitle">Agentic Architecture Platform</span>
        {error && <div className="error-banner">{error}</div>}
      </header>

      <nav className="App-nav">
        <button
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          Frameworks
        </button>
        <button
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Builder
        </button>
        <button
          className={activeTab === 'code' ? 'active' : ''}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
        <button
          className={activeTab === 'editor' ? 'active' : ''}
          onClick={() => setActiveTab('editor')}
          disabled={!selectedFramework}
        >
          Editor
        </button>
        <button
          className={activeTab === 'test' ? 'active' : ''}
          onClick={() => setActiveTab('test')}
          disabled={!selectedFramework}
        >
          Test
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Analytics
        </button>
        <button
          className={activeTab === 'abtest' ? 'active' : ''}
          onClick={() => setActiveTab('abtest')}
        >
          Compare
        </button>
        <button
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
        <button className="create-btn" onClick={createFramework}>
          + New
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
            onUpdate={updateFramework}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard
            frameworks={frameworks}
          />
        )}
        {activeTab === 'abtest' && (
          <ABTesting
            frameworks={frameworks}
          />
        )}
        {activeTab === 'import' && (
          <ImportExport
            frameworks={frameworks}
            onImport={handleImportFramework}
            onExport={() => { }}
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
