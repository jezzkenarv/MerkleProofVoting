# Merkle Proof Voting System

## Frontend Components

### Pages

#### Home Page (index.js)
- Entry point for the application
- Displays all available ballots in a responsive grid
- Each ballot shows its ID, proposal count, and whitelist size
- Links to individual ballot details pages

#### Ballot Details Page (ballots/[id].js)
- Displays detailed information about a specific ballot
- Shows all proposals with their current vote counts
- Includes the voting form for eligible users
- Displays ballot metadata (status, whitelist count)
- Links to detailed results page

### Components

#### VotingForm.tsx
- Handles the voting interface for users
- Checks voter eligibility
- Allows proposal selection
- Submits votes to the blockchain
- Shows appropriate feedback based on voter status

#### ProofFetcher.tsx
- Fetches and validates Merkle proofs for voter eligibility
- Displays eligibility status to users
- Passes proof data to parent components

#### ResultsDisplay.tsx
- Visualizes voting results
- Shows vote counts and percentages
- Identifies the leading proposal
- Creates progress bars for each proposal

## API Routes

#### /api/merkle/ballots
- Lists all available ballots
- Fetches data from backend service

#### /api/merkle/ballot/[id]
- Gets detailed information about a specific ballot
- Includes proposal names, vote counts, and status

#### /api/merkle/proof/[ballotId]/[address]
- Generates Merkle proofs for voter verification
- Checks if an address is whitelisted for a specific ballot
- Returns proof data needed for on-chain verification

## Data Flow

1. **Ballot Creation**:
   - Admin creates a ballot with proposals and whitelist
   - Backend generates a Merkle tree from the whitelist
   - The Merkle root is stored on-chain in the smart contract

2. **Voting Process**:
   - User connects their wallet and views available ballots
   - Application checks eligibility by fetching a Merkle proof
   - If eligible, user selects a proposal and submits their vote
   - Smart contract verifies the Merkle proof before recording the vote

3. **Results Viewing**:
   - Users can view real-time voting results
   - Results are visualized with percentage bars
   - The leading proposal is highlighted

