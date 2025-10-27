'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Save,
  Plus,
  Trash2,
  Calendar,
  Percent,
  Tag,
  Users,
  ShoppingCart,
  Gift,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Campaign {
  name: string
  type: 'discount' | 'coupon' | 'flash_sale' | 'bundle' | 'bogo'
  startDate: string
  endDate: string
  status: 'active' | 'scheduled' | 'expired' | 'draft'
  rules: CampaignRule[]
  actions: CampaignAction[]
  limits: CampaignLimits
  targeting: CampaignTargeting
}

interface CampaignRule {
  id: string
  type: 'cart_total' | 'product' | 'category' | 'customer_group' | 'quantity'
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
}

interface CampaignAction {
  id: string
  type: 'percentage_discount' | 'fixed_discount' | 'free_shipping' | 'free_product' | 'points'
  value: any
}

interface CampaignLimits {
  usageLimit?: number
  perCustomerLimit?: number
  minimumPurchase?: number
  maximumDiscount?: number
}

interface CampaignTargeting {
  customerGroups?: string[]
  channels?: string[]
  locations?: string[]
}

export default function CampaignBuilder() {
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    type: 'discount',
    startDate: '',
    endDate: '',
    status: 'draft',
    rules: [],
    actions: [],
    limits: {},
    targeting: {},
  })

  const [activeStep, setActiveStep] = useState(0)

  const campaignTypes = [
    { value: 'discount', label: 'Discount Campaign', icon: Percent, color: 'blue' },
    { value: 'coupon', label: 'Coupon Code', icon: Tag, color: 'green' },
    { value: 'flash_sale', label: 'Flash Sale', icon: Zap, color: 'red' },
    { value: 'bundle', label: 'Bundle Deal', icon: ShoppingCart, color: 'purple' },
    { value: 'bogo', label: 'Buy One Get One', icon: Gift, color: 'orange' },
  ]

  const ruleTypes = [
    { value: 'cart_total', label: 'Cart Total', description: 'Min/max cart value' },
    { value: 'product', label: 'Specific Products', description: 'Apply to selected products' },
    { value: 'category', label: 'Category', description: 'Apply to categories' },
    { value: 'customer_group', label: 'Customer Group', description: 'Target customer segments' },
    { value: 'quantity', label: 'Quantity', description: 'Min/max product quantity' },
  ]

  const actionTypes = [
    { value: 'percentage_discount', label: 'Percentage Off', description: 'e.g., 20% off' },
    { value: 'fixed_discount', label: 'Fixed Amount Off', description: 'e.g., ₺50 off' },
    { value: 'free_shipping', label: 'Free Shipping', description: 'Waive shipping costs' },
    { value: 'free_product', label: 'Free Product', description: 'Add product to cart' },
    { value: 'points', label: 'Loyalty Points', description: 'Award bonus points' },
  ]

  const addRule = () => {
    setCampaign((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          id: `rule_${Date.now()}`,
          type: 'cart_total',
          operator: 'greater_than',
          value: 0,
        },
      ],
    }))
  }

  const removeRule = (id: string) => {
    setCampaign((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== id),
    }))
  }

  const updateRule = (id: string, updates: Partial<CampaignRule>) => {
    setCampaign((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
  }

  const addAction = () => {
    setCampaign((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: `action_${Date.now()}`,
          type: 'percentage_discount',
          value: 0,
        },
      ],
    }))
  }

  const removeAction = (id: string) => {
    setCampaign((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== id),
    }))
  }

  const updateAction = (id: string, updates: Partial<CampaignAction>) => {
    setCampaign((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))
  }

  const handleSave = () => {
    if (!campaign.name || !campaign.startDate || !campaign.endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (campaign.rules.length === 0) {
      toast.error('Please add at least one rule')
      return
    }

    if (campaign.actions.length === 0) {
      toast.error('Please add at least one action')
      return
    }

    console.log('Campaign saved:', campaign)
    toast.success('Campaign created successfully')
  }

  const steps = [
    { title: 'Basic Info', description: 'Campaign details' },
    { title: 'Rules', description: 'When to apply' },
    { title: 'Actions', description: 'What happens' },
    { title: 'Limits', description: 'Usage restrictions' },
    { title: 'Targeting', description: 'Who sees it' },
  ]

  return (
    <div className="min-h-screen bg-ios-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="ios-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ios-gray-900">Campaign Builder</h1>
              <p className="text-ios-gray-600 mt-1">Create promotional campaigns and discounts</p>
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Campaign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="ios-card p-4">
              <nav className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      activeStep === index
                        ? 'bg-ios-blue text-white shadow-lg'
                        : 'text-ios-gray-700 hover:bg-ios-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          activeStep === index
                            ? 'bg-white/20'
                            : 'bg-ios-gray-200 text-ios-gray-700'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p
                          className={`text-xs ${
                            activeStep === index ? 'text-white/80' : 'text-ios-gray-500'
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ios-card p-6 space-y-6"
              >
                <h2 className="text-xl font-bold text-ios-gray-900">Campaign Information</h2>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                    placeholder="Summer Sale 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-3">
                    Campaign Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaignTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() =>
                          setCampaign((prev) => ({ ...prev, type: type.value as any }))
                        }
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          campaign.type === type.value
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-ios-gray-200 hover:border-ios-gray-300'
                        }`}
                      >
                        <type.icon
                          className={`w-8 h-8 mb-2 ${
                            campaign.type === type.value
                              ? `text-${type.color}-600`
                              : 'text-ios-gray-400'
                          }`}
                        />
                        <p className="font-semibold text-ios-gray-900">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Start Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                      <input
                        type="datetime-local"
                        value={campaign.startDate}
                        onChange={(e) =>
                          setCampaign((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      End Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                      <input
                        type="datetime-local"
                        value={campaign.endDate}
                        onChange={(e) =>
                          setCampaign((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={campaign.status}
                    onChange={(e) =>
                      setCampaign((prev) => ({ ...prev, status: e.target.value as any }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </motion.div>
            )}

            {activeStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ios-card p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ios-gray-900">Campaign Rules</h2>
                    <p className="text-sm text-ios-gray-600 mt-1">
                      Define when this campaign should be applied
                    </p>
                  </div>
                  <button
                    onClick={addRule}
                    className="px-4 py-2 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Rule
                  </button>
                </div>

                {campaign.rules.length === 0 && (
                  <div className="text-center py-12 text-ios-gray-500">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No rules added yet</p>
                    <p className="text-sm mt-1">Click "Add Rule" to get started</p>
                  </div>
                )}

                <div className="space-y-4">
                  {campaign.rules.map((rule, index) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-ios-gray-50 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm font-semibold text-ios-gray-700">
                          Rule #{index + 1}
                        </span>
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                            Type
                          </label>
                          <select
                            value={rule.type}
                            onChange={(e) =>
                              updateRule(rule.id, { type: e.target.value as any })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all text-sm"
                          >
                            {ruleTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                            Operator
                          </label>
                          <select
                            value={rule.operator}
                            onChange={(e) =>
                              updateRule(rule.id, { operator: e.target.value as any })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all text-sm"
                          >
                            <option value="equals">Equals</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                            <option value="in">In List</option>
                            <option value="not_in">Not In List</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                            Value
                          </label>
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all text-sm"
                            placeholder="Enter value"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ios-card p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ios-gray-900">Campaign Actions</h2>
                    <p className="text-sm text-ios-gray-600 mt-1">
                      Define what discount or benefit to apply
                    </p>
                  </div>
                  <button
                    onClick={addAction}
                    className="px-4 py-2 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Action
                  </button>
                </div>

                {campaign.actions.length === 0 && (
                  <div className="text-center py-12 text-ios-gray-500">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No actions added yet</p>
                    <p className="text-sm mt-1">Click "Add Action" to get started</p>
                  </div>
                )}

                <div className="space-y-4">
                  {campaign.actions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-ios-gray-50 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm font-semibold text-ios-gray-700">
                          Action #{index + 1}
                        </span>
                        <button
                          onClick={() => removeAction(action.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                            Type
                          </label>
                          <select
                            value={action.type}
                            onChange={(e) =>
                              updateAction(action.id, { type: e.target.value as any })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all text-sm"
                          >
                            {actionTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                            Value
                          </label>
                          <input
                            type="text"
                            value={action.value}
                            onChange={(e) => updateAction(action.id, { value: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all text-sm"
                            placeholder={
                              action.type === 'percentage_discount'
                                ? '20'
                                : action.type === 'fixed_discount'
                                ? '50.00'
                                : 'Value'
                            }
                          />
                        </div>
                      </div>

                      <p className="text-xs text-ios-gray-600 mt-3">
                        {actionTypes.find((t) => t.value === action.type)?.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ios-card p-6 space-y-6"
              >
                <h2 className="text-xl font-bold text-ios-gray-900">Usage Limits</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Total Usage Limit
                    </label>
                    <input
                      type="number"
                      value={campaign.limits.usageLimit || ''}
                      onChange={(e) =>
                        setCampaign((prev) => ({
                          ...prev,
                          limits: { ...prev.limits, usageLimit: parseInt(e.target.value) || undefined },
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Per Customer Limit
                    </label>
                    <input
                      type="number"
                      value={campaign.limits.perCustomerLimit || ''}
                      onChange={(e) =>
                        setCampaign((prev) => ({
                          ...prev,
                          limits: { ...prev.limits, perCustomerLimit: parseInt(e.target.value) || undefined },
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Minimum Purchase Amount
                    </label>
                    <input
                      type="number"
                      value={campaign.limits.minimumPurchase || ''}
                      onChange={(e) =>
                        setCampaign((prev) => ({
                          ...prev,
                          limits: { ...prev.limits, minimumPurchase: parseFloat(e.target.value) || undefined },
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Maximum Discount Amount
                    </label>
                    <input
                      type="number"
                      value={campaign.limits.maximumDiscount || ''}
                      onChange={(e) =>
                        setCampaign((prev) => ({
                          ...prev,
                          limits: { ...prev.limits, maximumDiscount: parseFloat(e.target.value) || undefined },
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ios-card p-6 space-y-6"
              >
                <h2 className="text-xl font-bold text-ios-gray-900">Campaign Targeting</h2>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Customer Groups
                  </label>
                  <p className="text-xs text-ios-gray-600 mb-3">
                    Leave empty to target all customers
                  </p>
                  <select
                    multiple
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  >
                    <option value="retail">Retail Customers</option>
                    <option value="wholesale">Wholesale Customers</option>
                    <option value="vip">VIP Customers</option>
                    <option value="new">New Customers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Sales Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-5 h-5 rounded text-ios-blue" />
                      <span className="text-sm text-ios-gray-700">Online Store</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-5 h-5 rounded text-ios-blue" />
                      <span className="text-sm text-ios-gray-700">Mobile App</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-5 h-5 rounded text-ios-blue" />
                      <span className="text-sm text-ios-gray-700">POS</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-6 py-3 text-ios-gray-700 bg-ios-gray-100 rounded-xl hover:bg-ios-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                disabled={activeStep === steps.length - 1}
                className="px-6 py-3 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

