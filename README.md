# MerkleProofVoting

## Overview

MerkleProofVoting is an innovative blockchain-based voting system that utilizes Merkle trees to provide a secure, efficient, and transparent voting mechanism. The project implements a robust solution for creating and managing ballots with advanced voter verification using cryptographic Merkle proofs.

## Key Features

- **Flexible Ballot Creation**: Easily create multiple ballots with custom proposals
- **Cryptographic Voter Verification**: Efficient whitelist management using Merkle tree proofs
- **Vote Integrity**: Strict one-vote-per-voter enforcement
- **Complete Ballot Lifecycle Management**: From creation to finalization

## Technology Stack

- **Blockchain**: Solidity smart contracts
- **Backend**: NestJS for Merkle proof generation and API
- **Frontend**: Next.js with Scaffold-ETH 2
- **Cryptography**: Merkle tree implementation for voter authentication

## Getting Started

### Prerequisites

- Node.js 
- Hardhat
- Scaffold-ETH
- Web3-compatible wallet

## Installation Guide

### Prerequisites
- Node Version Manager (NVM)
- Git
- Code Editor (VS Code, Cursor)

### Step 1: Set Up Node.js
```bash
# Install the latest LTS version of Node.js
nvm install lts
nvm use lts

# Verify Node.js version
node -v
# Expected output: v20.11.1 (or similar recent LTS version)
```

### Step 2: Create Project Directory
```bash
# Exit any current working folder
cd ..

# Create and navigate to project directory
mkdir merkle-proof-voting
cd merkle-proof-voting
```

### Step 3: Smart Contracts and Hardhat Setup
```bash
# Initialize npm project (accept default options)
npm init -y

# Install Hardhat as a dev dependency
npm install --save-dev hardhat

# Initialize Hardhat project
npx hardhat init
# When prompted:
# - Select "Create a TypeScript project (with Viem)"
# - Accept default options for subsequent prompts
```

### Step 4: Scaffold-ETH 2 Frontend
```bash
# Enable Corepack (for yarn management)
corepack enable

# Clone Scaffold-ETH 2 repository
git clone https://github.com/scaffold-eth/scaffold-eth-2.git frontend

# Navigate to frontend directory
cd frontend

# Install dependencies
yarn install

# Start development server
yarn start
```

### Step 5: NestJS Backend API
```bash
# Navigate back to project root
cd ..

# Install NestJS CLI globally
npm install -g @nestjs/cli

# Create NestJS backend project
nest new backend

# Navigate to backend directory
cd backend

# Start the backend server
npm run start
```

### Project Structure
```
merkle-proof-voting/
│
├── contracts/         # Solidity smart contracts
├── frontend/          # Scaffold-ETH 2 Next.js frontend
├── backend/           # NestJS backend API
└── README.md          # Project docs
```

### Environment Configuration
1. Create `.env` files in each project subdirectory
2. Configure blockchain network settings
3. Set up API endpoints and private keys

### Recommended Development Workflow
1. Start local blockchain: `npx hardhat node`
2. Deploy contracts: `npx hardhat deploy`
3. Start frontend: `yarn start` (in frontend directory)
4. Start backend: `npm run start` (in backend directory)

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run ./scripts/DeployWithViem.ts

```


## How It Works

### Ballot Creation
- Admin creates a new ballot specifying proposals
- Generates Merkle root from authorized voter addresses
- Deploys ballot contract with Merkle root

### Voter Authentication
1. User connects wallet
2. Backend generates Merkle proof
3. Smart contract verifies proof before vote submission
4. Ensures only whitelisted voters can participate
5. Prevents double voting

## Security Considerations

- Merkle tree prevents front-running and voter impersonation
- One-vote enforcement at smart contract level
- Cryptographic proof verification
- Minimized on-chain storage and gas costs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
