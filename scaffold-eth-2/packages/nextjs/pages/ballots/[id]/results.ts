import type { NextApiRequest, NextApiResponse } from 'next';

type ResultsResponse = {
  success: boolean;
  data?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResultsResponse>
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
    const response = await fetch(`${apiUrl}/merkle/ballot/${id}/results`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        success: false, 
        message: errorData.message || `Failed to fetch results for ballot ${id}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ballot results:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}