import React, { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp } from 'lucide-react'

const SalesChart = ({ data, viewMode }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Group data by month
    const monthlyData = {}
    
    data.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      const monthLabel = format(item.date, 'MMM yyyy')
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          soldQuantity: 0,
          orderedQuantity: 0,
          soldRevenue: 0,
          orderedRevenue: 0,
          count: 0
        }
      }
      
      monthlyData[monthKey].soldQuantity += item.soldQuantity
      monthlyData[monthKey].orderedQuantity += item.orderedQuantity
      monthlyData[monthKey].soldRevenue += item.revenue
      monthlyData[monthKey].orderedRevenue += (item.orderedQuantity * item.price)
      monthlyData[monthKey].count += 1
    })

    // Convert to array and sort by date
    return Object.values(monthlyData)
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA - dateB
      })
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <TrendingUp size={64} />
        </div>
        <h3>No data available</h3>
        <p>Upload a CSV file to see your sales data visualization</p>
      </div>
    )
  }

  const formatValue = (value) => {
    if (viewMode === 'revenue') {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return value.toLocaleString()
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>{label}</p>
          {viewMode === 'revenue' ? (
            <>
              <p style={{ margin: '4px 0', color: '#667eea' }}>
                Sold Revenue: ${data.soldRevenue.toLocaleString()}
              </p>
              <p style={{ margin: '4px 0', color: '#ef4444' }}>
                Ordered Revenue: ${data.orderedRevenue.toLocaleString()}
              </p>
              <p style={{ margin: '4px 0', color: '#64748b' }}>
                Revenue Fill Rate: {((data.soldRevenue / data.orderedRevenue) * 100).toFixed(1)}%
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '4px 0', color: '#667eea' }}>
                Sold Quantity: {data.soldQuantity.toLocaleString()}
              </p>
              <p style={{ margin: '4px 0', color: '#ef4444' }}>
                Ordered Quantity: {data.orderedQuantity.toLocaleString()}
              </p>
              <p style={{ margin: '4px 0', color: '#64748b' }}>
                Fill Rate: {((data.soldQuantity / data.orderedQuantity) * 100).toFixed(1)}%
              </p>
            </>
          )}
          <p style={{ margin: '4px 0', color: '#64748b' }}>
            Transactions: {data.count}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {viewMode === 'revenue' ? (
            <>
              <Line 
                type="monotone"
                dataKey="soldRevenue" 
                name="Sold Revenue"
                stroke="#667eea"
                strokeWidth={3}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="orderedRevenue" 
                name="Ordered Revenue"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </>
          ) : (
            <>
              <Line 
                type="monotone"
                dataKey="soldQuantity" 
                name="Sold Quantity"
                stroke="#667eea"
                strokeWidth={3}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="orderedQuantity" 
                name="Ordered Quantity"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SalesChart 