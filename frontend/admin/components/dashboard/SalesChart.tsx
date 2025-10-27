'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Jan', sales: 4000, orders: 240 },
  { name: 'Feb', sales: 3000, orders: 198 },
  { name: 'Mar', sales: 2000, orders: 180 },
  { name: 'Apr', sales: 2780, orders: 210 },
  { name: 'May', sales: 1890, orders: 170 },
  { name: 'Jun', sales: 2390, orders: 205 },
  { name: 'Jul', sales: 3490, orders: 280 },
  { name: 'Aug', sales: 4200, orders: 320 },
  { name: 'Sep', sales: 3800, orders: 295 },
  { name: 'Oct', sales: 4100, orders: 310 },
  { name: 'Nov', sales: 4500, orders: 340 },
  { name: 'Dec', sales: 5200, orders: 390 },
]

export default function SalesChart() {
  return (
    <div className="ios-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-ios-gray-900">Sales Overview</h2>
          <p className="text-sm text-ios-gray-500 mt-1">Monthly sales and orders</p>
        </div>
        
        <div className="flex space-x-2">
          <button className="px-3 py-1.5 rounded-lg bg-ios-blue text-white text-sm font-medium">
            Sales
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-ios-gray-100 text-ios-gray-700 text-sm font-medium hover:bg-ios-gray-200">
            Orders
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
          <XAxis 
            dataKey="name" 
            stroke="#8E8E93"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#8E8E93"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #E5E5EA',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="sales" 
            stroke="#007AFF" 
            strokeWidth={2}
            fill="url(#salesGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

