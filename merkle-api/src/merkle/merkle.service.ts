import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhitelistEntry } from './whitelist.entity';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import * as ballotFactoryJson from "../assets/BallotFactory.json";
import { Address, createPublicClient, http, createWalletClient, encodeAbiParameters } from 'viem';
import { sepolia } from 'viem/chains';
import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class MerkleService {
  publicClient;
  walletClient;
  private merkleTreesByBallotId: Map<number, MerkleTree> = new Map();
  
  constructor(
    @InjectRepository(WhitelistEntry)
    private whitelistRepository: Repository<WhitelistEntry>,
  ) {
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
    });
    this.walletClient = createWalletClient({
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
      chain: sepolia,
      account: account,
    });
    
    // Load existing ballots to build Merkle trees
    this.loadExistingBallots();
  }
  
  getContractAddress(): string {
    return process.env.BALLOT_FACTORY_ADDRESS as string;
  }
  
  getServerWalletAddress(): string {
    return this.walletClient.account.address;
  }
  
  /**
   * Load existing ballots from the blockchain and build Merkle trees
   */
  private async loadExistingBallots(): Promise<void> {
    try {
      const ballotCount = await this.publicClient.readContract({
        address: this.getContractAddress() as Address,
        abi: ballotFactoryJson.abi,
        functionName: "ballotCount"
      });
      
      for (let i = 0; i < Number(ballotCount); i++) {
        const ballotId = i;
        // Load whitelist entries for this ballot
        const entries = await this.whitelistRepository.find({
          where: { ballotId }
        });
        
        if (entries.length > 0) {
          this.buildMerkleTree(ballotId, entries.map(e => e.address));
        }
      }
    } catch (error) {
      console.error('Error loading existing ballots:', error);
    }
  }

  /**
   * Build a Merkle tree for a specific ballot
   */
  // added null check since Map.get() method can return undefined if key doesn't exist
  private buildMerkleTree(ballotId: number, addresses: string[]): MerkleTree {
    if (this.merkleTreesByBallotId.has(ballotId)) {
      const tree = this.merkleTreesByBallotId.get(ballotId);
      if (tree) {
        return tree;
      }
    }
    
    const leaves = addresses.map(address => 
      keccak256(encodeAbiParameters(
        [{ type: 'address' }], 
        [address as Address]
      ))
    );
    
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    this.merkleTreesByBallotId.set(ballotId, merkleTree);
    
    return merkleTree;
  }

  /**
   * Create a new ballot with whitelisted addresses
   */
  async createBallot(proposalNames: string[], addresses: string[]): Promise<{
    ballotId: number;
    merkleRoot: string;
    transactionHash: string;
  }> {
    // Build Merkle tree for the whitelist
    const normalizedAddresses = addresses.map(addr => addr as Address);
    const merkleTree = this.buildMerkleTree(-1, normalizedAddresses); // Temp ID -1 before we know the real ID
    const merkleRoot = merkleTree.getHexRoot();
    
    // Create ballot transaction
    const hash = await this.walletClient.writeContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "createBallot",
      args: [merkleRoot, proposalNames]
    });
    
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    // Get ballot ID from event logs - this requires parsing the logs
    // For simplicity, we'll get the current ballotCount and subtract 1
    const ballotCount = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "ballotCount"
    });
    
    const ballotId = Number(ballotCount) - 1;
    
    // Save the Merkle tree with the correct ballot ID
    this.merkleTreesByBallotId.set(ballotId, merkleTree);
    
    // Save whitelist entries to database
    await this.saveWhitelistEntries(ballotId, normalizedAddresses.map(addr => addr.toString()));
    
    return {
      ballotId,
      merkleRoot,
      transactionHash: hash,
    };
  }

  /**
   * Save whitelist entries to the database
   */
  private async saveWhitelistEntries(ballotId: number, addresses: string[]): Promise<void> {
    const entries = addresses.map(address => ({
      ballotId,
      address,
      dateAdded: new Date(),
    }));
    
    await this.whitelistRepository.save(entries);
  }

  /**
   * Get Merkle proof for an address for a specific ballot
   */
  async getProof(ballotId: number, address: string): Promise<{
    proof: string[];
    merkleRoot: string;
    isWhitelisted: boolean;
  }> {
    // Check if ballot exists
    const ballotCount = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "ballotCount"
    });
    
    if (ballotId >= Number(ballotCount)) {
      throw new Error(`Ballot ${ballotId} does not exist`);
    }
    
    // Get Merkle tree for this ballot
    const merkleTree = this.merkleTreesByBallotId.get(ballotId);
    if (!merkleTree) {
      throw new Error(`No Merkle tree found for ballot ${ballotId}`);
    }
    
    // Check if address is whitelisted
    const normalizedAddress = address as Address;
    const isWhitelisted = await this.isAddressWhitelisted(ballotId, normalizedAddress.toString());
    
    if (!isWhitelisted) {
      return {
        proof: [],
        merkleRoot: merkleTree.getHexRoot(),
        isWhitelisted: false,
      };
    }
    
    // Generate Merkle proof
    const leaf = keccak256(encodeAbiParameters(
      [{ type: 'address' }], 
      [normalizedAddress]
    ));
    
    const proof = merkleTree.getHexProof(leaf);
    
    return {
      proof,
      merkleRoot: merkleTree.getHexRoot(),
      isWhitelisted: true,
    };
  }

  /**
   * Check if an address is whitelisted for a ballot
   */
  async isAddressWhitelisted(ballotId: number, address: string): Promise<boolean> {
    const entry = await this.whitelistRepository.findOne({
      where: { ballotId, address }
    });
    
    return !!entry;
  }

  /**
   * Get ballot information
   */
  async getBallotInfo(ballotId: number): Promise<{
    proposalNames: string[];
    voteCounts: number[];
    isActive: boolean;
    whitelistCount: number;
  }> {
    // Check if ballot exists
    const ballotCount = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "ballotCount"
    });
    
    if (ballotId >= Number(ballotCount)) {
      throw new Error(`Ballot ${ballotId} does not exist`);
    }
    
    // Get proposal names
    const proposalNames = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "getProposalNames",
      args: [BigInt(ballotId)]
    }) as string[];
    
    // Get vote counts for each proposal
    const voteCounts = await Promise.all(
      proposalNames.map((_, index) => 
        this.publicClient.readContract({
          address: this.getContractAddress() as Address,
          abi: ballotFactoryJson.abi,
          functionName: "getVoteCount",
          args: [BigInt(ballotId), BigInt(index)]
        })
      )
    );
    
    // Get whitelist count
    const whitelistCount = await this.whitelistRepository.count({
      where: { ballotId }
    });
    
    // For now we're assuming it's active since we don't have a way to check in the contract
    const isActive = true;
    
    return {
      proposalNames,
      voteCounts: voteCounts.map(count => Number(count)),
      isActive,
      whitelistCount,
    };
  }

  /**
   * Get all ballots
   */
  async getAllBallots(): Promise<{
    id: number;
    proposalNames: string[];
    whitelistCount: number;
  }[]> {
    const ballotCount = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "ballotCount"
    });
    
    const ballots: {
      id: number;
      proposalNames: string[];
      whitelistCount: number;
    }[] = [];
    
    for (let i = 0; i < Number(ballotCount); i++) {
      try {
        const proposalNames = await this.publicClient.readContract({
          address: this.getContractAddress() as Address,
          abi: ballotFactoryJson.abi,
          functionName: "getProposalNames",
          args: [BigInt(i)]
        }) as string[];
        
        const whitelistCount = await this.whitelistRepository.count({
          where: { ballotId: i }
        });
        
        ballots.push({
          id: i,
          proposalNames,
          whitelistCount: Number(whitelistCount),
        });
      } catch (error) {
        console.error(`Error fetching ballot ${i}:`, error);
      }
    }
    
    return ballots;
  }

  /**
   * Add addresses to a ballot's whitelist
   */
  async addToWhitelist(ballotId: number, addresses: string[]): Promise<boolean> {
    // Check if ballot exists
    const ballotCount = await this.publicClient.readContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "ballotCount"
    });
    
    if (ballotId >= Number(ballotCount)) {
      throw new Error(`Ballot ${ballotId} does not exist`);
    }
    
    // Normalize addresses
    const normalizedAddresses = addresses.map(addr => addr.toString());
    
    // Save to database
    await this.saveWhitelistEntries(ballotId, normalizedAddresses);
    
    // Update Merkle tree
    const allEntries = await this.whitelistRepository.find({
      where: { ballotId }
    });
    const updatedTree = this.buildMerkleTree(ballotId, allEntries.map(e => e.address));
    const newMerkleRoot = updatedTree.getHexRoot();
    
    // Update the contract's Merkle root
    const hash = await this.walletClient.writeContract({
      address: this.getContractAddress() as Address,
      abi: ballotFactoryJson.abi,
      functionName: "updateMerkleRoot",
      args: [BigInt(ballotId), newMerkleRoot]
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash });
    
    return true;
  }
}