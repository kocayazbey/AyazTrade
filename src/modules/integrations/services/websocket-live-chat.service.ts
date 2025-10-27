import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface LiveChatMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName?: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'typing' | 'system';
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    type: string;
    url: string;
  }>;
  metadata?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

interface LiveChatConversation {
  id: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  agentId?: string;
  agentName?: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'active' | 'resolved' | 'closed' | 'transferred';
  subject?: string;
  tags: string[];
  source: 'website' | 'mobile' | 'whatsapp' | 'email' | 'phone';
  channel: string;
  tenantId?: string;
  metadata: Record<string, any>;
  messages: number;
  unreadCount: number;
  lastMessageAt?: Date;
  lastActivityAt: Date;
  assignedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  maxConcurrentChats: number;
  currentChats: number;
  skills: string[];
  languages: string[];
  tenantId?: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatQueue {
  id: string;
  conversationId: string;
  priority: number;
  department: string;
  skills: string[];
  languages: string[];
  assignedAt?: Date;
  estimatedWaitTime: number;
  createdAt: Date;
}

interface ChatDepartment {
  id: string;
  name: string;
  description: string;
  agents: string[];
  maxWaitTime: number;
  operatingHours: {
    start: string;
    end: string;
    timezone: string;
    days: string[];
  };
  autoAssignment: boolean;
  skills: string[];
  languages: string[];
  tenantId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebSocketLiveChatService {
  private readonly logger = new Logger(WebSocketLiveChatService.name);

  private activeConversations: Map<string, LiveChatConversation> = new Map();
  private chatQueues: Map<string, ChatQueue> = new Map();
  private onlineAgents: Map<string, ChatAgent> = new Map();
  private typingIndicators: Map<string, { userId: string; timestamp: Date }> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {
    // Start chat management processes
    this.startChatManagement();
    this.startAgentStatusUpdate();
    this.startQueueManagement();
  }

  async initiateChat(chatData: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    subject?: string;
    department?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    source?: 'website' | 'mobile' | 'whatsapp' | 'email' | 'phone';
    channel?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    conversationId?: string;
    estimatedWaitTime?: number;
    error?: string;
  }> {
    try {
      const conversationId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create conversation
      const conversation: LiveChatConversation = {
        id: conversationId,
        customerName: chatData.customerName,
        customerEmail: chatData.customerEmail,
        customerPhone: chatData.customerPhone,
        department: chatData.department || 'general',
        priority: chatData.priority || 'medium',
        status: 'waiting',
        subject: chatData.subject,
        tags: [],
        source: chatData.source || 'website',
        channel: chatData.channel || 'web',
        tenantId: chatData.tenantId,
        metadata: chatData.metadata || {},
        messages: 0,
        unreadCount: 0,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.saveConversationToDB(conversation);

      // Add to queue
      await this.addToQueue(conversationId, conversation);

      // Find available agent
      const availableAgent = await this.findAvailableAgent(conversation);

      if (availableAgent) {
        await this.assignAgent(conversationId, availableAgent.id);
        conversation.agentId = availableAgent.id;
        conversation.agentName = availableAgent.name;
        conversation.status = 'active';
        conversation.assignedAt = new Date();
      }

      this.activeConversations.set(conversationId, conversation);
      await this.updateConversationInDB(conversation);

      // Send system message
      await this.sendSystemMessage(conversationId, {
        type: 'system',
        message: availableAgent
          ? `Müşteri temsilcimiz ${availableAgent.name} ile görüşmeye yönlendirildiniz.`
          : 'Sohbet kuyruğuna eklendiniz. En kısa sürede size yardımcı olacağız.'
      });

      // Notify agents
      await this.notifyAgents(conversation);

      const estimatedWaitTime = availableAgent ? 0 : await this.calculateWaitTime(conversation.department);

      this.logger.log(`Chat initiated: ${conversationId} - ${chatData.customerName || 'Anonymous'}`);
      return {
        success: true,
        conversationId,
        estimatedWaitTime
      };

    } catch (error) {
      this.logger.error('Failed to initiate chat', error);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(messageData: {
    conversationId: string;
    senderId?: string;
    senderType: 'customer' | 'agent' | 'system';
    senderName?: string;
    message: string;
    messageType?: 'text' | 'image' | 'file' | 'typing' | 'system';
    attachments?: Array<{
      id: string;
      filename: string;
      size: number;
      type: string;
      url: string;
    }>;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const conversation = this.activeConversations.get(messageData.conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const chatMessage: LiveChatMessage = {
        id: messageId,
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        senderType: messageData.senderType,
        senderName: messageData.senderName,
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        attachments: messageData.attachments,
        metadata: messageData.metadata,
        read: false,
        edited: false,
        deleted: false,
        createdAt: new Date()
      };

      // Save message to database
      await this.saveMessageToDB(chatMessage);

      // Update conversation
      conversation.messages++;
      conversation.lastMessageAt = new Date();
      conversation.lastActivityAt = new Date();

      if (messageData.senderType === 'customer') {
        conversation.unreadCount++;
      }

      await this.updateConversationInDB(conversation);

      // Handle typing indicator
      if (messageData.messageType === 'typing') {
        await this.handleTypingIndicator(messageData.conversationId, messageData.senderId, true);
        return { success: true, messageId };
      }

      // Broadcast message to conversation participants
      await this.broadcastToConversation(messageData.conversationId, {
        type: 'chat_message',
        data: chatMessage
      });

      // Notify agents if customer message
      if (messageData.senderType === 'customer') {
        await this.notifyAgentsAboutMessage(conversation);
      }

      this.logger.log(`Message sent in chat ${messageData.conversationId}: ${messageId}`);
      return { success: true, messageId };

    } catch (error) {
      this.logger.error('Failed to send message', error);
      return { success: false, error: error.message };
    }
  }

  async joinConversation(conversationId: string, agentId: string): Promise<{
    success: boolean;
    conversation?: LiveChatConversation;
    messages?: LiveChatMessage[];
    error?: string;
  }> {
    try {
      const conversation = this.activeConversations.get(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Assign agent to conversation
      conversation.agentId = agentId;
      conversation.agentName = await this.getAgentName(agentId);
      conversation.status = 'active';
      conversation.assignedAt = new Date();
      conversation.unreadCount = 0; // Reset unread count for agent

      await this.updateConversationInDB(conversation);
      await this.removeFromQueue(conversationId);

      // Get recent messages
      const messages = await this.getConversationMessages(conversationId, 50);

      // Notify customer
      await this.sendSystemMessage(conversationId, {
        type: 'system',
        message: `Müşteri temsilcimiz ${conversation.agentName} ile görüşmeye başladınız.`
      });

      // Broadcast agent joined event
      await this.broadcastToConversation(conversationId, {
        type: 'agent_joined',
        data: {
          agentId,
          agentName: conversation.agentName,
          joinedAt: new Date()
        }
      });

      this.logger.log(`Agent ${agentId} joined conversation ${conversationId}`);
      return {
        success: true,
        conversation,
        messages
      };

    } catch (error) {
      this.logger.error('Failed to join conversation', error);
      return { success: false, error: error.message };
    }
  }

  async leaveConversation(conversationId: string, agentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const conversation = this.activeConversations.get(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Unassign agent
      conversation.agentId = undefined;
      conversation.agentName = undefined;
      conversation.status = 'waiting';

      await this.updateConversationInDB(conversation);
      await this.addToQueue(conversationId, conversation);

      // Notify customer
      await this.sendSystemMessage(conversationId, {
        type: 'system',
        message: 'Müşteri temsilcimiz geçici olarak ayrıldı. En kısa sürede başka bir temsilci size yardımcı olacak.'
      });

      // Broadcast agent left event
      await this.broadcastToConversation(conversationId, {
        type: 'agent_left',
        data: {
          agentId,
          leftAt: new Date()
        }
      });

      this.logger.log(`Agent ${agentId} left conversation ${conversationId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to leave conversation', error);
      return { success: false, error: error.message };
    }
  }

  async closeConversation(conversationId: string, agentId: string, resolution?: {
    status: 'resolved' | 'closed';
    notes?: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const conversation = this.activeConversations.get(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.status = resolution?.status || 'closed';
      conversation.resolvedAt = resolution?.status === 'resolved' ? new Date() : undefined;
      conversation.closedAt = new Date();
      conversation.tags = [...(conversation.tags || []), ...(resolution?.tags || [])];

      await this.updateConversationInDB(conversation);
      await this.removeFromQueue(conversationId);

      // Send final system message
      await this.sendSystemMessage(conversationId, {
        type: 'system',
        message: resolution?.status === 'resolved'
          ? 'Sohbetiniz çözüldü olarak işaretlendi. İyi günler dileriz!'
          : 'Sohbetiniz kapatıldı. İyi günler dileriz!'
      });

      // Broadcast conversation closed event
      await this.broadcastToConversation(conversationId, {
        type: 'conversation_closed',
        data: {
          closedBy: agentId,
          closedAt: new Date(),
          resolution: resolution?.notes
        }
      });

      // Remove from active conversations after a delay
      setTimeout(() => {
        this.activeConversations.delete(conversationId);
      }, 30000); // Keep for 30 seconds for final messages

      this.logger.log(`Conversation closed: ${conversationId} by agent ${agentId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to close conversation', error);
      return { success: false, error: error.message };
    }
  }

  async transferConversation(conversationId: string, fromAgentId: string, toAgentId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const conversation = this.activeConversations.get(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const previousAgentName = conversation.agentName;
      conversation.agentId = toAgentId;
      conversation.agentName = await this.getAgentName(toAgentId);
      conversation.status = 'transferred';

      await this.updateConversationInDB(conversation);

      // Notify customer
      await this.sendSystemMessage(conversationId, {
        type: 'system',
        message: `Sohbetiniz ${previousAgentName} temsilcisinden ${conversation.agentName} temsilcisine aktarıldı.`
      });

      // Broadcast transfer event
      await this.broadcastToConversation(conversationId, {
        type: 'conversation_transferred',
        data: {
          fromAgentId,
          toAgentId,
          reason,
          transferredAt: new Date()
        }
      });

      this.logger.log(`Conversation transferred: ${conversationId} from ${fromAgentId} to ${toAgentId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to transfer conversation', error);
      return { success: false, error: error.message };
    }
  }

  async setAgentStatus(agentId: string, status: 'online' | 'away' | 'busy' | 'offline'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const agent = this.onlineAgents.get(agentId);

      if (agent) {
        agent.status = status;
        agent.lastActivityAt = new Date();

        await this.updateAgentInDB(agent);
        this.onlineAgents.set(agentId, agent);

        // Broadcast agent status change
        await this.broadcastToAgents({
          type: 'agent_status_changed',
          data: {
            agentId,
            status,
            timestamp: new Date()
          }
        });

        // Update agent availability for queue assignment
        await this.updateAgentAvailability(agentId, status);

        this.logger.log(`Agent status updated: ${agentId} - ${status}`);
        return { success: true };
      }

      return { success: false, error: 'Agent not found' };

    } catch (error) {
      this.logger.error('Failed to set agent status', error);
      return { success: false, error: error.message };
    }
  }

  async getAgentDashboard(agentId: string): Promise<{
    activeConversations: number;
    queuePosition: number;
    averageWaitTime: number;
    departmentStats: Record<string, number>;
    performance: {
      messagesPerHour: number;
      resolutionRate: number;
      customerSatisfaction: number;
    };
  }> {
    try {
      // Get active conversations for agent
      const activeChats = Array.from(this.activeConversations.values()).filter(
        conv => conv.agentId === agentId && conv.status === 'active'
      ).length;

      // Get queue position
      const queuePosition = await this.getAgentQueuePosition(agentId);

      // Get department stats
      const departmentStats = await this.getDepartmentStats();

      // Get performance metrics
      const performance = await this.getAgentPerformance(agentId);

      return {
        activeConversations: activeChats,
        queuePosition,
        averageWaitTime: await this.getAverageWaitTime(),
        departmentStats,
        performance
      };

    } catch (error) {
      this.logger.error('Failed to get agent dashboard', error);
      return {
        activeConversations: 0,
        queuePosition: 0,
        averageWaitTime: 0,
        departmentStats: {},
        performance: {
          messagesPerHour: 0,
          resolutionRate: 0,
          customerSatisfaction: 0
        }
      };
    }
  }

  async getConversationHistory(filters?: {
    agentId?: string;
    department?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    customerEmail?: string;
  }): Promise<LiveChatConversation[]> {
    try {
      let query = 'SELECT * FROM live_chat_conversations WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.agentId) {
        query += ` AND agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters?.department) {
        query += ` AND department = $${paramIndex}`;
        params.push(filters.department);
        paramIndex++;
      }

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      if (filters?.customerEmail) {
        query += ` AND customer_email = $${paramIndex}`;
        params.push(filters.customerEmail);
        paramIndex++;
      }

      query += ' ORDER BY last_activity_at DESC LIMIT 100';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        lastMessageAt: row.last_message_at,
        lastActivityAt: row.last_activity_at,
        assignedAt: row.assigned_at,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get conversation history', error);
      return [];
    }
  }

  async searchConversations(query: string, filters?: {
    department?: string;
    agentId?: string;
    status?: string;
  }): Promise<LiveChatConversation[]> {
    try {
      const searchTerm = `%${query}%`;

      let sqlQuery = `
        SELECT * FROM live_chat_conversations
        WHERE (customer_name ILIKE $1 OR customer_email ILIKE $1 OR subject ILIKE $1)
      `;
      const params = [searchTerm];
      let paramIndex = 2;

      if (filters?.department) {
        sqlQuery += ` AND department = $${paramIndex}`;
        params.push(filters.department);
        paramIndex++;
      }

      if (filters?.agentId) {
        sqlQuery += ` AND agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters?.status) {
        sqlQuery += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      sqlQuery += ' ORDER BY last_activity_at DESC LIMIT 50';

      const result = await this.db.execute(sqlQuery, params);

      return result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        lastMessageAt: row.last_message_at,
        lastActivityAt: row.last_activity_at,
        assignedAt: row.assigned_at,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to search conversations', error);
      return [];
    }
  }

  private async saveConversationToDB(conversation: LiveChatConversation): Promise<void> {
    await this.db.execute(`
      INSERT INTO live_chat_conversations (
        id, customer_id, customer_name, customer_email, customer_phone,
        agent_id, agent_name, department, priority, status, subject, tags,
        source, channel, tenant_id, metadata, messages, unread_count,
        last_message_at, last_activity_at, assigned_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    `, [
      conversation.id,
      conversation.customerId,
      conversation.customerName,
      conversation.customerEmail,
      conversation.customerPhone,
      conversation.agentId,
      conversation.agentName,
      conversation.department,
      conversation.priority,
      conversation.status,
      conversation.subject,
      JSON.stringify(conversation.tags),
      conversation.source,
      conversation.channel,
      conversation.tenantId,
      JSON.stringify(conversation.metadata),
      conversation.messages,
      conversation.unreadCount,
      conversation.lastMessageAt,
      conversation.lastActivityAt,
      conversation.assignedAt,
      conversation.createdAt,
      conversation.updatedAt
    ]);
  }

  private async updateConversationInDB(conversation: LiveChatConversation): Promise<void> {
    await this.db.execute(`
      UPDATE live_chat_conversations SET
        agent_id = $1, agent_name = $2, status = $3, tags = $4,
        messages = $5, unread_count = $6, last_message_at = $7,
        last_activity_at = $8, assigned_at = $9, resolved_at = $10,
        closed_at = $11, updated_at = $12
      WHERE id = $13
    `, [
      conversation.agentId,
      conversation.agentName,
      conversation.status,
      JSON.stringify(conversation.tags),
      conversation.messages,
      conversation.unreadCount,
      conversation.lastMessageAt,
      conversation.lastActivityAt,
      conversation.assignedAt,
      conversation.resolvedAt,
      conversation.closedAt,
      new Date(),
      conversation.id
    ]);
  }

  private async saveMessageToDB(message: LiveChatMessage): Promise<void> {
    await this.db.execute(`
      INSERT INTO live_chat_messages (
        id, conversation_id, sender_id, sender_type, sender_name,
        message, message_type, attachments, metadata, read, edited,
        deleted, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      message.id,
      message.conversationId,
      message.senderId,
      message.senderType,
      message.senderName,
      message.message,
      message.messageType,
      JSON.stringify(message.attachments || []),
      JSON.stringify(message.metadata || {}),
      message.read,
      message.edited,
      message.deleted,
      message.createdAt
    ]);
  }

  private async sendSystemMessage(conversationId: string, systemMessage: {
    type: string;
    message: string;
  }): Promise<void> {
    await this.sendMessage({
      conversationId,
      senderType: 'system',
      message: systemMessage.message,
      messageType: 'system',
      metadata: { systemType: systemMessage.type }
    });
  }

  private async broadcastToConversation(conversationId: string, eventData: any): Promise<void> {
    // Mock WebSocket broadcast to conversation participants
    this.logger.log(`Broadcasting to conversation ${conversationId}:`, eventData);

    // In real implementation, this would use Socket.IO or WebSocket
    // Example: this.socketServer.to(`conversation:${conversationId}`).emit('chat_event', eventData);
  }

  private async broadcastToAgents(eventData: any): Promise<void> {
    // Mock WebSocket broadcast to all agents
    this.logger.log('Broadcasting to agents:', eventData);

    // In real implementation: this.socketServer.to('agents').emit('agent_event', eventData);
  }

  private async notifyAgents(conversation: LiveChatConversation): Promise<void> {
    await this.broadcastToAgents({
      type: 'new_conversation',
      data: {
        conversationId: conversation.id,
        customerName: conversation.customerName,
        department: conversation.department,
        priority: conversation.priority,
        createdAt: conversation.createdAt
      }
    });
  }

  private async notifyAgentsAboutMessage(conversation: LiveChatConversation): Promise<void> {
    await this.broadcastToAgents({
      type: 'new_message',
      data: {
        conversationId: conversation.id,
        customerName: conversation.customerName,
        agentId: conversation.agentId,
        messageCount: conversation.messages
      }
    });
  }

  private async addToQueue(conversationId: string, conversation: LiveChatConversation): Promise<void> {
    const queueEntry: ChatQueue = {
      id: `queue-${conversationId}`,
      conversationId,
      priority: this.getPriorityWeight(conversation.priority),
      department: conversation.department,
      skills: [],
      languages: ['tr'],
      estimatedWaitTime: await this.calculateWaitTime(conversation.department),
      createdAt: new Date()
    };

    this.chatQueues.set(queueEntry.id, queueEntry);
    await this.saveQueueEntryToDB(queueEntry);

    // Start queue assignment process
    this.processQueueAssignment();
  }

  private async removeFromQueue(conversationId: string): Promise<void> {
    const queueId = `queue-${conversationId}`;
    this.chatQueues.delete(queueId);
    await this.removeQueueEntryFromDB(queueId);
  }

  private async findAvailableAgent(conversation: LiveChatConversation): Promise<ChatAgent | null> {
    // Find online agents in the same department
    for (const [agentId, agent] of this.onlineAgents) {
      if (agent.status === 'online' &&
          agent.department === conversation.department &&
          agent.currentChats < agent.maxConcurrentChats) {
        return agent;
      }
    }

    // Find any available online agent
    for (const [agentId, agent] of this.onlineAgents) {
      if (agent.status === 'online' &&
          agent.currentChats < agent.maxConcurrentChats) {
        return agent;
      }
    }

    return null;
  }

  private async assignAgent(conversationId: string, agentId: string): Promise<void> {
    const agent = this.onlineAgents.get(agentId);
    if (agent) {
      agent.currentChats++;
      await this.updateAgentInDB(agent);
      this.onlineAgents.set(agentId, agent);
    }
  }

  private async updateAgentAvailability(agentId: string, status: string): Promise<void> {
    const agent = this.onlineAgents.get(agentId);
    if (agent) {
      if (status === 'offline') {
        // Remove agent from all conversations
        for (const [conversationId, conversation] of this.activeConversations) {
          if (conversation.agentId === agentId) {
            conversation.agentId = undefined;
            conversation.agentName = undefined;
            conversation.status = 'waiting';
            await this.updateConversationInDB(conversation);
            await this.addToQueue(conversationId, conversation);
          }
        }
        this.onlineAgents.delete(agentId);
      }
    }
  }

  private async getAgentName(agentId: string): Promise<string> {
    const agent = this.onlineAgents.get(agentId);
    return agent?.name || agentId;
  }

  private async getConversationMessages(conversationId: string, limit: number = 100): Promise<LiveChatMessage[]> {
    const result = await this.db.execute(`
      SELECT * FROM live_chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [conversationId, limit]);

    return result.rows.reverse().map(row => ({
      ...row,
      attachments: JSON.parse(row.attachments || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      readAt: row.read_at,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at
    }));
  }

  private async handleTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    if (isTyping) {
      this.typingIndicators.set(conversationId, {
        userId,
        timestamp: new Date()
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        this.typingIndicators.delete(conversationId);
      }, 3000);
    } else {
      this.typingIndicators.delete(conversationId);
    }

    await this.broadcastToConversation(conversationId, {
      type: 'typing_indicator',
      data: {
        userId,
        isTyping,
        timestamp: new Date()
      }
    });
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'urgent': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  private async calculateWaitTime(department: string): Promise<number> {
    // Calculate estimated wait time based on queue and available agents
    const departmentQueues = Array.from(this.chatQueues.values()).filter(q => q.department === department);
    const availableAgents = Array.from(this.onlineAgents.values()).filter(a =>
      a.status === 'online' && a.department === department
    );

    const avgAgents = availableAgents.length || 1;
    const queueSize = departmentQueues.length;

    return Math.ceil((queueSize / avgAgents) * 2); // 2 minutes per conversation estimate
  }

  private async getAgentQueuePosition(agentId: string): Promise<number> {
    const agent = this.onlineAgents.get(agentId);
    if (!agent) return 0;

    const departmentQueues = Array.from(this.chatQueues.values()).filter(q => q.department === agent.department);
    return departmentQueues.length;
  }

  private async getDepartmentStats(): Promise<Record<string, number>> {
    const result = await this.db.execute(`
      SELECT department, COUNT(*) as count, AVG(messages) as avg_messages
      FROM live_chat_conversations
      WHERE created_at >= $1
      GROUP BY department
    `, [this.getPeriodStartDate('day')]);

    const stats: Record<string, number> = {};
    for (const row of result.rows) {
      stats[row.department] = parseInt(row.count);
    }

    return stats;
  }

  private async getAgentPerformance(agentId: string): Promise<{
    messagesPerHour: number;
    resolutionRate: number;
    customerSatisfaction: number;
  }> {
    // Mock performance data
    return {
      messagesPerHour: Math.floor(Math.random() * 50) + 20,
      resolutionRate: Math.floor(Math.random() * 30) + 70,
      customerSatisfaction: Math.floor(Math.random() * 20) + 80
    };
  }

  private async getAverageWaitTime(): Promise<number> {
    const result = await this.db.execute(`
      SELECT AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))/60) as avg_wait
      FROM live_chat_conversations
      WHERE assigned_at IS NOT NULL AND created_at >= $1
    `, [this.getPeriodStartDate('day')]);

    return parseFloat(result.rows[0]?.avg_wait) || 0;
  }

  private async saveQueueEntryToDB(queueEntry: ChatQueue): Promise<void> {
    await this.db.execute(`
      INSERT INTO chat_queues (id, conversation_id, priority, department, skills, languages, estimated_wait_time, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      queueEntry.id,
      queueEntry.conversationId,
      queueEntry.priority,
      queueEntry.department,
      JSON.stringify(queueEntry.skills),
      JSON.stringify(queueEntry.languages),
      queueEntry.estimatedWaitTime,
      queueEntry.createdAt
    ]);
  }

  private async removeQueueEntryFromDB(queueId: string): Promise<void> {
    await this.db.execute('DELETE FROM chat_queues WHERE id = $1', [queueId]);
  }

  private async updateAgentInDB(agent: ChatAgent): Promise<void> {
    await this.db.execute(`
      UPDATE chat_agents SET
        status = $1,
        current_chats = $2,
        last_activity_at = $3,
        updated_at = $4
      WHERE id = $5
    `, [agent.status, agent.currentChats, agent.lastActivityAt, new Date(), agent.id]);
  }

  private startChatManagement(): void {
    // Clean up inactive conversations every 10 minutes
    setInterval(async () => {
      await this.cleanupInactiveConversations();
    }, 10 * 60 * 1000);
  }

  private startAgentStatusUpdate(): void {
    // Update agent statuses every 30 seconds
    setInterval(async () => {
      await this.updateAgentStatuses();
    }, 30 * 1000);
  }

  private startQueueManagement(): void {
    // Process queue assignments every 5 seconds
    setInterval(async () => {
      await this.processQueueAssignment();
    }, 5 * 1000);
  }

  private async processQueueAssignment(): Promise<void> {
    try {
      // Get waiting conversations from queue
      const waitingQueues = Array.from(this.chatQueues.values()).filter(q => !q.assignedAt);

      for (const queueEntry of waitingQueues) {
        const conversation = this.activeConversations.get(queueEntry.conversationId);
        if (conversation && conversation.status === 'waiting') {
          const availableAgent = await this.findAvailableAgent(conversation);

          if (availableAgent) {
            await this.assignAgent(queueEntry.conversationId, availableAgent.id);
            conversation.agentId = availableAgent.id;
            conversation.agentName = availableAgent.name;
            conversation.status = 'active';
            conversation.assignedAt = new Date();
            queueEntry.assignedAt = new Date();

            await this.updateConversationInDB(conversation);
            await this.updateQueueEntryInDB(queueEntry);
            await this.removeFromQueue(queueEntry.conversationId);

            // Notify customer
            await this.sendSystemMessage(queueEntry.conversationId, {
              type: 'system',
              message: `Müşteri temsilcimiz ${availableAgent.name} ile görüşmeye başladınız.`
            });

            // Notify agent
            await this.broadcastToAgents({
              type: 'conversation_assigned',
              data: {
                conversationId: queueEntry.conversationId,
                agentId: availableAgent.id,
                customerName: conversation.customerName
              }
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process queue assignment', error);
    }
  }

  private async updateQueueEntryInDB(queueEntry: ChatQueue): Promise<void> {
    await this.db.execute(`
      UPDATE chat_queues SET assigned_at = $1 WHERE id = $2
    `, [queueEntry.assignedAt, queueEntry.id]);
  }

  private async cleanupInactiveConversations(): Promise<void> {
    try {
      const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
      const now = new Date();

      for (const [conversationId, conversation] of this.activeConversations) {
        if (now.getTime() - conversation.lastActivityAt.getTime() > inactiveThreshold) {
          if (conversation.status !== 'closed') {
            conversation.status = 'closed';
            conversation.closedAt = now;
            await this.updateConversationInDB(conversation);
          }

          this.activeConversations.delete(conversationId);
          this.logger.log(`Cleaned up inactive conversation: ${conversationId}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive conversations', error);
    }
  }

  private async updateAgentStatuses(): Promise<void> {
    try {
      // Update agent last activity
      for (const [agentId, agent] of this.onlineAgents) {
        agent.lastActivityAt = new Date();
        await this.updateAgentInDB(agent);
      }
    } catch (error) {
      this.logger.error('Failed to update agent statuses', error);
    }
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        now.setDate(now.getDate() - dayOfWeek);
        now.setHours(0, 0, 0, 0);
        break;
      case 'month':
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        break;
    }
    return now;
  }
}
