import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock API calls
global.fetch = jest.fn();

describe('Finance Module', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Payments Page', () => {
    it('should connect to backend API', async () => {
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
  });

  describe('Accounting Page', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { entries: [] },
        }),
      });

      const AccountingPage = (await import('../erp/accounting/index')).default;
      render(<AccountingPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/proxy/erp/accounting'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Financial Reports Page', () => {
    it('should connect to backend API', async () => {
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
});

