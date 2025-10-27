import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock API calls
global.fetch = jest.fn();

describe('Frontend Modules Integration Tests', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Product Module', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { products: [] },
        }),
      });

      const ProductsPage = (await import('../products/index')).default;
      render(<ProductsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/products'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Sales Module (Orders)', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { orders: [] },
        }),
      });

      const OrdersPage = (await import('../orders/index')).default;
      render(<OrdersPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/orders'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Supplier Module', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { suppliers: [] },
        }),
      });

      const SuppliersPage = (await import('../suppliers/index')).default;
      render(<SuppliersPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/suppliers'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Finance Module', () => {
    it('should connect invoices to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { invoices: [] },
        }),
      });

      const InvoicesPage = (await import('../erp/invoices/index')).default;
      render(<InvoicesPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/erp/invoices'),
          expect.any(Object)
        );
      });
    });

    it('should connect payments to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { payments: [] },
        }),
      });

      const PaymentsPage = (await import('../erp/payments/index')).default;
      render(<PaymentsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/erp/payments'),
          expect.any(Object)
        );
      });
    });

    it('should connect financial reports to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { reports: [] },
        }),
      });

      const FinancialReportsPage = (await import('../erp/financial-reports/index')).default;
      render(<FinancialReportsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/erp/financial-reports'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Warehouse Module', () => {
    it('should connect warehouse to backend API', async () => {
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

    it('should connect inventory to backend API', async () => {
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

  describe('Error Handling', () => {
    it('should handle API errors gracefully for products', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const ProductsPage = (await import('../products/index')).default;
      render(<ProductsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Ürün Yönetimi/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully for orders', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const OrdersPage = (await import('../orders/index')).default;
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Siparişler/i)).toBeInTheDocument();
      });
    });
  });
});

