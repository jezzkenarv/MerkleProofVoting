import { expect } from "chai";
import { toHex, hexToString } from "viem";
import { viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

// Define proposals for test ballots
const BALLOT1_PROPOSALS = ["Proposal 1A", "Proposal 1B", "Proposal 1C"];
const BALLOT2_PROPOSALS = ["Proposal 2A", "Proposal 2B"];

describe("BallotFactory", async () => {
  // Fixture that deploys the contract and sets up test accounts and merkle trees
  async function deployBallotFactory() {
    const [deployer, voter1, voter2, voter3, voter4, nonWhitelisted] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    // Create whitelist for first ballot (voters 1, 2, and 3)
    const whitelist1 = [
      voter1.account.address,
      voter2.account.address,
      voter3.account.address
    ];

    // Create merkle tree for first ballot
    const merkleTree1 = new MerkleTree(
      whitelist1.map(addr => keccak256(addr)),
      keccak256,
      { sortPairs: true }
    );
    const merkleRoot1 = merkleTree1.getHexRoot();


    // console.logs to check format of the root
    console.log("Raw merkle root:", merkleRoot1);
    console.log("Type of merkle root:", typeof merkleRoot1);
    console.log("First few characters:", merkleRoot1.slice(0, 10));

    // Create whitelist for second ballot (voters 2, 3, and 4)
    const whitelist2 = [
      voter2.account.address,
      voter3.account.address,
      voter4.account.address
    ];

    // Create merkle tree for second ballot
    const merkleTree2 = new MerkleTree(
      whitelist2.map(addr => keccak256(addr)),
      keccak256,
      { sortPairs: true }
    );
    const merkleRoot2 = merkleTree1.getHexRoot();

    // Deploy the BallotFactory contract
    const result = await viem.deployContract("BallotFactory");
    const contractAddress = result.address;

    return {
      contractAddress,
      publicClient,
      deployer,
      voter1,
      voter2,
      voter3,
      voter4,
      nonWhitelisted,
      merkleTree1,
      merkleRoot1,
      merkleTree2,
      merkleRoot2
    };
  }


  describe("when the contract is deployed", async () => {
    it("should have zero ballots initially", async () => {
      const { contractAddress, publicClient } = await loadFixture(deployBallotFactory);

      const ballotCount = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [],
            name: "ballotCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "ballotCount"
      });

      expect(ballotCount).to.equal(0n);
    });
  });

  describe("when creating a new ballot", async () => {
    it("should store the ballot with the correct merkle root and proposals", async () => {
      const { contractAddress, publicClient, deployer, merkleRoot1 } = await loadFixture(deployBallotFactory);

      // Create a new ballot
      const hash = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check ballot count
      const ballotCount = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [],
            name: "ballotCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "ballotCount"
      });

      expect(ballotCount).to.equal(1n);

      // Get and verify proposal names
      const proposalNames = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [{ type: "uint256", name: "ballotId" }],
            name: "getProposalNames",
            outputs: [{ type: "string[]", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getProposalNames",
        args: [0n]
      });

      expect(proposalNames).to.deep.equal(BALLOT1_PROPOSALS);
    });

    it("should create multiple ballots with different parameters", async () => {
      const { contractAddress, publicClient, deployer, merkleRoot1, merkleRoot2 } =
        await loadFixture(deployBallotFactory);

      // Create first ballot
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Create second ballot
      const hash2 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot2, BALLOT2_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Check ballot count
      const ballotCount = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [],
            name: "ballotCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "ballotCount"
      });

      expect(ballotCount).to.equal(2n);
    });
  });

  describe("when voting in a ballot", async () => {
    it("should allow a whitelisted voter to vote", async () => {
      const { contractAddress, publicClient, deployer, voter1, merkleRoot1, merkleTree1 } =
        await loadFixture(deployBallotFactory);

      // Create ballot
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Generate merkle proof for voter1
      const leaf = keccak256(voter1.account.address);
      const proofArray = merkleTree1.getHexProof(leaf);
      const proof = proofArray.map(p => typeof p === 'string' ? p : `0x${p.toString('hex')}`);
      // console logs to check format 
      console.log("Raw proof:", proof);
      console.log("Proof first element:", proof[0]);

      // Cast vote for proposal 1 in ballot 0
      const hash2 = await voter1.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 1n, proof]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Check vote count
      const voteCount = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [0n, 1n]
      });

      expect(voteCount).to.equal(1n);

      // Check that hasVoted is true
      const hasVoted = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "address", name: "voter" }
            ],
            name: "hasVoted",
            outputs: [{ type: "bool", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "hasVoted",
        args: [0n, voter1.account.address]
      });

      expect(hasVoted).to.be.true;
    });

    it("should prevent double voting in the same ballot", async () => {
      const { contractAddress, publicClient, deployer, voter1, merkleRoot1, merkleTree1 } =
        await loadFixture(deployBallotFactory);

      // Create a new ballot
      const hash = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Generate merkle proof for voter1
      const leaf = keccak256(voter1.account.address);
      const proof = merkleTree1.getHexProof(leaf);

      // First vote
      const hash2 = await voter1.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 1n, proof]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Second vote should fail
      await expect(
        voter1.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "uint256", name: "ballotId" },
                { type: "uint256", name: "proposalId" },
                { type: "bytes32[]", name: "merkleProof" }
              ],
              name: "vote",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "vote",
          args: [0n, 2n, proof]
        })
      ).to.be.rejectedWith("Already voted in this ballot");
    });

    it("should allow voting in different ballots if whitelisted", async () => {
      const { contractAddress, publicClient, deployer, voter2, merkleRoot1, merkleRoot2, merkleTree1, merkleTree2 } =
        await loadFixture(deployBallotFactory);

      // Create two ballots
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot2, BALLOT2_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Generate merkle proofs for voter2 (whitelisted in both ballots)
      const leaf = keccak256(voter2.account.address);
      const proof1 = merkleTree1.getHexProof(leaf);
      const proof2 = merkleTree2.getHexProof(leaf);

      // Vote in ballot 0
      const hash3 = await voter2.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 0n, proof1]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      // Vote in ballot 1
      const hash4 = await voter2.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [1n, 1n, proof2]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash4 });

      // Check vote counts in both ballots
      const voteCount1 = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [0n, 0n]
      });

      const voteCount2 = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [1n, 1n]
      });

      expect(voteCount1).to.equal(1n);
      expect(voteCount2).to.equal(1n);
    });

    it("should reject non-whitelisted addresses", async () => {
      const { contractAddress, publicClient, deployer, nonWhitelisted, merkleRoot1, merkleTree1 } =
        await loadFixture(deployBallotFactory);

      // Create ballot
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Generate invalid proof for non-whitelisted address
      const leaf = keccak256(nonWhitelisted.account.address);
      const proof = merkleTree1.getHexProof(leaf);

      // Attempt to vote should fail
      await expect(
        nonWhitelisted.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "uint256", name: "ballotId" },
                { type: "uint256", name: "proposalId" },
                { type: "bytes32[]", name: "merkleProof" }
              ],
              name: "vote",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "vote",
          args: [0n, 1n, proof]
        })
      ).to.be.rejectedWith("Invalid proof, not in whitelist");
    });
  });

  describe("when closing a ballot", async () => {
    it("should prevent voting in a closed ballot", async () => {
      const { contractAddress, publicClient, deployer, voter1, merkleRoot1, merkleTree1 } =
        await loadFixture(deployBallotFactory);

      // Create ballot
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Close the ballot
      const hash2 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [{ type: "uint256", name: "ballotId" }],
            name: "closeBallot",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "closeBallot",
        args: [0n]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Generate merkle proof for voter1
      const leaf = keccak256(voter1.account.address);
      const proof = merkleTree1.getHexProof(leaf);

      // Attempt to vote in closed ballot should fail
      await expect(
        voter1.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "uint256", name: "ballotId" },
                { type: "uint256", name: "proposalId" },
                { type: "bytes32[]", name: "merkleProof" }
              ],
              name: "vote",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "vote",
          args: [0n, 1n, proof]
        })
      ).to.be.rejectedWith("Ballot is not active");
    });
  });

  describe("when multiple voters participate across ballots", async () => {
    it("should accurately track votes across multiple ballots", async () => {
      const {
        contractAddress,
        publicClient,
        deployer,
        voter1,
        voter2,
        voter3,
        voter4,
        merkleRoot1,
        merkleRoot2,
        merkleTree1,
        merkleTree2
      } = await loadFixture(deployBallotFactory);

      // Create two ballots
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot2, BALLOT2_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Vote in first ballot with voters 1, 2, and 3
      const leaf1 = keccak256(voter1.account.address);
      const proof1 = merkleTree1.getHexProof(leaf1);
      const voteHash1 = await voter1.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 0n, proof1]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash1 });

      const leaf2 = keccak256(voter2.account.address);
      const proof2 = merkleTree1.getHexProof(leaf2);
      const voteHash2 = await voter2.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 1n, proof2]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash2 });

      const leaf3 = keccak256(voter3.account.address);
      const proof3 = merkleTree1.getHexProof(leaf3);
      const voteHash3 = await voter3.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [0n, 1n, proof3]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash3 });

      // Vote in second ballot with voters 2, 3, and 4
      const proof2b = merkleTree2.getHexProof(leaf2);
      const voteHash4 = await voter2.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [1n, 0n, proof2b]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash4 });

      const proof3b = merkleTree2.getHexProof(leaf3);
      const voteHash5 = await voter3.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [1n, 0n, proof3b]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash5 });

      const leaf4 = keccak256(voter4.account.address);
      const proof4 = merkleTree2.getHexProof(leaf4);
      const voteHash6 = await voter4.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" },
              { type: "bytes32[]", name: "merkleProof" }
            ],
            name: "vote",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "vote",
        args: [1n, 1n, proof4]
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash6 });

      // Check vote counts for ballot 1
      const ballot1Prop0Count = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [0n, 0n]
      });

      const ballot1Prop1Count = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [0n, 1n]
      });

      // Check vote counts for ballot 2
      const ballot2Prop0Count = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [1n, 0n]
      });

      const ballot2Prop1Count = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "uint256", name: "proposalId" }
            ],
            name: "getVoteCount",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getVoteCount",
        args: [1n, 1n]
      });

      expect(ballot1Prop0Count).to.equal(1n);
      expect(ballot1Prop1Count).to.equal(2n);
      expect(ballot2Prop0Count).to.equal(2n);
      expect(ballot2Prop1Count).to.equal(1n);

      // Verify voters' status in each ballot
      const voter1Ballot1Status = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "address", name: "voter" }
            ],
            name: "hasVoted",
            outputs: [{ type: "bool", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "hasVoted",
        args: [0n, voter1.account.address]
      });

      const voter2Ballot2Status = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "uint256", name: "ballotId" },
              { type: "address", name: "voter" }
            ],
            name: "hasVoted",
            outputs: [{ type: "bool", name: "" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "hasVoted",
        args: [1n, voter2.account.address]
      });

      expect(voter1Ballot1Status).to.be.true;
      expect(voter2Ballot2Status).to.be.true;
    });
  });

  describe("when trying to access invalid ballots", async () => {
    it("should revert when accessing a non-existent ballot", async () => {
      const { contractAddress, publicClient, voter1 } = await loadFixture(deployBallotFactory);

      // Try to get proposal names for non-existent ballot
      await expect(
        publicClient.readContract({
          address: contractAddress,
          abi: [
            {
              inputs: [{ type: "uint256", name: "ballotId" }],
              name: "getProposalNames",
              outputs: [{ type: "string[]", name: "" }],
              stateMutability: "view",
              type: "function"
            }
          ],
          functionName: "getProposalNames",
          args: [0n]
        })
      ).to.be.rejectedWith("Ballot does not exist");

      // Try to vote in non-existent ballot
      await expect(
        voter1.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "uint256", name: "ballotId" },
                { type: "uint256", name: "proposalId" },
                { type: "bytes32[]", name: "merkleProof" }
              ],
              name: "vote",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "vote",
          args: [999n, 0n, []]
        })
      ).to.be.rejectedWith("Ballot does not exist");
    });
  });

  describe("when voting for invalid proposals", async () => {
    it("should revert when voting for a non-existent proposal", async () => {
      const { contractAddress, publicClient, deployer, voter1, merkleRoot1, merkleTree1 } =
        await loadFixture(deployBallotFactory);

      // Create ballot
      const hash1 = await deployer.writeContract({
        address: contractAddress,
        abi: [
          {
            inputs: [
              { type: "bytes32", name: "_merkleRoot" },
              { type: "string[]", name: "_proposalNames" }
            ],
            name: "createBallot",
            outputs: [{ type: "uint256", name: "" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "createBallot",
        args: [merkleRoot1, BALLOT1_PROPOSALS]
      });

      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Generate merkle proof for voter1
      const leaf = keccak256(voter1.account.address);
      const proof = merkleTree1.getHexProof(leaf);

      // Try to vote for non-existent proposal
      await expect(
        voter1.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "uint256", name: "ballotId" },
                { type: "uint256", name: "proposalId" },
                { type: "bytes32[]", name: "merkleProof" }
              ],
              name: "vote",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "vote",
          args: [0n, 999n, proof]
        })
      ).to.be.rejectedWith("Invalid proposal");
    });
  });

  describe("when creating a ballot with empty proposals", async () => {
    it("should revert when trying to create a ballot with no proposals", async () => {
      const { contractAddress, deployer, merkleRoot1 } = await loadFixture(deployBallotFactory);

      // Try to create ballot with empty proposals array
      await expect(
        deployer.writeContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { type: "bytes32", name: "_merkleRoot" },
                { type: "string[]", name: "_proposalNames" }
              ],
              name: "createBallot",
              outputs: [{ type: "uint256", name: "" }],
              stateMutability: "nonpayable",
              type: "function"
            }
          ],
          functionName: "createBallot",
          args: [merkleRoot1, []]
        })
      ).to.be.rejectedWith("No proposals provided");
    });
  });
});