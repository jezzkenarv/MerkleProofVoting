# MerkleProofVoting Project

A blockchain-based voting system that leverages Merkle trees for efficient whitelist verification. The system centers around a BallotFactory smart contract that enables the creation of multiple ballots, each with customizable proposals and whitelisted voters.

## Key Features
- Multiple ballot creation with custom proposals
- Efficient voter verification using Merkle proofs
- One-vote-per-voter restriction within each ballot
- Complete ballot lifecycle management

## Technology Stack
- **Smart Contracts**: Solidity for on-chain logic
- **Backend API**: NestJS for Merkle proof generation
- **Frontend**: Next.js with Scaffold-ETH 2
