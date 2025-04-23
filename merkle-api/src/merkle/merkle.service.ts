import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WhitelistEntry } from './whitelist.entity';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { ethers } from 'ethers';

@Injectable()
export class MerkleService {
  private merkleTree: any = null;
  private merkleRoot: string | null = null;

  constructor(
    @InjectRepository(WhitelistEntry)
    private whitelistRepository: Repository<WhitelistEntry>,
  ) {
    // Initialize the Merkle tree when service starts
    this.initializeMerkleTree();
  }

  /**
   * Initialize or refresh the Merkle tree with current whitelist
   */
  async initializeMerkleTree(): Promise<void> {
    const whitelistedAddresses = await this.getAllWhitelistedAddresses();
    
    if (whitelistedAddresses.length === 0) {
      this.merkleTree = null;
      this.merkleRoot = null;
      return;
    }

    // Format addresses for OpenZeppelin's StandardMerkleTree
    const formattedAddresses = whitelistedAddresses.map(address => [address]);

    // Create the Merkle tree using OpenZeppelin's library
    this.merkleTree = StandardMerkleTree.of(formattedAddresses, ['address']);
    this.merkleRoot = this.merkleTree.root;
  }

  /**
   * Get the current Merkle root
   */
  getMerkleRoot(): string {
    if (!this.merkleRoot) {
      throw new Error('Merkle tree has not been initialized or whitelist is empty');
    }
    return this.merkleRoot;
  }

  /**
   * Generate a proof for the given address
   */
  async getProof(address: string): Promise<string[]> {
    if (!this.merkleTree) {
      await this.initializeMerkleTree();
      
      if (!this.merkleTree) {
        throw new Error('Unable to generate Merkle tree');
      }
    }

    const normalizedAddress = ethers.utils.getAddress(address);
    const isWhitelisted = await this.isAddressWhitelisted(normalizedAddress);
    
    if (!isWhitelisted) {
      throw new Error(`Address ${normalizedAddress} is not whitelisted`);
    }

    // Find the leaf index for the address
    let proof = [];
    for (const [i, v] of this.merkleTree.entries()) {
      if (v[0] === normalizedAddress) {
        proof = this.merkleTree.getProof(i);
        break;
      }
    }

    if (proof.length === 0) {
      throw new Error(`Could not generate proof for ${normalizedAddress}`);
    }

    return proof;
  }

  /**
   * Verify a proof against the Merkle root
   */
  verifyProof(address: string, proof: string[]): boolean {
    if (!this.merkleTree) {
      throw new Error('Merkle tree has not been initialized');
    }

    const normalizedAddress = ethers.utils.getAddress(address);
    
    try {
      return StandardMerkleTree.verify(
        this.merkleRoot,
        ['address'],
        [normalizedAddress],
        proof
      );
    } catch (error) {
      console.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Hash an address for the Merkle tree
   */
  private hashAddress(address: string): Buffer {
    // Ensure the address is checksummed properly
    const checksummedAddress = ethers.utils.getAddress(address);
    // Create the leaf using the same hashing algorithm as the smart contract
    return Buffer.from(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [checksummedAddress])
      ).slice(2), // Remove '0x' prefix
      'hex'
    );
  }

  /**
   * Whitelist management methods
   */
  
  /**
   * Add an address to the whitelist
   */
  async addToWhitelist(address: string): Promise<WhitelistEntry> {
    const normalizedAddress = address.toLowerCase();
    
    let entry = await this.whitelistRepository.findOne({
      where: { address: normalizedAddress }
    });

    if (entry) {
      return entry; // Address already whitelisted
    }

    // Create new whitelist entry
    entry = this.whitelistRepository.create({
      address: normalizedAddress,
      dateAdded: new Date(),
    });

    await this.whitelistRepository.save(entry);
    
    // Refresh the Merkle tree
    await this.initializeMerkleTree();
    
    return entry;
  }

  /**
   * Remove an address from the whitelist
   */
  async removeFromWhitelist(address: string): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    
    const result = await this.whitelistRepository.delete({ 
      address: normalizedAddress 
    });

    if (result.affected > 0) {
      // Refresh the Merkle tree if an address was removed
      await this.initializeMerkleTree();
      return true;
    }
    
    return false;
  }

  /**
   * Check if an address is whitelisted
   */
  async isAddressWhitelisted(address: string): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    
    const entry = await this.whitelistRepository.findOne({
      where: { address: normalizedAddress }
    });

    return !!entry;
  }

  /**
   * Get all whitelisted addresses
   */
  async getAllWhitelistedAddresses(): Promise<string[]> {
    const entries = await this.whitelistRepository.find();
    return entries.map(entry => entry.address);
  }

  /**
   * Add multiple addresses to the whitelist
   */
  async bulkAddToWhitelist(addresses: string[]): Promise<number> {
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
    
    // Filter out addresses that are already whitelisted
    const existingAddresses = await this.whitelistRepository.find({
      where: { address: In(normalizedAddresses) }
    });
    const existingSet = new Set(existingAddresses.map(e => e.address));
    
    const newAddresses = normalizedAddresses.filter(addr => !existingSet.has(addr));
    
    if (newAddresses.length === 0) {
      return 0; // No new addresses to add
    }
    
    // Create whitelist entries
    const entries = newAddresses.map(address => ({
      address,
      dateAdded: new Date(),
    }));
    
    await this.whitelistRepository.insert(entries);
    
    // Refresh the Merkle tree
    await this.initializeMerkleTree();
    
    return newAddresses.length;
  }
}