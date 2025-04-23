// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract BallotFactory {
    struct Ballot {
        bytes32 merkleRoot;          // The Merkle root for this ballot's whitelist
        string[] proposalNames;      // Names of the proposals
        mapping(uint256 => uint256) proposalVotes; // Votes per proposal
        mapping(address => bool) hasVoted;   // Track who has voted
        bool active;                 // Is this ballot still active?
    }

    mapping(uint256 => Ballot) public ballots;
    uint256 public ballotCount;

    event BallotCreated(uint256 indexed ballotId, string[] proposalNames);
    event VoteCast(uint256 indexed ballotId, address indexed voter, uint256 indexed proposalId);
    event BallotClosed(uint256 indexed ballotId);

    // Create a new ballot with its own proposals and whitelisted addresses
    function createBallot(bytes32 _merkleRoot, string[] calldata _proposalNames) external returns (uint256) {
        require(_proposalNames.length > 0, "No proposals provided");
        
        uint256 ballotId = ballotCount;
        Ballot storage ballot = ballots[ballotId];
        
        ballot.merkleRoot = _merkleRoot;
        ballot.active = true;
        
        for (uint i = 0; i < _proposalNames.length; i++) {
            ballot.proposalNames.push(_proposalNames[i]);
        }
        
        emit BallotCreated(ballotId, _proposalNames);
        
        ballotCount++;
        return ballotId;
    }

    // Vote in a specific ballot
    function vote(uint256 ballotId, uint256 proposalId, bytes32[] calldata merkleProof) external {
        require(ballotId < ballotCount, "Ballot does not exist");
        Ballot storage ballot = ballots[ballotId];
        
        require(ballot.active, "Ballot is not active");
        require(proposalId < ballot.proposalNames.length, "Invalid proposal");
        require(!ballot.hasVoted[msg.sender], "Already voted in this ballot");
        
        // Verify the user is in this ballot's whitelist using Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(merkleProof, ballot.merkleRoot, leaf),
            "Invalid proof, not in whitelist"
        );
        
        // Record the vote
        ballot.proposalVotes[proposalId]++;
        ballot.hasVoted[msg.sender] = true;
        
        emit VoteCast(ballotId, msg.sender, proposalId);
    }
    
    // Get vote count for a specific proposal in a ballot
    function getVoteCount(uint256 ballotId, uint256 proposalId) external view returns (uint256) {
        require(ballotId < ballotCount, "Ballot does not exist");
        return ballots[ballotId].proposalVotes[proposalId];
    }
    
    // Check if an address has voted in a specific ballot
    function hasVoted(uint256 ballotId, address voter) external view returns (bool) {
        require(ballotId < ballotCount, "Ballot does not exist");
        return ballots[ballotId].hasVoted[voter];
    }
    
    // Get proposal names for a ballot
    function getProposalNames(uint256 ballotId) external view returns (string[] memory) {
        require(ballotId < ballotCount, "Ballot does not exist");
        return ballots[ballotId].proposalNames;
    }
    
    // Close a ballot to prevent further voting
    function closeBallot(uint256 ballotId) external {
        require(ballotId < ballotCount, "Ballot does not exist");
        ballots[ballotId].active = false;
        emit BallotClosed(ballotId);
    }
}