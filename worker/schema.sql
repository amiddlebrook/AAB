-- AAB D1 Database Schema

-- Frameworks table - stores agent architectures
CREATE TABLE IF NOT EXISTS frameworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Nodes table - individual nodes in a framework
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  framework_id TEXT NOT NULL,
  type TEXT NOT NULL,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  label TEXT NOT NULL,
  config TEXT, -- JSON for node configuration
  custom_code TEXT, -- User's custom execution code
  FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE
);

-- Edges table - connections between nodes
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  framework_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  edge_type TEXT DEFAULT 'smoothstep',
  label TEXT,
  condition TEXT, -- JSON for conditional routing
  FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE
);

-- Custom node types - user-defined node definitions
CREATE TABLE IF NOT EXISTS node_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  input_schema TEXT, -- JSON schema
  output_schema TEXT, -- JSON schema
  config_schema TEXT, -- JSON schema
  execute_code TEXT NOT NULL, -- JavaScript code
  created_at TEXT DEFAULT (datetime('now'))
);

-- Test results - execution history
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  framework_id TEXT NOT NULL,
  test_input TEXT,
  status TEXT NOT NULL,
  success INTEGER NOT NULL,
  latency_ms INTEGER,
  total_tokens INTEGER,
  total_cost REAL,
  output TEXT,
  node_timings TEXT, -- JSON
  node_outputs TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE
);

-- Execution logs - detailed per-node logs
CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  input TEXT,
  output TEXT,
  model TEXT,
  tokens INTEGER,
  latency_ms INTEGER,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (result_id) REFERENCES test_results(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_framework ON nodes(framework_id);
CREATE INDEX IF NOT EXISTS idx_edges_framework ON edges(framework_id);
CREATE INDEX IF NOT EXISTS idx_results_framework ON test_results(framework_id);
CREATE INDEX IF NOT EXISTS idx_logs_result ON execution_logs(result_id);
