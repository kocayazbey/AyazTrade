'use client';

import React, { useState, useEffect } from 'react';
import { AyuCard, AyuButton, AyuInput, AyuBadge } from '../index';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Play, 
  Download, 
  Clock,
  Settings,
  Filter,
  BarChart3,
  Database
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  dataSource: string;
  fields: number;
  filters: number;
  createdBy: string;
  createdAt: string;
}

interface ReportExecution {
  id: string;
  templateId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export default function CustomReportBuilder() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    dataSource: ''
  });

  useEffect(() => {
    loadTemplates();
    loadExecutions();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockTemplates: ReportTemplate[] = [
        {
          id: '1',
          name: 'Sales Report',
          description: 'Monthly sales performance report',
          category: 'Sales',
          dataSource: 'orders',
          fields: 8,
          filters: 3,
          createdBy: 'Admin',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Customer Analytics',
          description: 'Customer behavior and demographics',
          category: 'Marketing',
          dataSource: 'customers',
          fields: 12,
          filters: 5,
          createdBy: 'Admin',
          createdAt: '2024-01-14'
        }
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      // Mock data for now
      const mockExecutions: ReportExecution[] = [
        {
          id: '1',
          templateId: '1',
          status: 'completed',
          startedAt: '2024-01-20T10:00:00Z',
          completedAt: '2024-01-20T10:05:00Z'
        },
        {
          id: '2',
          templateId: '2',
          status: 'running',
          startedAt: '2024-01-20T11:00:00Z'
        }
      ];
      setExecutions(mockExecutions);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.dataSource) {
      alert('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const template: ReportTemplate = {
        id: Date.now().toString(),
        ...newTemplate,
        fields: 0,
        filters: 0,
        createdBy: 'Admin',
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setTemplates(prev => [...prev, template]);
      setNewTemplate({
        name: '',
        description: '',
        category: '',
        dataSource: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeReport = async (templateId: string) => {
    setLoading(true);
    try {
      const execution: ReportExecution = {
        id: Date.now().toString(),
        templateId,
        status: 'running',
        startedAt: new Date().toISOString()
      };
      
      setExecutions(prev => [execution, ...prev]);
      
      // Simulate execution
      setTimeout(() => {
        setExecutions(prev => 
          prev.map(e => 
            e.id === execution.id 
              ? { ...e, status: 'completed', completedAt: new Date().toISOString() }
              : e
          )
        );
      }, 3000);
    } catch (error) {
      console.error('Error executing report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '⏸️';
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
          <p className="text-gray-600">Create, schedule, and manage custom reports</p>
        </div>
        <AyuButton onClick={() => setShowCreateForm(true)} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create Report
        </AyuButton>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <AyuCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Report Template</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name *
                  </label>
                  <AyuInput
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter report description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Source *
                </label>
                <select
                  value={newTemplate.dataSource}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, dataSource: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select data source</option>
                  <option value="orders">Orders</option>
                  <option value="customers">Customers</option>
                  <option value="products">Products</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <AyuButton variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </AyuButton>
                <AyuButton onClick={createTemplate} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Template'}
                </AyuButton>
              </div>
            </div>
          </div>
        </AyuCard>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <AyuCard key={template.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <AyuBadge variant="info">{template.category}</AyuBadge>
              </div>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Database className="h-4 w-4 mr-2" />
                  {template.dataSource}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {template.fields} fields
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Filter className="h-4 w-4 mr-2" />
                  {template.filters} filters
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <AyuButton
                  variant="outline"
                  size="sm"
                  onClick={() => executeReport(template.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </AyuButton>
                <AyuButton
                  variant="ghost"
                  size="sm"
                >
                  <Settings className="h-4 w-4" />
                </AyuButton>
              </div>
            </div>
          </AyuCard>
        ))}
      </div>

      {/* Recent Executions */}
      <AyuCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Executions</h3>
          {executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No report executions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.slice(0, 5).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(execution.status)}</span>
                    <div>
                      <p className="font-medium">Report Execution</p>
                      <p className="text-sm text-gray-500">
                        Started: {new Date(execution.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AyuBadge variant={getStatusColor(execution.status) as any}>
                      {execution.status}
                    </AyuBadge>
                    {execution.status === 'completed' && (
                      <AyuButton variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </AyuButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AyuCard>

      {templates.length === 0 && (
        <AyuCard>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No report templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first custom report template</p>
            <AyuButton onClick={() => setShowCreateForm(true)}>
              Create Report Template
            </AyuButton>
          </div>
        </AyuCard>
      )}
    </div>
  );
}