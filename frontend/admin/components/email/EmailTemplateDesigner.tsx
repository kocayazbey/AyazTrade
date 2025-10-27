'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Save,
  Eye,
  Mail,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Layout,
  Palette,
  Code,
  Send,
} from 'lucide-react'

const templates = [
  { id: 'order_confirmation', name: 'Order Confirmation', category: 'transactional' },
  { id: 'shipping_notification', name: 'Shipping Notification', category: 'transactional' },
  { id: 'welcome_email', name: 'Welcome Email', category: 'marketing' },
  { id: 'abandoned_cart', name: 'Abandoned Cart', category: 'marketing' },
  { id: 'password_reset', name: 'Password Reset', category: 'transactional' },
  { id: 'newsletter', name: 'Newsletter', category: 'marketing' },
]

const blocks = [
  { type: 'text', icon: Type, label: 'Text Block' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'button', icon: LinkIcon, label: 'Button' },
  { type: 'divider', icon: Layout, label: 'Divider' },
]

export default function EmailTemplateDesigner() {
  const [selectedTemplate, setSelectedTemplate] = useState('order_confirmation')
  const [subject, setSubject] = useState('Your Order Confirmation #{{orderNumber}}')
  const [preheader, setPreheader] = useState('Thank you for your order!')
  const [emailBody, setEmailBody] = useState([
    { id: '1', type: 'text', content: 'Hi {{customerName}},\n\nThank you for your order!' },
    { id: '2', type: 'text', content: 'Order Number: {{orderNumber}}' },
    { id: '3', type: 'button', content: 'View Order', link: '{{orderLink}}' },
  ])
  const [showPreview, setShowPreview] = useState(false)
  const [showCode, setShowCode] = useState(false)

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
              <h1 className="text-2xl font-bold text-ios-gray-900">Email Template Designer</h1>
              <p className="text-ios-gray-600 mt-1">Create and customize email templates</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-4 py-2 bg-ios-gray-100 text-ios-gray-700 rounded-xl hover:bg-ios-gray-200 transition-colors flex items-center gap-2"
              >
                <Code className="w-5 h-5" />
                {showCode ? 'Designer' : 'HTML'}
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Preview
              </button>
              <button className="px-6 py-2 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Template
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Templates</h2>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedTemplate === template.id
                        ? 'bg-ios-blue text-white shadow-lg'
                        : 'text-ios-gray-700 hover:bg-ios-gray-100'
                    }`}
                  >
                    <p className="font-medium text-sm">{template.name}</p>
                    <p
                      className={`text-xs mt-1 ${
                        selectedTemplate === template.id ? 'text-white/80' : 'text-ios-gray-500'
                      }`}
                    >
                      {template.category}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Blocks</h2>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <button
                    key={block.type}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-ios-gray-700 hover:bg-ios-gray-100 transition-colors"
                  >
                    <block.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{block.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-lg font-bold text-ios-gray-900 mb-4">Variables</h2>
              <div className="space-y-2">
                <div className="p-2 bg-ios-gray-50 rounded-lg">
                  <code className="text-xs text-ios-blue">{'{{customerName}}'}</code>
                </div>
                <div className="p-2 bg-ios-gray-50 rounded-lg">
                  <code className="text-xs text-ios-blue">{'{{orderNumber}}'}</code>
                </div>
                <div className="p-2 bg-ios-gray-50 rounded-lg">
                  <code className="text-xs text-ios-blue">{'{{orderTotal}}'}</code>
                </div>
                <div className="p-2 bg-ios-gray-50 rounded-lg">
                  <code className="text-xs text-ios-blue">{'{{orderLink}}'}</code>
                </div>
                <div className="p-2 bg-ios-gray-50 rounded-lg">
                  <code className="text-xs text-ios-blue">{'{{trackingNumber}}'}</code>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Email Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                    placeholder="Enter subject line"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Preheader Text
                  </label>
                  <input
                    type="text"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                    placeholder="Enter preheader text"
                  />
                </div>
              </div>
            </div>

            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Email Body</h2>

              {!showCode ? (
                <div className="space-y-4">
                  {emailBody.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-ios-gray-50 rounded-xl border-2 border-dashed border-ios-gray-200 hover:border-ios-blue transition-colors"
                    >
                      {block.type === 'text' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-ios-gray-600">TEXT BLOCK</span>
                            <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                          </div>
                          <textarea
                            value={block.content}
                            onChange={(e) => {
                              const newBody = [...emailBody]
                              newBody[index].content = e.target.value
                              setEmailBody(newBody)
                            }}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all resize-none"
                          />
                        </div>
                      )}

                      {block.type === 'button' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-ios-gray-600">BUTTON</span>
                            <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={block.content}
                              onChange={(e) => {
                                const newBody = [...emailBody]
                                newBody[index].content = e.target.value
                                setEmailBody(newBody)
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                              placeholder="Button text"
                            />
                            <input
                              type="text"
                              value={block.link}
                              onChange={(e) => {
                                const newBody = [...emailBody]
                                newBody[index].link = e.target.value
                                setEmailBody(newBody)
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                              placeholder="Button link"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  <button className="w-full py-4 border-2 border-dashed border-ios-gray-300 rounded-xl text-ios-gray-600 hover:border-ios-blue hover:text-ios-blue transition-colors">
                    + Add Block
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={20}
                    className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all resize-none font-mono text-sm"
                    defaultValue={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Hi {{customerName}},</h1>
    <p>Thank you for your order!</p>
    <p>Order Number: {{orderNumber}}</p>
    <a href="{{orderLink}}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px;">View Order</a>
  </div>
</body>
</html>`}
                  />
                </div>
              )}
            </div>

            <div className="ios-card p-6">
              <h2 className="text-xl font-bold text-ios-gray-900 mb-6">Test Email</h2>

              <div className="flex gap-4">
                <input
                  type="email"
                  className="flex-1 px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                  placeholder="Enter email address"
                />
                <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

