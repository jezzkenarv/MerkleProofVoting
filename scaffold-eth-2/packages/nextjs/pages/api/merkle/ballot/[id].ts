// Next.js API route handler that creates a backend endpoint for fetching ballot info
// Request handling: API endpoints that only accepts GET requests and rejects any other HTTP methods with a 405 Method Not Allowed error
// Extracts the ballot ID from the request query parameters and validates that the ID exists and is not an array
// It forwards the request to another server (defined by NEXT_PUBLIC_API_URL environment variable) and specifically targets the /merkle/ballot/${id} endpoint on that server

// Part of the application's API layer - creates the /api/ballot/[id] endpoint that the frontend components use to fetch ballot information


import type { NextApiRequest, NextApiResponse } from 'next';

type BallotResponse = {
  success: boolean;
  data?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BallotResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ballot ID' });
  }

  try {
    // Connect to your backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/merkle/ballot/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        message: errorData.message || `Failed to fetch ballot ${id}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ballot:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}