import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuppliersPage from '../suppliers/index';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock API calls
global.fetch = jest.fn();

describe('SuppliersPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render suppliers page', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          suppliers: [
            {
              id: '1',
              name: 'Test Supplier',
              code: 'SUP-001',
              contactPerson: 'John Doe',
              email: 'john@test.com',
              phone: '+90 555 123 4567',
              status: 'active',
              creditLimit: 10000,
              balance: 5000,
            },
          ],
        },
      }),
    });

    render(<SuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Tedarikçi Yönetimi')).toBeInTheDocument();
    });
  });

  it('should fetch suppliers on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { suppliers: [] },
      }),
    });

    render(<SuppliersPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/suppliers'),
        expect.any(Object)
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<SuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Tedarikçi Yönetimi')).toBeInTheDocument();
    });
  });
});

