import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock API calls
global.fetch = jest.fn();

describe('Warehouse Module', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Inventory Page', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { inventory: [] },
        }),
      });

      const InventoryPage = (await import('../wms/inventory/index')).default;
      render(<InventoryPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/wms/inventory'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Transfers Page', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { transfers: [] },
        }),
      });

      const TransfersPage = (await import('../wms/transfers/index')).default;
      render(<TransfersPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/wms/transfers'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Warehouse Page', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { warehouses: [] },
        }),
      });

      const WarehousePage = (await import('../wms/warehouse/index')).default;
      render(<WarehousePage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/wms/warehouses'),
          expect.any(Object)
        );
      });
    });
  });
});

