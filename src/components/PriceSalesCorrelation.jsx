import React, { useMemo, useState } from 'react'
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, BarChart3, Download, Target, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import PriceSalesAnalysisService from '../services/PriceSalesAnalysisService'

const PriceSalesCorrelation = ({ salesData, selectedSku, viewMode }) => {
  const [timeRange, setTimeRange] = useState('all')
  const [chartType, setChartType] = useState('scatter') // 'scatter', 'trend', 'distribution'

  const correlationData = useMemo(() => {
    if (!salesData) return null
    
    return PriceSalesAnalysisService.correlatePriceWithSales(salesData, selectedSku)
  }, [salesData, selectedSku])

  const priceTrends = useMemo(() => {
    if (!salesData) return []
    
    return PriceSalesAnalysisService.getSeasonalPriceTrends(salesData, timeRange)
  }, [salesData, timeRange])

  const forecastImpact = useMemo(() => {
    if (!salesData) return null
    
    return PriceSalesAnalysisService.calculatePriceImpactOnForecast(salesData, selectedSku)
  }, [salesData, selectedSku])

  const promotionalImpact = useMemo(() => {
    if (!salesData) return null
    
    return PriceSalesAnalysisService.analyzePromotionalImpact(salesData, selectedSku)
  }, [salesData, selectedSku])

  const formatValue = (value) => {
    if (viewMode === 'revenue') {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return value.toLocaleString()
  }

  const getCorrelationIcon = (correlation) => {
    if (correlation > 0.3) return <TrendingUp className="correlation-icon positive" />
    if (correlation < -0.3) return <TrendingDown className="correlation-icon negative" />
    return <Minus className="correlation-icon neutral" />
  }

  const getCorrelationColor = (correlation) => {
    if (correlation > 0.3) return '#10b981'
    if (correlation < -0.3) return '#ef4444'
    return '#6b7280'
  }

  const CustomScatterTooltip = ({ active, payload, label }) => {
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
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {format(data.date, 'MMM yyyy')}
          </p>
          <p style={{ margin: '4px 0', color: '#667eea' }}>
            {viewMode === 'revenue' ? 'Revenue' : 'Sold'}: {formatValue(data.soldQuantity)}
          </p>
          <p style={{ margin: '4px 0', color: '#f59e0b' }}>
            Avg Price: ${data.avgPrice.toFixed(2)}
          </p>
          <p style={{ margin: '4px 0', color: '#10b981' }}>
            Price Change: {(data.priceChange * 100).toFixed(1)}%
          </p>
          <p style={{ margin: '4px 0', color: '#ef4444' }}>
            Sales Change: {(data.salesChange * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const downloadCorrelationData = () => {
    if (!correlationData || !correlationData.dataPoints.length) return

    const headers = ['Month', 'Date', 'Sold Quantity', 'Revenue', 'Avg Price', 'Price Change %', 'Sales Change %', 'Profit Margin %']
    const csvContent = [
      headers.join(','),
      ...correlationData.dataPoints.map(point => [
        format(point.date, 'MMM yyyy'),
        format(point.date, 'yyyy-MM-dd'),
        point.soldQuantity,
        point.revenue,
        point.avgPrice.toFixed(2),
        (point.priceChange * 100).toFixed(2),
        (point.salesChange * 100).toFixed(2),
        (point.profitMargin * 100).toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `price_sales_correlation_${selectedSku || 'all'}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!salesData) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <BarChart3 size={64} />
        </div>
        <h3>No data available</h3>
        <p>Upload sales data to see price-sales correlation analysis</p>
      </div>
    )
  }

  if (!correlationData || correlationData.dataPoints.length === 0) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <BarChart3 size={64} />
        </div>
        <h3>Insufficient data for correlation</h3>
        <p>Need sufficient price variation and sales data to perform correlation analysis</p>
      </div>
    )
  }

  return (
    <div className="review-correlation">
      <div className="correlation-header">
        <h2 className="correlation-title">
          <DollarSign className="correlation-icon" />
          Price-Sales Correlation Analysis
        </h2>
        <p className="correlation-subtitle">
          {selectedSku ? `Analysis for ${selectedSku}` : 'Analysis across all products'}
        </p>
      </div>

      {/* Correlation Summary */}
      <div className="correlation-summary">
        <div className="summary-card">
          <div className="summary-header">
            {getCorrelationIcon(correlationData.correlation)}
            <h3>Correlation Coefficient</h3>
          </div>
          <div className="summary-value" style={{ color: getCorrelationColor(correlationData.correlation) }}>
            {correlationData.correlation.toFixed(3)}
          </div>
          <div className="summary-description">
            {correlationData.correlation > 0.3 ? 'Strong positive correlation' :
             correlationData.correlation < -0.3 ? 'Strong negative correlation' :
             correlationData.correlation > 0.1 ? 'Weak positive correlation' :
             correlationData.correlation < -0.1 ? 'Weak negative correlation' :
             'No significant correlation'}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <BarChart3 className="correlation-icon" />
            <h3>Confidence Level</h3>
          </div>
          <div className="summary-value">
            {(correlationData.confidence * 100).toFixed(1)}%
          </div>
          <div className="summary-description">
            {correlationData.confidence >= 0.8 ? 'High confidence' :
             correlationData.confidence >= 0.6 ? 'Moderate confidence' :
             'Low confidence'}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <TrendingUp className="correlation-icon" />
            <h3>Price Elasticity</h3>
          </div>
          <div className="summary-value">
            {correlationData.priceElasticity ? correlationData.priceElasticity.toFixed(2) : 'N/A'}
          </div>
          <div className="summary-description">
            {correlationData.priceElasticity ? 
              (Math.abs(correlationData.priceElasticity) > 1 ? 'Elastic demand' : 'Inelastic demand') :
              'Insufficient data'}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <Target className="correlation-icon" />
            <h3>Data Points</h3>
          </div>
          <div className="summary-value">
            {correlationData.dataPoints.length}
          </div>
          <div className="summary-description">
            Months with price and sales data
          </div>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="analysis-text">
        <p>{correlationData.analysis}</p>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <option value="scatter">Price vs Sales Scatter</option>
            <option value="trend">Price Trends</option>
            <option value="distribution">Sales Distribution</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="12m">Last 12 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="3m">Last 3 Months</option>
          </select>
        </div>

        <button className="download-btn" onClick={downloadCorrelationData}>
          <Download size={16} />
          Export Data
        </button>
      </div>

      {/* Charts */}
      <div className="chart-container">
        {chartType === 'scatter' && (
          <div className="scatter-chart">
            <h3>Price Changes vs Sales Changes</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={correlationData.dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="priceChange" 
                  name="Price Change %"
                  stroke="#64748b"
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <YAxis 
                  dataKey="salesChange" 
                  name="Sales Change %"
                  stroke="#64748b"
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter 
                  dataKey="salesChange" 
                  fill="#667eea" 
                  stroke="#4f46e5"
                  strokeWidth={1}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'trend' && (
          <div className="trend-chart">
            <h3>Price Trends Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={priceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  tickFormatter={(value) => format(new Date(value + '-01'), 'MMM yy')}
                />
                <YAxis 
                  stroke="#64748b"
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value + '-01'), 'MMM yyyy')}
                  formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
                />
                <Legend />
                <Line 
                  type="monotone"
                  dataKey="avgPrice" 
                  name="Average Price"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'distribution' && (
          <div className="distribution-chart">
            <h3>Sales Volume Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={correlationData.dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  tickFormatter={(value) => format(new Date(value + '-01'), 'MMM yy')}
                />
                <YAxis stroke="#64748b" tickFormatter={formatValue} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value + '-01'), 'MMM yyyy')}
                  formatter={(value, name) => [formatValue(value), name]}
                />
                <Legend />
                <Bar dataKey="soldQuantity" name="Sold Quantity" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Forecast Impact */}
      {forecastImpact && (
        <div className="forecast-impact">
          <h3>Price Impact on Sales Forecast</h3>
          <div className="impact-card">
            <div className="impact-header">
              <Target className="impact-icon" />
              <h4>Price Sensitivity Analysis</h4>
            </div>
            <div className="impact-content">
              <p className="impact-recommendation">{forecastImpact.recommendation}</p>
              <div className="impact-metrics">
                <div className="impact-metric">
                  <span className="metric-label">Impact Factor:</span>
                  <span className="metric-value" style={{ color: getCorrelationColor(forecastImpact.correlation) }}>
                    {(forecastImpact.impactFactor * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="impact-metric">
                  <span className="metric-label">Confidence:</span>
                  <span className="metric-value">
                    {(forecastImpact.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="impact-metric">
                  <span className="metric-label">Price Elasticity:</span>
                  <span className="metric-value">
                    {forecastImpact.priceElasticity ? forecastImpact.priceElasticity.toFixed(2) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promotional Impact */}
      {promotionalImpact && (
        <div className="forecast-impact">
          <h3>Promotional Impact Analysis</h3>
          <div className="impact-card">
            <div className="impact-header">
              <DollarSign className="impact-icon" />
              <h4>Promotion Effectiveness</h4>
            </div>
            <div className="impact-content">
              <p className="impact-recommendation">{promotionalImpact.recommendation}</p>
              <div className="impact-metrics">
                <div className="impact-metric">
                  <span className="metric-label">Promotional Impact:</span>
                  <span className="metric-value" style={{ color: promotionalImpact.promotionalImpact > 0 ? '#10b981' : '#ef4444' }}>
                    {(promotionalImpact.promotionalImpact * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="impact-metric">
                  <span className="metric-label">Promotional Months:</span>
                  <span className="metric-value">
                    {promotionalImpact.promotionalMonths}
                  </span>
                </div>
                <div className="impact-metric">
                  <span className="metric-label">Regular Months:</span>
                  <span className="metric-value">
                    {promotionalImpact.regularMonths}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceSalesCorrelation 