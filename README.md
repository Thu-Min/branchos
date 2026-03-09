# branchos

Branch-based AI-assisted development workflow management.

BranchOS isolates planning and execution state per Git branch, preventing collisions when multiple developers (or AI agents) work in the same repository.

## Installation

```bash
npm install -g branchos
```

## Quick Start

```bash
# Initialize in your repo
branchos init

# Create a workstream (auto-detects from branch name)
branchos workstream create my-feature

# Run the workflow
branchos discuss    # Gather phase context
branchos plan       # Create execution plan
branchos execute    # Execute the phase

# Check status
branchos status
```

## Requirements

- Node.js >= 20
- Git repository

## License

MIT
