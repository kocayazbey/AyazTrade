import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Mock user data
  const mockUser = {
    id: '1',
    email: 'admin@ayaztrade.com',
    firstName: 'Admin',
    lastName: 'User',
    role: {
      id: 'super_admin',
      name: 'super_admin',
      displayName: 'Süper Yönetici',
      permissions: ['all']
    },
    avatar: '/avatars/admin.jpg',
    lastLogin: new Date().toISOString()
  };

  res.status(200).json(mockUser);
}
