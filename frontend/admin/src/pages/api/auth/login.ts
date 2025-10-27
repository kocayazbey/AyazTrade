import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Mock login validation
  const mockUsers = [
    {
      id: '1',
      email: 'admin@ayaztrade.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      permissions: ['all'],
      avatar: '/avatars/admin.jpg'
    },
    {
      id: '2',
      email: 'product@ayaztrade.com',
      firstName: 'Product',
      lastName: 'Manager',
      role: 'product_manager',
      permissions: ['view_products', 'add_edit_products', 'manage_categories'],
      avatar: '/avatars/product.jpg'
    }
  ];

  const user = mockUsers.find(u => u.email === email && password === 'password');

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Geçersiz email veya şifre' 
    });
  }

  // Mock token
  const token = 'mock-jwt-token-' + Date.now();

  res.status(200).json({
    success: true,
    data: {
      user,
      token
    }
  });
}
