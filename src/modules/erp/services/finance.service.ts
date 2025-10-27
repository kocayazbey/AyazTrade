import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceService {
  async getGLAccounts(tenantId: string, accountType?: string) {
    return {
      data: [
        {
          id: '1',
          code: '1000',
          name: 'Cash',
          type: 'asset',
          balance: 50000
        },
        {
          id: '2',
          code: '2000',
          name: 'Accounts Payable',
          type: 'liability',
          balance: 25000
        }
      ],
      total: 2
    };
  }

  async createGLAccount(data: any, tenantId: string) {
    return {
      id: Date.now().toString(),
      ...data,
      tenantId,
      createdAt: new Date().toISOString()
    };
  }

  async getTransactions(tenantId: string, filters: any) {
    return {
      data: [
        {
          id: '1',
          date: new Date().toISOString(),
          description: 'Sales Revenue',
          debit: 1000,
          credit: 0,
          account: 'Cash'
        }
      ],
      total: 1
    };
  }

  async createTransaction(data: any, tenantId: string, userId: string) {
    return {
      id: Date.now().toString(),
      ...data,
      tenantId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  async createJournalEntry(data: any, tenantId: string, userId: string) {
    return {
      id: Date.now().toString(),
      ...data,
      tenantId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  async getIncomeExpenseSummary(tenantId: string, startDate: Date, endDate: Date) {
    return {
      income: 150000,
      expenses: 120000,
      netIncome: 30000,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  }

  async getFinancialReports(tenantId: string, reportType: string, startDate: Date, endDate: Date) {
    const reports = {
      'income-statement': {
        title: 'Gelir Tablosu',
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        data: {
          revenue: {
            sales: 150000,
            other: 5000,
            total: 155000
          },
          expenses: {
            cogs: 80000,
            operating: 35000,
            administrative: 15000,
            total: 130000
          },
          netIncome: 25000
        }
      },
      'balance-sheet': {
        title: 'Bilanço',
        date: endDate.toISOString(),
        data: {
          assets: {
            current: {
              cash: 50000,
              accountsReceivable: 25000,
              inventory: 30000,
              total: 105000
            },
            fixed: {
              equipment: 100000,
              buildings: 200000,
              total: 300000
            },
            total: 405000
          },
          liabilities: {
            current: {
              accountsPayable: 20000,
              shortTermDebt: 15000,
              total: 35000
            },
            longTerm: {
              longTermDebt: 100000,
              total: 100000
            },
            total: 135000
          },
          equity: {
            capital: 200000,
            retainedEarnings: 70000,
            total: 270000
          }
        }
      },
      'cash-flow': {
        title: 'Nakit Akış Tablosu',
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        data: {
          operating: {
            netIncome: 25000,
            depreciation: 5000,
            workingCapitalChanges: -2000,
            total: 28000
          },
          investing: {
            equipmentPurchases: -10000,
            total: -10000
          },
          financing: {
            debtIssuance: 5000,
            dividends: -5000,
            total: 0
          },
          netCashFlow: 18000
        }
      }
    };

    return {
      success: true,
      data: reports[reportType] || reports['income-statement'],
      message: 'Financial report generated successfully'
    };
  }
}