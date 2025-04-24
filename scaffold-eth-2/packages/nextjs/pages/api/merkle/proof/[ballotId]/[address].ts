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