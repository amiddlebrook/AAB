import React, { useState, useEffect } from 'react';
import './App.css';
import FrameworkList from './components/FrameworkList';
import FrameworkEditor from './components/FrameworkEditor';
import TestRunner from './components/TestRunner';
import Dashboard from './components/Dashboard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function App() {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFrameworks();
  }, []);

  const loadFrameworks = async () => {
    try {
      const response = await axios.get(`${API_URL}/frameworks`);
      setFrameworks(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading frameworks:', error);
      setLoading(false);
    }
  };

  const createFramework = async () => {
    try {
      const response = await axios.post(`${API_URL}/frameworks`, {
        name: 'New Framework',
        description: 'A new agentic framework',
        nodes: [
          { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
          { id: 'output', type: 'output', position: { x: 500, y: 200 }, data: { label: 'Output' } }
        ],
        edges: []
      });
      setFrameworks([...frameworks, response.data]);
      setSelectedFramework(response.data);
      setActiveTab('editor');
    } catch (error) {
      console.error('Error creating framework:', error);
    }
  };

  const deleteFramework = async (id) => {
    try {
      await axios.delete(`${API_URL}/frameworks/${id}`);
      setFrameworks(frameworks.filter(f => f.id !== id));
      if (selectedFramework?.id === id) {
        setSelectedFramework(null);
      }
    } catch (error) {
      console.error('Error deleting framework:', error);
    }
  };

  const updateFramework = async (id, updates) => {
    try {
      const response = await axios.put(`${API_URL}/frameworks/${id}`, updates);
      setFrameworks(frameworks.map(f => f.id === id ? response.data : f));
      setSelectedFramework(response.data);
    } catch (error) {
      console.error('Error updating framework:', error);
    }
  };

  const selectFramework = (framework) => {
    setSelectedFramework(framework);
    setActiveTab('editor');
  };

  if (loading) {
    return <div className="App loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 Agentic Architecture Benchmarks</h1>
        <p>Test, Visualize, and Optimize Agentic Frameworks</p>
      </header>

      <nav className="App-nav">
        <button 
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          Frameworks
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
          Test Runner
        </button>
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
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
        {activeTab === 'editor' && selectedFramework && (
          <FrameworkEditor 
            framework={selectedFramework}
            onUpdate={updateFramework}
          />
        )}
        {activeTab === 'test' && selectedFramework && (
          <TestRunner 
            framework={selectedFramework}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard 
            frameworks={frameworks}
          />
        )}
      </main>
    </div>
  );
}

export default App;
