import React, { useMemo, useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Target, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Download,
  Brain,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import ForecastAccuracyService from '../services/ForecastAccuracyService'
import PythonForecastService from '../services/PythonForecastService'

const ForecastAccuracy = ({ historicalData, forecastData, selectedSku, viewMode }) => {
  const [selectedCategory, setSelectedCategory] = useState('all') // 'all', 'Good', 'Medium', 'Poor'

  const [accuracyData, setAccuracyData] = useState(null)
  const [allProductsAccuracy, setAllProductsAccuracy] = useState(null)
  const [loading, setLoading] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(true)

  useEffect(() => {
    const checkBackendAndCalculate = async () => {
      if (!historicalData || !forecastData) {
        setAccuracyData(null)
        return
      }
      
      setLoading(true)
      try {
        // Check if Python backend is available
        const isBackendAvailable = await PythonForecastService.checkHealth()
        setBackendAvailable(isBackendAvailable)
        
        if (isBackendAvailable) {
          // Use Python backend
          const accuracy = await ForecastAccuracyService.calculateForecastAccuracy(historicalData, forecastData, selectedSku)
          setAccuracyData(accuracy)
        } else {
          // Fallback to JavaScript implementation
          console.warn('Python backend not available, using JavaScript fallback')
          const accuracy = await ForecastAccuracyService.calculateForecastAccuracy(historicalData, forecastData, selectedSku)
          setAccuracyData(accuracy)
        }
      } catch (error) {
        console.error('Error calculating accuracy:', error)
        setAccuracyData(null)
      } finally {
        setLoading(false)
      }
    }

    checkBackendAndCalculate()
  }, [historicalData, forecastData, selectedSku])

  useEffect(() => {
    const calculateAllAccuracy = async () => {
      if (!historicalData || !forecastData) {
        setAllProductsAccuracy(null)
        return
      }
      
      try {
        if (backendAvailable) {
          // Use Python backend
          const allAccuracy = await ForecastAccuracyService.calculateAllProductsAccuracy(historicalData, forecastData)
          setAllProductsAccuracy(allAccuracy)
        } else {
          // Fallback to JavaScript implementation
          const allAccuracy = await ForecastAccuracyService.calculateAllProductsAccuracy(historicalData, forecastData)
          setAllProductsAccuracy(allAccuracy)
        }
      } catch (error) {
        console.error('Error calculating all accuracy:', error)
        setAllProductsAccuracy(null)
      }
    }

    calculateAllAccuracy()
  }, [historicalData, forecastData, backendAvailable])

  const getAccuracyIcon = (accuracy) => {
    switch (accuracy) {
      case 'Good': return <CheckCircle className="accuracy-icon good" />
      case 'Medium': return <AlertCircle className="accuracy-icon medium" />
      case 'Poor': return <XCircle className="accuracy-icon poor" />
      default: return <Minus className="accuracy-icon neutral" />
    }
  }

  const getAccuracyColor = (accuracy) => {
    switch (accuracy) {
      case 'Good': return '#10b981'
      case 'Medium': return '#f59e0b'
      case 'Poor': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const formatValue = (value) => {
    if (viewMode === 'revenue') {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return value.toLocaleString()
  }

  const downloadAccuracyData = () => {
    if (!allProductsAccuracy) return

    const headers = ['SKU', 'Accuracy Category', 'MAE', 'MAPE (%)', 'RMSE', 'Confidence (%)', 'Data Points', 'Training Months', 'Validation Months']
    const csvContent = [
      headers.join(','),
      ...Object.entries(allProductsAccuracy.productAccuracies).map(([sku, accuracy]) => [
        sku,
        accuracy.accuracy,
        accuracy.mae.toFixed(2),
        accuracy.mape.toFixed(2),
        accuracy.rmse.toFixed(2),
        (accuracy.confidence * 100).toFixed(1),
        accuracy.dataPoints,
        accuracy.trainingMonths,
        accuracy.validationMonths
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `forecast_accuracy_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Calculating forecast accuracy...</p>
      </div>
    )
  }

  if (!historicalData || !forecastData) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <Target size={64} />
        </div>
        <h3>No data available</h3>
        <p>Upload sales data to see forecast accuracy analysis</p>
      </div>
    )
  }

  if (!accuracyData || accuracyData.dataPoints === 0) {
    return (
      <div className="no-data">
        <div className="no-data-icon">
          <Target size={64} />
        </div>
        <h3>Insufficient data for accuracy analysis</h3>
        <p>{accuracyData?.recommendation || 'Need at least 8 months of data for accurate assessment'}</p>
      </div>
    )
  }

  // Prepare data for charts
  const categoryData = allProductsAccuracy ? [
    { name: 'Good', value: allProductsAccuracy.categorySummary.Good, color: '#10b981' },
    { name: 'Medium', value: allProductsAccuracy.categorySummary.Medium, color: '#f59e0b' },
    { name: 'Poor', value: allProductsAccuracy.categorySummary.Poor, color: '#ef4444' }
  ].filter(item => item.value > 0) : []

  const productsByCategory = allProductsAccuracy ? 
    (selectedCategory === 'all' ? 
      Object.entries(allProductsAccuracy.productAccuracies).map(([sku, accuracy]) => ({
        sku,
        accuracy: accuracy.accuracy,
        mae: accuracy.mae,
        mape: accuracy.mape,
        rmse: accuracy.rmse,
        confidence: accuracy.confidence,
        recommendation: accuracy.recommendation
      })).sort((a, b) => a.mape - b.mape) :
      ForecastAccuracyService.getProductsByCategory(allProductsAccuracy.productAccuracies, selectedCategory)
    ) : []

  return (
    <div className="forecast-accuracy">
      <div className="accuracy-header">
        <h2 className="accuracy-title">
          <Brain className="accuracy-icon" />
          Advanced Forecast Accuracy Analysis
        </h2>
        <p className="accuracy-subtitle">
          {selectedSku ? `Robust accuracy assessment for ${selectedSku}` : 'Multi-model forecast reliability assessment'}
        </p>
        <div className="accuracy-methodology">
          <Zap className="methodology-icon" />
          <span>
            Using 70% training / 30% validation split with ensemble forecasting 
            {backendAvailable ? (
              <span className="backend-status python">
                <Brain size={14} /> Python Backend (Advanced)
              </span>
            ) : (
              <span className="backend-status js">
                <Zap size={14} /> JavaScript Fallback
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Individual Product Accuracy */}
      {selectedSku && (
        <div className="accuracy-summary">
          <div className="summary-card">
            <div className="summary-header">
              {getAccuracyIcon(accuracyData.accuracy)}
              <h3>Accuracy Category</h3>
            </div>
            <div className="summary-value" style={{ color: getAccuracyColor(accuracyData.accuracy) }}>
              {accuracyData.accuracy}
            </div>
            <div className="summary-description">
              {accuracyData.accuracy === 'Good' ? 'Highly reliable forecast' :
               accuracyData.accuracy === 'Medium' ? 'Moderately reliable forecast' :
               'Low reliability forecast'}
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-header">
              <BarChart3 className="accuracy-icon" />
              <h3>MAPE</h3>
            </div>
            <div className="summary-value">
              {accuracyData.mape.toFixed(1)}%
            </div>
            <div className="summary-description">
              Mean Absolute Percentage Error
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-header">
              <TrendingUp className="accuracy-icon" />
              <h3>MAE</h3>
            </div>
            <div className="summary-value">
              {formatValue(accuracyData.mae)}
            </div>
            <div className="summary-description">
              Mean Absolute Error
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-header">
              <Target className="accuracy-icon" />
              <h3>RMSE</h3>
            </div>
            <div className="summary-value">
              {formatValue(accuracyData.rmse)}
            </div>
            <div className="summary-description">
              Root Mean Square Error
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-header">
              <CheckCircle className="accuracy-icon" />
              <h3>Confidence</h3>
            </div>
            <div className="summary-value">
              {(accuracyData.confidence * 100).toFixed(1)}%
            </div>
            <div className="summary-description">
              Statistical confidence level
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-header">
              <BarChart3 className="accuracy-icon" />
              <h3>Data Split</h3>
            </div>
            <div className="summary-value">
              {accuracyData.trainingMonths}/{accuracyData.validationMonths}
            </div>
            <div className="summary-description">
              Training/Validation months
            </div>
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="accuracy-recommendation">
        <p>{accuracyData.recommendation}</p>
      </div>

      {/* Overall Accuracy Summary */}
      {allProductsAccuracy && (
        <div className="overall-accuracy">
          <h3>Overall Forecast Quality</h3>
          <div className="overall-metrics">
            <div className="overall-metric">
              <span className="metric-label">Total Products:</span>
              <span className="metric-value">{allProductsAccuracy.overallAccuracy.totalProducts}</span>
            </div>
            <div className="overall-metric">
              <span className="metric-label">Average MAPE:</span>
              <span className="metric-value">{allProductsAccuracy.overallAccuracy.averageMape.toFixed(1)}%</span>
            </div>
            <div className="overall-metric">
              <span className="metric-label">Good Forecasts:</span>
              <span className="metric-value" style={{ color: '#10b981' }}>
                {allProductsAccuracy.overallAccuracy.goodPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="overall-metric">
              <span className="metric-label">Poor Forecasts:</span>
              <span className="metric-value" style={{ color: '#ef4444' }}>
                {allProductsAccuracy.overallAccuracy.poorPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="accuracy-charts">
        {categoryData.length > 0 && (
          <div className="chart-section">
            <h3>Forecast Quality Distribution</h3>
            <div className="charts-grid">
              <div className="pie-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bar-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Products by Category */}
        {allProductsAccuracy && (
          <div className="products-by-category">
            <div className="category-controls">
              <h3>Products by Forecast Quality</h3>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                <option value="all">All Categories</option>
                <option value="Good">Good Forecasts</option>
                <option value="Medium">Medium Forecasts</option>
                <option value="Poor">Poor Forecasts</option>
              </select>
              <button className="download-btn" onClick={downloadAccuracyData}>
                <Download size={16} />
                Export Data
              </button>
            </div>

            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>MAPE (%)</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                    <th>Confidence (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {productsByCategory.map((product, index) => (
                    <tr key={index}>
                      <td>{product.sku}</td>
                      <td>
                        <span className={`category-badge ${product.accuracy?.toLowerCase()}`}>
                          {product.accuracy || 'N/A'}
                        </span>
                      </td>
                      <td>{product.mape.toFixed(1)}%</td>
                      <td>{formatValue(product.mae)}</td>
                      <td>{formatValue(product.rmse)}</td>
                      <td>{(product.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForecastAccuracy 