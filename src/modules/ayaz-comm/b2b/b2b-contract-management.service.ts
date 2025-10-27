import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or, gte, lte } from 'drizzle-orm';

export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  description: string;
  customerId: string;
  customerName: string;
  type: 'pricing' | 'supply' | 'service' | 'framework' | 'master';
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'cancelled' | 'renewed';
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  autoRenewal: boolean;
  renewalTerms: {
    noticePeriod: number; // days
    renewalType: 'auto' | 'manual' | 'negotiation';
    priceAdjustment?: number; // percentage
    termsUpdate?: string;
  };
  pricing: ContractPricing[];
  terms: ContractTerm[];
  documents: ContractDocument[];
  milestones: ContractMilestone[];
  compliance: {
    slaRequirements: Record<string, any>;
    qualityStandards: string[];
    deliveryTerms: string;
    paymentTerms: string;
  };
  financial: {
    totalValue: number;
    currency: string;
    paymentSchedule: PaymentSchedule[];
    discounts: ContractDiscount[];
    penalties: ContractPenalty[];
  };
  approvals: ContractApproval[];
  notifications: {
    renewalReminder: number; // days before expiry
    performanceReview: string; // frequency
    complianceCheck: string; // frequency
  };
  metadata: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractPricing {
  id: string;
  contractId: string;
  productId?: string;
  categoryId?: string;
  pricingType: 'fixed' | 'discount' | 'cost_plus' | 'market_based';
  basePrice: number;
  finalPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  validFrom: Date;
  validUntil?: Date;
  conditions: string[];
  notes?: string;
}

export interface ContractTerm {
  id: string;
  contractId: string;
  category: 'payment' | 'delivery' | 'quality' | 'compliance' | 'general';
  title: string;
  description: string;
  isMandatory: boolean;
  status: 'active' | 'waived' | 'breached';
  effectiveDate: Date;
  expiryDate?: Date;
  penalty?: {
    type: 'monetary' | 'service_credit' | 'termination';
    amount?: number;
    calculation: string;
  };
}

export interface ContractDocument {
  id: string;
  contractId: string;
  name: string;
  type: 'agreement' | 'amendment' | 'appendix' | 'sla' | 'pricing' | 'other';
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: number;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface ContractMilestone {
  id: string;
  contractId: string;
  name: string;
  description: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[]; // Other milestone IDs
  deliverables: string[];
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface PaymentSchedule {
  id: string;
  contractId: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  reference?: string;
}

export interface ContractDiscount {
  id: string;
  contractId: string;
  name: string;
  type: 'volume' | 'loyalty' | 'seasonal' | 'promotional';
  discountPercentage: number;
  discountAmount?: number;
  minOrderValue?: number;
  minQuantity?: number;
  validFrom: Date;
  validUntil?: Date;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export interface ContractPenalty {
  id: string;
  contractId: string;
  name: string;
  description: string;
  type: 'late_delivery' | 'quality_issue' | 'non_compliance' | 'payment_delay';
  penaltyAmount: number;
  penaltyType: 'fixed' | 'percentage';
  calculationBasis: string;
  isActive: boolean;
  appliedCount: number;
}

export interface ContractApproval {
  id: string;
  contractId: string;
  approverId: string;
  approverName: string;
  approvalType: 'creation' | 'amendment' | 'renewal' | 'termination';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
  comments?: string;
  conditions?: string[];
  nextApproverId?: string;
}

@Injectable()
export class B2BContractManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createContract(contractData: {
    name: string;
    description: string;
    customerId: string;
    type: string;
    startDate: Date;
    endDate: Date;
    autoRenewal?: boolean;
    renewalTerms?: any;
    pricing?: any[];
    terms?: any[];
    compliance?: any;
    financial?: any;
    notifications?: any;
    metadata?: any;
  }, tenantId: string, userId: string): Promise<Contract> {

    const contractNumber = await this.generateContractNumber(tenantId);

    // Get customer name
    const customer = await this.getCustomerDetails(contractData.customerId, tenantId);

    const [contract] = await this.databaseService.drizzleClient
      .insert(this.getContractsTable())
      .values({
        id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        contractNumber,
        ...contractData,
        customerName: customer?.name || '',
        status: 'draft',
        autoRenewal: contractData.autoRenewal || false,
        renewalTerms: contractData.renewalTerms || {
          noticePeriod: 30,
          renewalType: 'manual',
          priceAdjustment: 0
        },
        approvals: [],
        notifications: contractData.notifications || {
          renewalReminder: 30,
          performanceReview: 'quarterly',
          complianceCheck: 'monthly'
        },
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear contracts cache
    await this.cacheService.del(`customer_contracts:${tenantId}:${contractData.customerId}`);
    await this.cacheService.del(`active_contracts:${tenantId}`);

    this.loggerService.log(`Contract created: ${contract.contractNumber} for customer ${contractData.customerId}`, 'B2BContractManagementService');
    return await this.getContract(contract.id);
  }

  async submitForApproval(contractId: string, approverIds: string[], tenantId: string, userId: string): Promise<void> {
    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'draft') {
      throw new BadRequestException('Only draft contracts can be submitted for approval');
    }

    // Update contract status
    await this.databaseService.drizzleClient
      .update(this.getContractsTable())
      .set({
        status: 'pending_approval',
        updatedAt: new Date()
      })
      .where(this.getContractsTable().id.eq(contractId));

    // Create approval requests
    for (const approverId of approverIds) {
      await this.createApprovalRequest({
        contractId,
        approverId,
        approvalType: 'creation',
        requestedBy: userId
      });
    }

    this.loggerService.log(`Contract submitted for approval: ${contract.contractNumber}`, 'B2BContractManagementService');
  }

  async approveContract(contractId: string, approvalData: {
    comments?: string;
    conditions?: string[];
    nextApproverId?: string;
  }, tenantId: string, userId: string): Promise<void> {

    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user is in approval chain
    const approvalRequest = await this.getPendingApproval(contractId, userId);
    if (!approvalRequest) {
      throw new BadRequestException('No pending approval request found for this user');
    }

    // Update approval
    await this.databaseService.drizzleClient
      .update(this.getContractApprovalsTable())
      .set({
        status: 'approved',
        respondedAt: new Date(),
        comments: approvalData.comments,
        conditions: approvalData.conditions
      })
      .where(this.getContractApprovalsTable().id.eq(approvalRequest.id));

    // Check if all approvals are complete
    const pendingApprovals = await this.getPendingApprovals(contractId);
    if (pendingApprovals.length === 0) {
      // Activate contract
      await this.databaseService.drizzleClient
        .update(this.getContractsTable())
        .set({
          status: 'active',
          updatedAt: new Date()
        })
        .where(this.getContractsTable().id.eq(contractId));

      this.loggerService.log(`Contract approved and activated: ${contract.contractNumber}`, 'B2BContractManagementService');
    } else if (approvalData.nextApproverId) {
      // Create next approval request
      await this.createApprovalRequest({
        contractId,
        approverId: approvalData.nextApproverId,
        approvalType: 'creation',
        requestedBy: userId
      });
    }
  }

  async rejectContract(contractId: string, rejectionData: {
    reason: string;
    comments?: string;
  }, tenantId: string, userId: string): Promise<void> {

    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Update approval
    const approvalRequest = await this.getPendingApproval(contractId, userId);
    if (approvalRequest) {
      await this.databaseService.drizzleClient
        .update(this.getContractApprovalsTable())
        .set({
          status: 'rejected',
          respondedAt: new Date(),
          comments: rejectionData.comments
        })
        .where(this.getContractApprovalsTable().id.eq(approvalRequest.id));
    }

    // Update contract status
    await this.databaseService.drizzleClient
      .update(this.getContractsTable())
      .set({
        status: 'draft', // Back to draft for revisions
        updatedAt: new Date()
      })
      .where(this.getContractsTable().id.eq(contractId));

    this.loggerService.log(`Contract rejected: ${contract.contractNumber} - ${rejectionData.reason}`, 'B2BContractManagementService');
  }

  async renewContract(contractId: string, renewalData: {
    newEndDate: Date;
    priceAdjustment?: number;
    termsUpdate?: string;
    renewalType?: string;
  }, tenantId: string, userId: string): Promise<Contract> {

    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'active' && contract.status !== 'expired') {
      throw new BadRequestException('Only active or expired contracts can be renewed');
    }

    // Check if renewal is allowed
    if (!contract.autoRenewal && contract.status === 'active') {
      throw new BadRequestException('Contract does not have auto-renewal enabled');
    }

    // Update contract
    await this.databaseService.drizzleClient
      .update(this.getContractsTable())
      .set({
        endDate: renewalData.newEndDate,
        renewalDate: renewalData.newEndDate,
        status: 'renewed',
        renewalTerms: {
          ...contract.renewalTerms,
          priceAdjustment: renewalData.priceAdjustment || contract.renewalTerms.priceAdjustment,
          termsUpdate: renewalData.termsUpdate || contract.renewalTerms.termsUpdate,
          renewalType: renewalData.renewalType || contract.renewalTerms.renewalType
        },
        updatedAt: new Date()
      })
      .where(this.getContractsTable().id.eq(contractId));

    // Update pricing if price adjustment is specified
    if (renewalData.priceAdjustment) {
      await this.adjustContractPricing(contractId, renewalData.priceAdjustment);
    }

    // Clear cache
    await this.cacheService.del(`contract:${tenantId}:${contractId}`);
    await this.cacheService.del(`customer_contracts:${tenantId}:${contract.customerId}`);

    this.loggerService.log(`Contract renewed: ${contract.contractNumber} until ${renewalData.newEndDate}`, 'B2BContractManagementService');
    return await this.getContract(contractId);
  }

  async getContractsExpiringSoon(tenantId: string, daysAhead: number = 30): Promise<Contract[]> {
    const cacheKey = `expiring_contracts:${tenantId}:${daysAhead}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    const contracts = await this.databaseService.drizzleClient
      .select()
      .from(this.getContractsTable())
      .where(and(
        this.getContractsTable().tenantId.eq(tenantId),
        this.getContractsTable().status.eq('active'),
        this.getContractsTable().endDate.lte(expiryDate),
        this.getContractsTable().autoRenewal.eq(false)
      ))
      .orderBy(this.getContractsTable().endDate);

    const fullContracts = await Promise.all(
      contracts.map(contract => this.getContract(contract.id))
    );

    await this.cacheService.set(cacheKey, fullContracts, 3600); // Cache for 1 hour
    return fullContracts;
  }

  async getContractCompliance(contractId: string): Promise<any> {
    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Calculate compliance metrics
    const compliance = {
      slaCompliance: 98.5, // Would calculate from actual performance data
      qualityCompliance: 95.2,
      deliveryCompliance: 96.8,
      paymentCompliance: 99.1,
      overallCompliance: 97.4,
      recentViolations: [], // Would fetch from violation tracking
      improvementAreas: [], // Would analyze performance trends
      recommendations: [] // Would generate based on analysis
    };

    return compliance;
  }

  async generateContractDocument(contractId: string, documentType: string, tenantId: string, userId: string): Promise<ContractDocument> {
    const contract = await this.getContract(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Generate document based on type
    const documentData = await this.generateDocumentContent(contract, documentType);

    const [document] = await this.databaseService.drizzleClient
      .insert(this.getContractDocumentsTable())
      .values({
        id: documentId,
        contractId,
        ...documentData,
        isActive: true,
        uploadedBy: userId,
        uploadedAt: new Date()
      })
      .returning();

    this.loggerService.log(`Contract document generated: ${documentType} for ${contract.contractNumber}`, 'B2BContractManagementService');
    return document;
  }

  async getCustomerContracts(customerId: string, tenantId: string): Promise<Contract[]> {
    const cacheKey = `customer_contracts:${tenantId}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const contracts = await this.databaseService.drizzleClient
      .select()
      .from(this.getContractsTable())
      .where(and(
        this.getContractsTable().customerId.eq(customerId),
        this.getContractsTable().tenantId.eq(tenantId),
        this.getContractsTable().status.neq('cancelled')
      ))
      .orderBy(this.getContractsTable().startDate);

    const fullContracts = await Promise.all(
      contracts.map(contract => this.getContract(contract.id))
    );

    await this.cacheService.set(cacheKey, fullContracts, 1800); // Cache for 30 minutes
    return fullContracts;
  }

  async getContract(contractId: string): Promise<Contract> {
    const cacheKey = `contract:${contractId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const results = await this.databaseService.drizzleClient
      .select({
        contract: this.getContractsTable(),
        pricing: this.getContractPricingTable(),
        term: this.getContractTermsTable(),
        document: this.getContractDocumentsTable(),
        milestone: this.getContractMilestonesTable(),
        payment: this.getPaymentSchedulesTable(),
        discount: this.getContractDiscountsTable(),
        penalty: this.getContractPenaltiesTable(),
        approval: this.getContractApprovalsTable()
      })
      .from(this.getContractsTable())
      .leftJoin(this.getContractPricingTable(), this.getContractPricingTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractTermsTable(), this.getContractTermsTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractDocumentsTable(), this.getContractDocumentsTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractMilestonesTable(), this.getContractMilestonesTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getPaymentSchedulesTable(), this.getPaymentSchedulesTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractDiscountsTable(), this.getContractDiscountsTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractPenaltiesTable(), this.getContractPenaltiesTable().contractId.eq(this.getContractsTable().id))
      .leftJoin(this.getContractApprovalsTable(), this.getContractApprovalsTable().contractId.eq(this.getContractsTable().id))
      .where(this.getContractsTable().id.eq(contractId));

    if (results.length === 0) return null;

    const contractData = results[0];
    const contract: Contract = {
      id: contractData.contract.id,
      contractNumber: contractData.contract.contractNumber,
      name: contractData.contract.name,
      description: contractData.contract.description,
      customerId: contractData.contract.customerId,
      customerName: contractData.contract.customerName,
      type: contractData.contract.type,
      status: contractData.contract.status,
      startDate: contractData.contract.startDate,
      endDate: contractData.contract.endDate,
      renewalDate: contractData.contract.renewalDate,
      autoRenewal: contractData.contract.autoRenewal,
      renewalTerms: contractData.contract.renewalTerms,
      pricing: results.filter(r => r.pricing).map(r => ({
        id: r.pricing.id,
        contractId: r.pricing.contractId,
        productId: r.pricing.productId,
        categoryId: r.pricing.categoryId,
        pricingType: r.pricing.pricingType,
        basePrice: r.pricing.basePrice,
        finalPrice: r.pricing.finalPrice,
        discountPercentage: r.pricing.discountPercentage,
        discountAmount: r.pricing.discountAmount,
        minimumQuantity: r.pricing.minimumQuantity,
        maximumQuantity: r.pricing.maximumQuantity,
        validFrom: r.pricing.validFrom,
        validUntil: r.pricing.validUntil,
        conditions: r.pricing.conditions || [],
        notes: r.pricing.notes
      })),
      terms: results.filter(r => r.term).map(r => ({
        id: r.term.id,
        contractId: r.term.contractId,
        category: r.term.category,
        title: r.term.title,
        description: r.term.description,
        isMandatory: r.term.isMandatory,
        status: r.term.status,
        effectiveDate: r.term.effectiveDate,
        expiryDate: r.term.expiryDate,
        penalty: r.term.penalty
      })),
      documents: results.filter(r => r.document).map(r => ({
        id: r.document.id,
        contractId: r.document.contractId,
        name: r.document.name,
        type: r.document.type,
        filePath: r.document.filePath,
        fileSize: r.document.fileSize,
        mimeType: r.document.mimeType,
        version: r.document.version,
        isActive: r.document.isActive,
        uploadedBy: r.document.uploadedBy,
        uploadedAt: r.document.uploadedAt,
        expiresAt: r.document.expiresAt
      })),
      milestones: results.filter(r => r.milestone).map(r => ({
        id: r.milestone.id,
        contractId: r.milestone.contractId,
        name: r.milestone.name,
        description: r.milestone.description,
        dueDate: r.milestone.dueDate,
        completedDate: r.milestone.completedDate,
        status: r.milestone.status,
        assignedTo: r.milestone.assignedTo,
        priority: r.milestone.priority,
        dependencies: r.milestone.dependencies || [],
        deliverables: r.milestone.deliverables || [],
        approvalRequired: r.milestone.approvalRequired,
        approvedBy: r.milestone.approvedBy,
        approvedAt: r.milestone.approvedAt
      })),
      compliance: contractData.contract.compliance || {},
      financial: contractData.contract.financial || {},
      approvals: results.filter(r => r.approval).map(r => ({
        id: r.approval.id,
        contractId: r.approval.contractId,
        approverId: r.approval.approverId,
        approverName: r.approval.approverName,
        approvalType: r.approval.approvalType,
        status: r.approval.status,
        requestedAt: r.approval.requestedAt,
        respondedAt: r.approval.respondedAt,
        comments: r.approval.comments,
        conditions: r.approval.conditions,
        nextApproverId: r.approval.nextApproverId
      })),
      notifications: contractData.contract.notifications || {},
      metadata: contractData.contract.metadata || {},
      tenantId: contractData.contract.tenantId,
      createdBy: contractData.contract.createdBy,
      updatedBy: contractData.contract.updatedBy,
      createdAt: contractData.contract.createdAt,
      updatedAt: contractData.contract.updatedAt
    };

    await this.cacheService.set(cacheKey, contract, 1800); // Cache for 30 minutes
    return contract;
  }

  async getActiveContracts(tenantId: string): Promise<Contract[]> {
    const cacheKey = `active_contracts:${tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const contracts = await this.databaseService.drizzleClient
      .select()
      .from(this.getContractsTable())
      .where(and(
        this.getContractsTable().tenantId.eq(tenantId),
        this.getContractsTable().status.eq('active')
      ))
      .orderBy(this.getContractsTable().endDate);

    const fullContracts = await Promise.all(
      contracts.map(contract => this.getContract(contract.id))
    );

    await this.cacheService.set(cacheKey, fullContracts, 1800);
    return fullContracts;
  }

  async getContractAnalytics(tenantId: string, days: number = 90): Promise<any> {
    const cacheKey = `contract_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Contract statistics
    const contractStats = await this.databaseService.drizzleClient
      .select({
        totalContracts: sql<number>`count(*)`,
        activeContracts: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        expiredContracts: sql<number>`count(*) FILTER (WHERE status = 'expired')`,
        pendingApproval: sql<number>`count(*) FILTER (WHERE status = 'pending_approval')`,
        totalValue: sql<number>`SUM(financial->'totalValue')`,
        avgContractValue: sql<number>`AVG(financial->'totalValue')`
      })
      .from(this.getContractsTable())
      .where(and(
        this.getContractsTable().tenantId.eq(tenantId),
        this.getContractsTable().createdAt.gte(startDate)
      ));

    // Renewal analytics
    const renewalStats = await this.databaseService.drizzleClient
      .select({
        contractsExpiring: sql<number>`count(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days')`,
        autoRenewals: sql<number>`count(*) FILTER (WHERE auto_renewal = true)`,
        manualRenewals: sql<number>`count(*) FILTER (WHERE auto_renewal = false)`,
        renewalSuccessRate: sql<number>`count(*) FILTER (WHERE status = 'renewed')::float / count(*) * 100`
      })
      .from(this.getContractsTable())
      .where(and(
        this.getContractsTable().tenantId.eq(tenantId),
        this.getContractsTable().status.in(['active', 'renewed'])
      ));

    const result = {
      contractStats: contractStats[0],
      renewalStats: renewalStats[0],
      topCustomersByValue: [], // Would calculate from contract data
      contractTypeDistribution: {}, // Would group by contract type
      complianceScore: 94.5, // Would calculate from compliance data
      averageContractDuration: 0 // Would calculate from start/end dates
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // Private helper methods
  private async generateContractNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(this.getContractsTable())
      .where(this.getContractsTable().contractNumber.like(`CON-${year}${month}-%`));

    const sequence = String(Number(count[0].count) + 1).padStart(4, '0');
    return `CON-${year}${month}-${sequence}`;
  }

  private async getCustomerDetails(customerId: string, tenantId: string): Promise<any> {
    const customers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().id.eq(customerId),
        this.getCustomersTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    return customers[0] || null;
  }

  private async createApprovalRequest(data: any): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(this.getContractApprovalsTable())
      .values({
        ...data,
        id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: 'pending',
        requestedAt: new Date()
      });
  }

  private async getPendingApproval(contractId: string, userId: string): Promise<any> {
    const approvals = await this.databaseService.drizzleClient
      .select()
      .from(this.getContractApprovalsTable())
      .where(and(
        this.getContractApprovalsTable().contractId.eq(contractId),
        this.getContractApprovalsTable().approverId.eq(userId),
        this.getContractApprovalsTable().status.eq('pending')
      ))
      .limit(1);

    return approvals[0] || null;
  }

  private async getPendingApprovals(contractId: string): Promise<any[]> {
    return await this.databaseService.drizzleClient
      .select()
      .from(this.getContractApprovalsTable())
      .where(and(
        this.getContractApprovalsTable().contractId.eq(contractId),
        this.getContractApprovalsTable().status.eq('pending')
      ));
  }

  private async adjustContractPricing(contractId: string, priceAdjustment: number): Promise<void> {
    // Adjust all pricing in the contract
    await this.databaseService.drizzleClient
      .update(this.getContractPricingTable())
      .set({
        finalPrice: sql`${this.getContractPricingTable().basePrice} * (1 + ${priceAdjustment} / 100)`,
        discountPercentage: sql`GREATEST(0, ${this.getContractPricingTable().discountPercentage} - ${priceAdjustment})`,
        updatedAt: new Date()
      })
      .where(this.getContractPricingTable().contractId.eq(contractId));
  }

  private async generateDocumentContent(contract: Contract, documentType: string): Promise<any> {
    // Generate document content based on type
    // In real implementation, this would use templates and merge contract data

    const documentName = `${contract.contractNumber}_${documentType}_${new Date().toISOString().split('T')[0]}`;

    return {
      name: documentName,
      type: documentType,
      filePath: `/contracts/${contract.id}/${documentName}.pdf`,
      fileSize: 1024000, // Mock size
      mimeType: 'application/pdf',
      version: 1
    };
  }

  private getContractsTable() {
    return sql`b2b_contracts`;
  }

  private getContractPricingTable() {
    return sql`b2b_contract_pricing`;
  }

  private getContractTermsTable() {
    return sql`b2b_contract_terms`;
  }

  private getContractDocumentsTable() {
    return sql`b2b_contract_documents`;
  }

  private getContractMilestonesTable() {
    return sql`b2b_contract_milestones`;
  }

  private getPaymentSchedulesTable() {
    return sql`b2b_payment_schedules`;
  }

  private getContractDiscountsTable() {
    return sql`b2b_contract_discounts`;
  }

  private getContractPenaltiesTable() {
    return sql`b2b_contract_penalties`;
  }

  private getContractApprovalsTable() {
    return sql`b2b_contract_approvals`;
  }

  private getCustomersTable() {
    return sql`customers`;
  }
}
