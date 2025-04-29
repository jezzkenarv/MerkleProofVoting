// Next.js API route handler that fetches Merkle proof that verifies user voting eligibility
// Creates the API endpoint /api/merkle/proof/[ballotId]/[address] and only accepts GET requests
// Extracts two parameters from the URL: `ballotId`, the ID of the ballot to check eligibility for and `address`, the wallet address to verify
// Acts as a proxy to another API (specified by the NEXT_PUBLIC_API_URL environment variable) and makes a request to ${apiUrl}/merkle/proof/${ballotId}/${address}
// This endpoint generates/retrieves the Merkle proof for the given address

// Returns a structured JSON response containing:
// proof: An array of strings representing the Merkle proof
// merkleRoot: The Merkle root hash for verification
// isWhitelisted: A boolean indicating if the address is eligible to vote

// When a user tries to vote, the frontend fetches this proof and passes it to the smart contract, which can then verify the user's eligibility w/o needing to trust the frontend



import type { NextApiRequest, NextApiResponse } from 'next';

type ProofResponse = {
  success: boolean;
  data?: {
    proof: string[];
    merkleRoot: string;
    isWhitelisted: boolean;
  };
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProofResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { ballotId, address } = req.query;

  if (!ballotId || !address || Array.isArray(ballotId) || Array.isArray(address)) {
    return res.status(400).json({ success: false, message: 'Invalid parameters' });
  }

  try {
    // Connect to your backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/merkle/proof/${ballotId}/${address}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        message: errorData.message || 'Failed to fetch proof' 
      });
    }

    const data = await response.json();
    return res.status(200).json(data); // Pass through the data structure from backend
  } catch (error) {
    console.error('Error fetching proof:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}