const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for frameworks
let frameworks = [
  {
    id: '1',
    name: 'Sequential Agent Chain',
    description: 'A simple sequential chain of agents processing data in order',
    nodes: [
      { id: 'input', type: 'input', position: { x: 100, y: 100 }, data: { label: 'Input' } },
      { id: 'agent1', type: 'agent', position: { x: 300, y: 100 }, data: { label: 'Agent 1', config: { model: 'gpt-4', temperature: 0.7 } } },
      { id: 'agent2', type: 'agent', position: { x: 500, y: 100 }, data: { label: 'Agent 2', config: { model: 'gpt-4', temperature: 0.5 } } },
      { id: 'output', type: 'output', position: { x: 700, y: 100 }, data: { label: 'Output' } }
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
      { id: 'e2', source: 'agent1', target: 'agent2', type: 'smoothstep' },
      { id: 'e3', source: 'agent2', target: 'output', type: 'smoothstep' }
    ],
    metrics: {
      avgLatency: 2.5,
      successRate: 0.95,
      totalRuns: 100
    }
  },
  {
    id: '2',
    name: 'Parallel Processing',
    description: 'Multiple agents process in parallel then merge results',
    nodes: [
      { id: 'input', type: 'input', position: { x: 100, y: 200 }, data: { label: 'Input' } },
      { id: 'agent1', type: 'agent', position: { x: 300, y: 100 }, data: { label: 'Agent 1', config: { model: 'gpt-4', temperature: 0.7 } } },
      { id: 'agent2', type: 'agent', position: { x: 300, y: 300 }, data: { label: 'Agent 2', config: { model: 'gpt-3.5-turbo', temperature: 0.8 } } },
      { id: 'merger', type: 'processor', position: { x: 500, y: 200 }, data: { label: 'Merger' } },
      { id: 'output', type: 'output', position: { x: 700, y: 200 }, data: { label: 'Output' } }
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'agent1', type: 'smoothstep' },
      { id: 'e2', source: 'input', target: 'agent2', type: 'smoothstep' },
      { id: 'e3', source: 'agent1', target: 'merger', type: 'smoothstep' },
      { id: 'e4', source: 'agent2', target: 'merger', type: 'smoothstep' },
      { id: 'e5', source: 'merger', target: 'output', type: 'smoothstep' }
    ],
    metrics: {
      avgLatency: 1.8,
      successRate: 0.92,
      totalRuns: 75
    }
  }
];

// Test results storage
let testResults = [];

// API Routes

// Get all frameworks
app.get('/api/frameworks', (req, res) => {
  res.json(frameworks);
});

// Get a specific framework
app.get('/api/frameworks/:id', (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  res.json(framework);
});

// Create a new framework
app.post('/api/frameworks', (req, res) => {
  const newFramework = {
    id: uuidv4(),
    name: req.body.name || 'Untitled Framework',
    description: req.body.description || '',
    nodes: req.body.nodes || [],
    edges: req.body.edges || [],
    metrics: {
      avgLatency: 0,
      successRate: 0,
      totalRuns: 0
    }
  };
  frameworks.push(newFramework);
  res.status(201).json(newFramework);
});

// Update a framework
app.put('/api/frameworks/:id', (req, res) => {
  const index = frameworks.findIndex(f => f.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  
  frameworks[index] = {
    ...frameworks[index],
    name: req.body.name || frameworks[index].name,
    description: req.body.description || frameworks[index].description,
    nodes: req.body.nodes || frameworks[index].nodes,
    edges: req.body.edges || frameworks[index].edges
  };
  
  res.json(frameworks[index]);
});

// Delete a framework
app.delete('/api/frameworks/:id', (req, res) => {
  const index = frameworks.findIndex(f => f.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  
  frameworks.splice(index, 1);
  res.status(204).send();
});

// Run a test on a framework
app.post('/api/frameworks/:id/test', async (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  
  // Simulate test execution
  const testResult = {
    id: uuidv4(),
    frameworkId: req.params.id,
    timestamp: new Date().toISOString(),
    testInput: req.body.testInput || 'Sample test input',
    status: 'completed',
    latency: Math.random() * 5, // Random latency between 0-5s
    success: Math.random() > 0.1, // 90% success rate
    output: `Test completed for framework: ${framework.name}`,
    nodeExecutionOrder: framework.nodes.map(n => n.id),
    nodeTimings: framework.nodes.reduce((acc, node) => {
      acc[node.id] = Math.random() * 1000; // Random timing in ms
      return acc;
    }, {})
  };
  
  testResults.push(testResult);
  
  // Update framework metrics
  framework.metrics.totalRuns += 1;
  framework.metrics.avgLatency = (
    (framework.metrics.avgLatency * (framework.metrics.totalRuns - 1) + testResult.latency) /
    framework.metrics.totalRuns
  );
  framework.metrics.successRate = (
    (framework.metrics.successRate * (framework.metrics.totalRuns - 1) + (testResult.success ? 1 : 0)) /
    framework.metrics.totalRuns
  );
  
  res.json(testResult);
});

// Get test results for a framework
app.get('/api/frameworks/:id/results', (req, res) => {
  const results = testResults.filter(r => r.frameworkId === req.params.id);
  res.json(results);
});

// Get all test results
app.get('/api/results', (req, res) => {
  res.json(testResults);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
