import React, { useState, useEffect } from 'react';
import './App.css';
import FrameworkList from './components/FrameworkList';
import FrameworkEditor from './components/FrameworkEditor';
import TestRunner from './components/TestRunner';
import Dashboard from './components/Dashboard';
import ChatAgentBuilder from './components/ChatAgentBuilder';
import ImportExport from './components/ImportExport';
import ABTesting from './components/ABTesting';
import axios from 'axios';

// Use Cloudflare Worker in production, localhost in development
const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8787/api';
const initialToken = sessionStorage.getItem('aab_owner_token') || '';
if (initialToken) axios.defaults.headers.common.Authorization = 'Bearer ' + initialToken;

function App() {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerToken, setOwnerToken] = useState(initialToken);
  const [tokenInput, setTokenInput] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);

  const unlock = (event) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    sessionStorage.setItem('aab_owner_token', token);
    axios.defaults.headers.common.Authorization = 'Bearer ' + token;
    setOwnerToken(token);
    setNeedsAuth(false);
    setTokenInput('');
    loadFrameworks();
  };
  const lock = () => {
    sessionStorage.removeItem('aab_owner_token');
    delete axios.defaults.headers.common.Authorization;
    setOwnerToken('');
    setFrameworks([]);
    setSelectedFramework(null);
    setNeedsAuth(true);
    setError('Enter your owner token to access AAB.');
  };

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
      setNeedsAuth(err.response?.status === 401 || err.response?.status === 503);
      setFrameworks([]);
      setSelectedFramework(null);
      setError(err.response?.data?.error || 'Could not connect to the Cloudflare API. Check deployment and D1 initialization.');
    } finally {
      setLoading(false);
    }
  };

  const createFramework = async () => {
    try {
      const base = {
        name: 'New Framework', description: 'Build and benchmark an agent pipeline',
        nodes: [
          { id: 'input', type: 'input', position: { x: 120, y: 180 }, data: { label: 'Input' } },
          { id: 'agent', type: 'agent', position: { x: 350, y: 180 }, data: { label: 'Agent', config: { systemPrompt: 'Be concise and accurate.' } } },
          { id: 'output', type: 'output', position: { x: 580, y: 180 }, data: { label: 'Output' } }
        ], edges: [
          { id: 'e1', source: 'input', target: 'agent' }, { id: 'e2', source: 'agent', target: 'output' }
        ]
      };
      const response = await axios.post(API_URL + '/frameworks', base);
      const created = { ...base, ...response.data, metrics: { avgLatency: 0, successRate: 0, totalRuns: 0 } };
      setFrameworks(prev => [created, ...prev]);
      setSelectedFramework(created);
      setActiveTab('editor');
      setError(null);
    } catch (err) { setError(err.response?.data?.error || 'Unable to create framework.'); }
  };

  const deleteFramework = async (id) => {
    try {
      await axios.delete(API_URL + '/frameworks/' + id);
      setFrameworks(prev => prev.filter(f => f.id !== id));
      if (selectedFramework?.id === id) setSelectedFramework(null);
    } catch (err) { setError(err.response?.data?.error || 'Delete failed.'); }
  };

  const updateFramework = async (id, updates) => {
    try {
      const old = frameworks.find(f => f.id === id) || selectedFramework;
      const payload = { ...old, ...updates };
      await axios.put(API_URL + '/frameworks/' + id, payload);
      setFrameworks(prev => prev.map(f => f.id === id ? payload : f));
      setSelectedFramework(prev => prev?.id === id ? payload : prev);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed; edits have not been persisted.');
      throw err;
    }
  };

  const selectFramework = (framework) => {
    setSelectedFramework(framework);
    setActiveTab('editor');
  };

  const storeFramework = async (framework) => {
    try {
      const { id, metrics, ...payload } = framework;
      const result = await axios.post(API_URL + '/frameworks', payload);
      const saved = { ...payload, ...result.data, metrics: { totalRuns: 0, successRate: 0, avgLatency: 0 } };
      setFrameworks(prev => [saved, ...prev]);
      setSelectedFramework(saved);
      setActiveTab('editor');
      setError(null);
    } catch (err) { setError(err.response?.data?.error || 'Unable to persist imported/generated framework.'); }
  };
  const handleFrameworkGenerated = storeFramework;
  const handleImportFramework = storeFramework;

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
        <span className="header-subtitle">Agentic Architecture Benchmarks <span className="header-pill">Cloudflare Native</span></span>
        <div className="owner-controls">
          {ownerToken ? <button type="button" onClick={lock} className="owner-button">Lock workspace</button>
            : <span className="owner-hint">Private workspace</span>}
        </div>
        {error && <div className="error-banner">{error}</div>}
      </header>

      {needsAuth && (
        <form className="access-panel" onSubmit={unlock}>
          <div><strong>Unlock your workspace</strong><p>Enter the AAB_ADMIN_TOKEN configured as a Cloudflare Worker secret. No tokens are stored on the server or in your repository.</p></div>
          <input aria-label="Owner token" type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Owner access token" required />
          <button className="btn btn-primary" type="submit">Unlock</button>
        </form>
      )}
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
        <p>Cloudflare Workers · D1 · Workers AI · React Flow · Free-tier architecture</p>
      </footer>
    </div>
  );
}

export default App;
