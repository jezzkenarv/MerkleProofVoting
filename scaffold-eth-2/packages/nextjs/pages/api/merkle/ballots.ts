// Next.js API route handler that fetches a list of all available ballots from the backend
// Sets up the /api/merkle/ballots endpoint in Next.js app and only accepts GET requests

// Backend communication:
// Acts as a proxy between frontend and backend 
// Makes a request to ${apiUrl}/merkle/ballots on backend server
// The backend queries database or blockchain for all active ballots

// Returns a structured JSON response containing:
// success: Boolean indicating if the request was successful
// data: An array of ballot objects (when successful)
// message: Error information (when unsuccessful)

// This is the entry point for the app's ballot listing feature
// It is used by the component that displays all available ballots to users, allowing them to select which ballot they want to participate in


import type { NextApiRequest, NextApiResponse } from 'next';

type BallotListResponse = {
  success: boolean;
  data?: any[];
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BallotListResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Connect to your backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/merkle/ballots`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        message: errorData.message || 'Failed to fetch ballots' 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ballots:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}