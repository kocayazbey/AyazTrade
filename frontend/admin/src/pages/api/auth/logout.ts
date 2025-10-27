import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Mock logout - just return success
  res.status(200).json({
    success: true,
    message: 'Çıkış başarılı'
  });
}
