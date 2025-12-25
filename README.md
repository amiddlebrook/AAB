# AAB - Agentic Architecture Benchmarks

🤖 **A comprehensive web application for testing, visualizing, and optimizing agentic frameworks and architectures.**

## Features

### 🎨 Visual Framework Editor
- **Interactive Graph Editor**: Build agent workflows using a drag-and-drop interface
- **Node Types**: Support for Input, Output, Agent, Processor, and Decision nodes
- **Real-time Editing**: Modify framework structure, connections, and configurations on the fly
- **Configuration Management**: Customize agent parameters (model, temperature, etc.)

### 🧪 Test Runner
- **Execute Tests**: Run test cases against your frameworks with custom inputs
- **Performance Metrics**: Track latency, success rates, and execution times
- **Node-level Insights**: Visualize individual node execution timings
- **Test History**: Review past test results and performance trends

### 📊 Dashboard & Analytics
- **Comparative Analysis**: Compare performance across multiple frameworks
- **Success Rate Tracking**: Monitor and optimize framework reliability
- **Performance Metrics**: Analyze average latency and throughput
- **Insights & Recommendations**: Get AI-powered suggestions for optimization

### 💾 Framework Management
- **CRUD Operations**: Create, read, update, and delete frameworks
- **Pre-built Templates**: Start with example frameworks (Sequential Chain, Parallel Processing)
- **Export/Import**: Save and share framework configurations

## Architecture

### Backend (Node.js/Express)
- RESTful API for framework management
- In-memory storage for rapid prototyping
- Test execution engine with simulated metrics
- CORS-enabled for cross-origin requests

### Frontend (React)
- Modern React UI with hooks
- ReactFlow for graph visualization
- Axios for API communication
- Responsive design with custom CSS

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/amiddlebrook/AAB.git
cd AAB
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. **Start the application**
```bash
# Start both backend and frontend concurrently
npm start
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

### Alternative: Run Separately

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## Usage

### Creating a Framework

1. Click **"+ New Framework"** in the navigation bar
2. The editor will open with a basic template
3. Add nodes using the sidebar buttons:
   - **Input**: Data entry point
   - **Agent**: AI agent with configurable model and temperature
   - **Processor**: Data processing node
   - **Decision**: Conditional routing node
   - **Output**: Result endpoint
4. Connect nodes by dragging from one node's edge to another
5. Configure node properties by clicking on them
6. Save your framework

### Testing a Framework

1. Select a framework from the list
2. Navigate to the **"Test Runner"** tab
3. Enter test input in the text area
4. Click **"▶️ Run Test"**
5. View results including:
   - Success/failure status
   - Execution latency
   - Node-level timing breakdown
   - Output results

### Analyzing Performance

1. Go to the **"Dashboard"** tab
2. Review overall statistics:
   - Total frameworks and test runs
   - Average success rates
   - Average latency
3. Compare frameworks side-by-side
4. Identify best performing and fastest frameworks
5. Review insights and optimization suggestions

## API Documentation

### Frameworks

#### Get all frameworks
```
GET /api/frameworks
```

#### Get specific framework
```
GET /api/frameworks/:id
```

#### Create framework
```
POST /api/frameworks
Body: {
  name: string,
  description: string,
  nodes: array,
  edges: array
}
```

#### Update framework
```
PUT /api/frameworks/:id
Body: {
  name: string,
  description: string,
  nodes: array,
  edges: array
}
```

#### Delete framework
```
DELETE /api/frameworks/:id
```

### Testing

#### Run test
```
POST /api/frameworks/:id/test
Body: {
  testInput: string
}
```

#### Get test results
```
GET /api/frameworks/:id/results
```

#### Get all results
```
GET /api/results
```

### Health Check
```
GET /api/health
```

## Technology Stack

### Backend
- **Express.js**: Web framework
- **CORS**: Cross-origin resource sharing
- **body-parser**: Request body parsing
- **uuid**: Unique ID generation

### Frontend
- **React**: UI library
- **ReactFlow**: Graph visualization
- **Axios**: HTTP client
- **React Hooks**: State management

## Project Structure

```
AAB/
├── server/
│   └── index.js          # Backend API server
├── client/
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # React components
│       │   ├── FrameworkList.js
│       │   ├── FrameworkEditor.js
│       │   ├── TestRunner.js
│       │   └── Dashboard.js
│       ├── App.js        # Main app component
│       └── index.js      # Entry point
├── package.json          # Root dependencies
└── README.md            # Documentation
```

## Future Enhancements

- [ ] Persistent storage (database integration)
- [ ] Real AI model integration
- [ ] User authentication
- [ ] Framework versioning
- [ ] Export to code/configuration files
- [ ] Collaborative editing
- [ ] Advanced analytics and ML insights
- [ ] Custom node types
- [ ] Integration with CI/CD pipelines
- [ ] Framework marketplace/sharing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For issues and questions, please open an issue on the GitHub repository.

---

Built with ❤️ for the agentic AI community

