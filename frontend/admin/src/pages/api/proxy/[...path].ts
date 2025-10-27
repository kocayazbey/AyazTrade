import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : [path];
  const apiPath = pathArray.join('/');
  
  const url = `${API_BASE_URL}/api/v1/${apiPath}`;
  
  try {
    // Get authorization token from cookie or header
    let authToken = req.headers.authorization?.replace('Bearer ', '');

    // If no header token, try to get from cookie
    if (!authToken) {
      const cookies = parse(req.headers.cookie || '');
      authToken = cookies.accessToken;
    }

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(500).json({
      success: false,
      message: 'API proxy error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
