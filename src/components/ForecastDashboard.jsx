import React, { useMemo, useState } from 'react'
import { format, addMonths, startOfMonth } from 'date-fns'
import { TrendingUp, Calendar, Target, Download, Package, DollarSign, TrendingUp as TrendingUpIcon } from 'lucide-react'
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
import Scorecard from './Scorecard'
import ForecastAccuracy from './ForecastAccuracy'

const ForecastDashboard = ({ data, viewMode }) => {
  const [showAccuracyAnalytics, setShowAccuracyAnalytics] = useState(false)
  
  const { historicalData, forecastData, allChartData, forecastMetrics } = useMemo(() => {
    if (!data || data.length === 0) return { historicalData: [], forecastData: [], allChartData: [], forecastMetrics: {} }

    // Group historical data by month
    const monthlyData = {}
    data.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          soldQuantity: 0,
          soldRevenue: 0,
          count: 0
        }
      }
      monthlyData[monthKey].soldQuantity += item.soldQuantity
      monthlyData[monthKey].soldRevenue += item.revenue
      monthlyData[monthKey].count += 1
    })

    // Convert to array and sort by date
    const historicalArray = Object.entries(monthlyData)
      .map(([monthKey, values]) => ({
        month: monthKey,
        date: new Date(monthKey + '-01'),
        soldQuantity: values.soldQuantity,
        soldRevenue: values.soldRevenue,
        monthLabel: format(new Date(monthKey + '-01'), 'MMM yyyy')
      }))
      .sort((a, b) => a.date - b.date)

    // Calculate forecast for next 12 months
    const forecastArray = []
    const lastHistoricalDate = historicalArray.length > 0 
      ? historicalArray[historicalArray.length - 1].date 
      : new Date()

    // Calculate trend and seasonality from historical data
    const recentMonths = historicalArray.slice(-6) // Last 6 months for trend
    let trend = 0
    let avgQuantity = 0

    if (recentMonths.length > 0) {
      avgQuantity = recentMonths.reduce((sum, month) => sum + month.soldQuantity, 0) / recentMonths.length
      
      // Simple linear trend calculation
      if (recentMonths.length > 1) {
        const firstHalf = recentMonths.slice(0, Math.floor(recentMonths.length / 2))
        const secondHalf = recentMonths.slice(Math.floor(recentMonths.length / 2))
        
        const firstAvg = firstHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / secondHalf.length
        
        trend = (secondAvg - firstAvg) / firstHalf.length
      }
    }

    // Generate forecast for next 12 months
    for (let i = 1; i <= 12; i++) {
      const forecastDate = addMonths(lastHistoricalDate, i)
      const monthKey = format(forecastDate, 'yyyy-MM')
      
      // Apply trend and add seasonal variation for realistic forecast
      const baseForecast = avgQuantity + (trend * i)
      
      // Add seasonal variation (higher in Q4, lower in Q1)
      const month = forecastDate.getMonth()
      let seasonalFactor = 1.0
      if (month >= 9 && month <= 11) { // Q4 (Oct-Dec)
        seasonalFactor = 1.2
      } else if (month >= 0 && month <= 2) { // Q1 (Jan-Mar)
        seasonalFactor = 0.8
      } else if (month >= 3 && month <= 5) { // Q2 (Apr-Jun)
        seasonalFactor = 1.1
      } else { // Q3 (Jul-Sep)
        seasonalFactor = 0.9
      }
      
      const forecastQuantity = Math.max(0, Math.round(baseForecast * seasonalFactor))
      
      // Calculate forecast revenue using average price from historical data
      const avgPrice = historicalArray.length > 0 
        ? historicalArray.reduce((sum, month) => sum + month.soldRevenue, 0) / 
          historicalArray.reduce((sum, month) => sum + month.soldQuantity, 0)
        : 0
      
      const forecastRevenue = forecastQuantity * avgPrice

      forecastArray.push({
        month: monthKey,
        date: forecastDate,
        soldQuantity: forecastQuantity,
        soldRevenue: forecastRevenue,
        monthLabel: format(forecastDate, 'MMM yyyy'),
        isForecast: true
      })
    }

    // Create combined data for chart
    const allData = [
      ...historicalArray.map(item => ({
        month: item.monthLabel,
        historicalSold: viewMode === 'revenue' ? item.soldRevenue : item.soldQuantity,
        forecastSold: null,
        isHistorical: true
      })),
      ...forecastArray.map(item => ({
        month: item.monthLabel,
        historicalSold: null,
        forecastSold: viewMode === 'revenue' ? item.soldRevenue : item.soldQuantity,
        isForecast: true
      }))
    ]

    // Calculate forecast metrics
    const forecastMetrics = {
      avgMonthlyUnits: forecastArray.reduce((sum, month) => sum + month.soldQuantity, 0) / forecastArray.length,
      avgMonthlyRevenue: forecastArray.reduce((sum, month) => sum + month.soldRevenue, 0) / forecastArray.length,
      avgProductionCost: forecastArray.reduce((sum, month) => sum + (month.soldQuantity * month.soldRevenue / month.soldQuantity * 0.85), 0) / forecastArray.length
    }

    return {
      historicalData: historicalArray,
      forecastData: forecastArray,
      allChartData: allData,
      forecastMetrics
    }
  }, [data, viewMode])

  const formatValue = (value) => {
    if (viewMode === 'revenue') {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return value.toLocaleString()
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const historicalData = payload.find(p => p.dataKey === 'historicalSold')
      const forecastData = payload.find(p => p.dataKey === 'forecastSold')
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>{label}</p>
          {historicalData && (
            <p style={{ margin: '4px 0', color: '#ef4444' }}>
              Historical {viewMode === 'revenue' ? 'Revenue' : 'Sold'}: {viewMode === 'revenue' ? `$${historicalData.value.toLocaleString()}` : historicalData.value.toLocaleString()}
            </p>
          )}
          {forecastData && (
            <p style={{ margin: '4px 0', color: '#667eea' }}>
              Forecast {viewMode === 'revenue' ? 'Revenue' : 'Sold'}: {viewMode === 'revenue' ? `$${forecastData.value.toLocaleString()}` : forecastData.value.toLocaleString()}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const downloadCSV = () => {
    // Calculate average price and cost for each SKU from last 6 months
    const skuAverages = {}
    
    // Get unique SKUs from the data
    const uniqueSkus = [...new Set(data.map(item => item.sku))].filter(Boolean)
    
    uniqueSkus.forEach(sku => {
      const skuData = data.filter(item => item.sku === sku)
      const last6Months = skuData
        .sort((a, b) => b.date - a.date)
        .slice(0, 6)
      
      if (last6Months.length > 0) {
        const avgPrice = last6Months.reduce((sum, item) => sum + item.price, 0) / last6Months.length
        const avgCost = last6Months.reduce((sum, item) => sum + item.cost, 0) / last6Months.length
        
        skuAverages[sku] = {
          avgPrice: parseFloat(avgPrice.toFixed(2)),
          avgCost: parseFloat(avgCost.toFixed(2))
        }
      }
    })

    // Generate forecast data for each SKU
    const exportData = []
    
    uniqueSkus.forEach(sku => {
      const skuAvg = skuAverages[sku]
      if (!skuAvg) return
      
      // Calculate SKU-specific forecast quantities
      const skuHistoricalData = data.filter(item => item.sku === sku)
      const skuMonthlyData = {}
      
      skuHistoricalData.forEach(item => {
        const monthKey = format(item.date, 'yyyy-MM')
        if (!skuMonthlyData[monthKey]) {
          skuMonthlyData[monthKey] = {
            soldQuantity: 0,
            count: 0
          }
        }
        skuMonthlyData[monthKey].soldQuantity += item.soldQuantity
        skuMonthlyData[monthKey].count += 1
      })
      
      const skuHistoricalArray = Object.entries(skuMonthlyData)
        .map(([monthKey, values]) => ({
          month: monthKey,
          date: new Date(monthKey + '-01'),
          soldQuantity: values.soldQuantity
        }))
        .sort((a, b) => a.date - b.date)
      
      if (skuHistoricalArray.length === 0) return
      
      // Calculate trend for this SKU
      const recentMonths = skuHistoricalArray.slice(-6)
      let trend = 0
      let avgQuantity = 0
      
      if (recentMonths.length > 0) {
        avgQuantity = recentMonths.reduce((sum, month) => sum + month.soldQuantity, 0) / recentMonths.length
        
        if (recentMonths.length > 1) {
          const firstHalf = recentMonths.slice(0, Math.floor(recentMonths.length / 2))
          const secondHalf = recentMonths.slice(Math.floor(recentMonths.length / 2))
          
          const firstAvg = firstHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / firstHalf.length
          const secondAvg = secondHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / secondHalf.length
          
          trend = (secondAvg - firstAvg) / firstHalf.length
        }
      }
      
      const lastHistoricalDate = skuHistoricalArray[skuHistoricalArray.length - 1].date
      
      // Generate 12 months of forecast for this SKU
      for (let i = 1; i <= 12; i++) {
        const forecastDate = addMonths(lastHistoricalDate, i)
        
        // Apply trend and seasonal variation
        const baseForecast = avgQuantity + (trend * i)
        const month = forecastDate.getMonth()
        let seasonalFactor = 1.0
        
        if (month >= 9 && month <= 11) { // Q4
          seasonalFactor = 1.2
        } else if (month >= 0 && month <= 2) { // Q1
          seasonalFactor = 0.8
        } else if (month >= 3 && month <= 5) { // Q2
          seasonalFactor = 1.1
        } else { // Q3
          seasonalFactor = 0.9
        }
        
        const forecastQuantity = Math.max(0, Math.round(baseForecast * seasonalFactor))
        
        exportData.push({
          date: format(forecastDate, 'M/d/yyyy'),
          sku: sku,
          'Sold Quantity': forecastQuantity,
          price: skuAvg.avgPrice,
          cost: skuAvg.avgCost
        })
      }
    })

    const headers = ['date', 'sku', 'Sold Quantity', 'price', 'cost']
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => [
        row.date,
        row.sku,
        row['Sold Quantity'],
        row.price,
        row.cost
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_forecast_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadXLSX = () => {
    // Calculate average price and cost for each SKU from last 6 months
    const skuAverages = {}
    
    // Get unique SKUs from the data
    const uniqueSkus = [...new Set(data.map(item => item.sku))].filter(Boolean)
    
    uniqueSkus.forEach(sku => {
      const skuData = data.filter(item => item.sku === sku)
      const last6Months = skuData
        .sort((a, b) => b.date - a.date)
        .slice(0, 6)
      
      if (last6Months.length > 0) {
        const avgPrice = last6Months.reduce((sum, item) => sum + item.price, 0) / last6Months.length
        const avgCost = last6Months.reduce((sum, item) => sum + item.cost, 0) / last6Months.length
        
        skuAverages[sku] = {
          avgPrice: parseFloat(avgPrice.toFixed(2)),
          avgCost: parseFloat(avgCost.toFixed(2))
        }
      }
    })

    // Generate forecast data for each SKU
    const exportData = []
    
    uniqueSkus.forEach(sku => {
      const skuAvg = skuAverages[sku]
      if (!skuAvg) return
      
      // Calculate SKU-specific forecast quantities
      const skuHistoricalData = data.filter(item => item.sku === sku)
      const skuMonthlyData = {}
      
      skuHistoricalData.forEach(item => {
        const monthKey = format(item.date, 'yyyy-MM')
        if (!skuMonthlyData[monthKey]) {
          skuMonthlyData[monthKey] = {
            soldQuantity: 0,
            count: 0
          }
        }
        skuMonthlyData[monthKey].soldQuantity += item.soldQuantity
        skuMonthlyData[monthKey].count += 1
      })
      
      const skuHistoricalArray = Object.entries(skuMonthlyData)
        .map(([monthKey, values]) => ({
          month: monthKey,
          date: new Date(monthKey + '-01'),
          soldQuantity: values.soldQuantity
        }))
        .sort((a, b) => a.date - b.date)
      
      if (skuHistoricalArray.length === 0) return
      
      // Calculate trend for this SKU
      const recentMonths = skuHistoricalArray.slice(-6)
      let trend = 0
      let avgQuantity = 0
      
      if (recentMonths.length > 0) {
        avgQuantity = recentMonths.reduce((sum, month) => sum + month.soldQuantity, 0) / recentMonths.length
        
        if (recentMonths.length > 1) {
          const firstHalf = recentMonths.slice(0, Math.floor(recentMonths.length / 2))
          const secondHalf = recentMonths.slice(Math.floor(recentMonths.length / 2))
          
          const firstAvg = firstHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / firstHalf.length
          const secondAvg = secondHalf.reduce((sum, month) => sum + month.soldQuantity, 0) / secondHalf.length
          
          trend = (secondAvg - firstAvg) / firstHalf.length
        }
      }
      
      const lastHistoricalDate = skuHistoricalArray[skuHistoricalArray.length - 1].date
      
      // Generate 12 months of forecast for this SKU
      for (let i = 1; i <= 12; i++) {
        const forecastDate = addMonths(lastHistoricalDate, i)
        
        // Apply trend and seasonal variation
        const baseForecast = avgQuantity + (trend * i)
        const month = forecastDate.getMonth()
        let seasonalFactor = 1.0
        
        if (month >= 9 && month <= 11) { // Q4
          seasonalFactor = 1.2
        } else if (month >= 0 && month <= 2) { // Q1
          seasonalFactor = 0.8
        } else if (month >= 3 && month <= 5) { // Q2
          seasonalFactor = 1.1
        } else { // Q3
          seasonalFactor = 0.9
        }
        
        const forecastQuantity = Math.max(0, Math.round(baseForecast * seasonalFactor))
        
        exportData.push({
          date: format(forecastDate, 'M/d/yyyy'),
          sku: sku,
          'Ordered Quantity': forecastQuantity,
          'Sold Quantity': forecastQuantity,
          price: skuAvg.avgPrice,
          cost: skuAvg.avgCost
        })
      }
    })

    const headers = ['date', 'sku', 'Sold Quantity', 'price', 'cost']
    const csvContent = [
      headers.join('\t'),
      ...exportData.map(row => [
        row.date,
        row.sku,
        row['Sold Quantity'],
        row.price,
        row.cost
      ].join('\t'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_forecast_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!data || data.length === 0) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <TrendingUp size={64} />
        </div>
        <h3>No data available</h3>
        <p>Upload a CSV file to see your forecast simulation</p>
      </div>
    )
  }

  return (
    <div className="forecast-dashboard">
      <div className="forecast-header">
        <h2 className="forecast-title">
          <Target className="forecast-icon" />
          Sales Forecast Simulation
        </h2>
        <p className="forecast-subtitle">
          Historical data vs 12-month forecast projection
        </p>
      </div>

      <div className="unified-chart-container">
            <div className="chart-header">
              <h3 className="chart-title">
                {viewMode === 'revenue' ? 'Revenue Forecast' : 'Units Sold Forecast'}
              </h3>
            </div>
            
            <div className="line-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <Line 
                    type="monotone"
                    dataKey="historicalSold" 
                    name={`Historical ${viewMode === 'revenue' ? 'Revenue' : 'Sold'}`}
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="forecastSold" 
                    name={`Forecast ${viewMode === 'revenue' ? 'Revenue' : 'Sold'}`}
                    stroke="#667eea"
                    strokeWidth={3}
                    dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="scorecards-grid">
            <Scorecard
              title="Avg Monthly Units Sold"
              value={Math.round(forecastMetrics.avgMonthlyUnits || 0).toLocaleString()}
              icon={<Package />}
              change="+15.2%"
            />
            <Scorecard
              title="Avg Monthly Revenue"
              value={`$${(forecastMetrics.avgMonthlyRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<DollarSign />}
              change="+12.8%"
            />
            <Scorecard
              title="Production Cost"
              value={`$${(forecastMetrics.avgProductionCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<TrendingUpIcon />}
              change="-3.2%"
              changeType="negative"
            />
          </div>

          <div className="download-section">
            <div className="download-header">
              <Download className="download-icon" />
              <h3>Export Forecast Data</h3>
            </div>
            <p className="download-description">
              Download the complete forecast data including historical and projected values
            </p>
            <div className="download-buttons">
              <button className="download-btn csv-btn" onClick={downloadCSV}>
                <Download size={16} />
                Download CSV
              </button>
              <button className="download-btn xlsx-btn" onClick={downloadXLSX}>
                <Download size={16} />
                Download XLSX
              </button>
            </div>
          </div>

          {/* Forecast Accuracy Analytics Toggle */}
          <div className="analytics-toggle">
            <button 
              className={`analytics-btn ${showAccuracyAnalytics ? 'active' : ''}`}
              onClick={() => setShowAccuracyAnalytics(!showAccuracyAnalytics)}
            >
              <Target size={16} />
              {showAccuracyAnalytics ? 'Hide' : 'Show'} Forecast Accuracy Analytics
            </button>
          </div>

          {/* Forecast Accuracy Analysis */}
          {showAccuracyAnalytics && (
            <ForecastAccuracy 
              historicalData={data}
              forecastData={forecastData}
              viewMode={viewMode}
            />
          )}
    </div>
  )
}

export default ForecastDashboard 