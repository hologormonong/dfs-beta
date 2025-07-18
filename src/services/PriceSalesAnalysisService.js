import { format, addMonths, startOfMonth } from 'date-fns'

class PriceSalesAnalysisService {
  /**
   * Calculate correlation between price changes and sales performance
   * @param {Array} salesData - Historical sales data
   * @param {string} sku - Optional SKU filter
   * @returns {Object} Correlation analysis results
   */
  static correlatePriceWithSales(salesData, sku = null) {
    if (!salesData || salesData.length === 0) {
      return {
        correlation: 0,
        confidence: 0,
        dataPoints: [],
        analysis: 'Insufficient data for correlation analysis'
      }
    }

    // Filter data by SKU if provided
    const filteredSales = sku ? salesData.filter(item => item.sku === sku) : salesData

    if (filteredSales.length === 0) {
      return {
        correlation: 0,
        confidence: 0,
        dataPoints: [],
        analysis: `No data available for ${sku || 'selected products'}`
      }
    }

    // Group sales data by month
    const monthlyData = {}
    filteredSales.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          soldQuantity: 0,
          revenue: 0,
          totalCost: 0,
          avgPrice: 0,
          pricePoints: [],
          count: 0
        }
      }
      monthlyData[monthKey].soldQuantity += item.soldQuantity
      monthlyData[monthKey].revenue += item.revenue
      monthlyData[monthKey].totalCost += (item.soldQuantity * item.cost)
      monthlyData[monthKey].pricePoints.push(item.price)
      monthlyData[monthKey].count += 1
    })

    // Calculate average price for each month
    Object.keys(monthlyData).forEach(month => {
      const data = monthlyData[month]
      data.avgPrice = data.pricePoints.reduce((sum, price) => sum + price, 0) / data.pricePoints.length
      data.profitMargin = data.revenue > 0 ? (data.revenue - data.totalCost) / data.revenue : 0
    })

    // Create correlation data points
    const dataPoints = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        date: new Date(month + '-01'),
        soldQuantity: data.soldQuantity,
        revenue: data.revenue,
        avgPrice: data.avgPrice,
        profitMargin: data.profitMargin,
        priceChange: 0, // Will be calculated below
        salesChange: 0   // Will be calculated below
      }))
      .sort((a, b) => a.date - b.date)

    // Calculate month-over-month changes
    for (let i = 1; i < dataPoints.length; i++) {
      const current = dataPoints[i]
      const previous = dataPoints[i - 1]
      
      current.priceChange = previous.avgPrice > 0 ? 
        (current.avgPrice - previous.avgPrice) / previous.avgPrice : 0
      current.salesChange = previous.soldQuantity > 0 ? 
        (current.soldQuantity - previous.soldQuantity) / previous.soldQuantity : 0
    }

    // Remove first month (no change data)
    const correlationData = dataPoints.slice(1)

    if (correlationData.length < 2) {
      return {
        correlation: 0,
        confidence: 0,
        dataPoints: correlationData,
        analysis: 'Insufficient data points for correlation analysis'
      }
    }

    // Calculate Pearson correlation coefficient
    const correlation = this.calculatePearsonCorrelation(correlationData)
    const confidence = this.calculateConfidence(correlationData.length, correlation)

    return {
      correlation,
      confidence,
      dataPoints: correlationData,
      analysis: this.generateAnalysis(correlation, confidence, correlationData.length),
      priceElasticity: this.calculatePriceElasticity(correlationData)
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   * @param {Array} dataPoints - Array of data points with price and sales data
   * @returns {number} Correlation coefficient (-1 to 1)
   */
  static calculatePearsonCorrelation(dataPoints) {
    const n = dataPoints.length
    if (n < 2) return 0

    // Use price change and sales change for correlation
    const x = dataPoints.map(d => d.priceChange)
    const y = dataPoints.map(d => d.salesChange)

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Calculate price elasticity of demand
   * @param {Array} dataPoints - Array of data points with price and sales data
   * @returns {number} Price elasticity coefficient
   */
  static calculatePriceElasticity(dataPoints) {
    if (dataPoints.length < 2) return 0

    // Calculate average price elasticity across all data points
    const elasticities = dataPoints
      .filter(d => d.priceChange !== 0)
      .map(d => d.salesChange / d.priceChange)

    return elasticities.length > 0 ? 
      elasticities.reduce((sum, el) => sum + el, 0) / elasticities.length : 0
  }

  /**
   * Calculate confidence level based on sample size and correlation
   * @param {number} sampleSize - Number of data points
   * @param {number} correlation - Correlation coefficient
   * @returns {number} Confidence level (0-1)
   */
  static calculateConfidence(sampleSize, correlation) {
    if (sampleSize < 3) return 0

    // Simple confidence calculation based on sample size and correlation strength
    const baseConfidence = Math.min(sampleSize / 12, 1) // Max confidence at 12+ data points
    const correlationStrength = Math.abs(correlation)
    
    return baseConfidence * (0.5 + correlationStrength * 0.5)
  }

  /**
   * Generate analysis text based on correlation results
   * @param {number} correlation - Correlation coefficient
   * @param {number} confidence - Confidence level
   * @param {number} dataPoints - Number of data points
   * @returns {string} Analysis description
   */
  static generateAnalysis(correlation, confidence, dataPoints) {
    const absCorrelation = Math.abs(correlation)
    const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'no'
    
    let strength = ''
    if (absCorrelation >= 0.7) strength = 'strong'
    else if (absCorrelation >= 0.4) strength = 'moderate'
    else if (absCorrelation >= 0.2) strength = 'weak'
    else strength = 'very weak'

    let confidenceLevel = ''
    if (confidence >= 0.8) confidenceLevel = 'high'
    else if (confidence >= 0.6) confidenceLevel = 'moderate'
    else confidenceLevel = 'low'

    let interpretation = ''
    if (correlation < -0.3) {
      interpretation = 'This suggests price increases lead to sales decreases (elastic demand).'
    } else if (correlation > 0.3) {
      interpretation = 'This suggests price increases lead to sales increases (inelastic demand).'
    } else {
      interpretation = 'This suggests price changes have minimal impact on sales volume.'
    }

    return `Analysis shows a ${strength} ${direction} correlation (${correlation.toFixed(3)}) between price changes and sales performance with ${confidenceLevel} confidence based on ${dataPoints} data points. ${interpretation}`
  }

  /**
   * Get seasonal price trends
   * @param {Array} salesData - Sales data
   * @param {string} timeRange - Time range ('3m', '6m', '12m', 'all')
   * @returns {Array} Seasonal price trends data
   */
  static getSeasonalPriceTrends(salesData, timeRange = 'all') {
    if (!salesData || salesData.length === 0) return []

    const now = new Date()
    let cutoffDate = new Date()

    switch (timeRange) {
      case '3m':
        cutoffDate = addMonths(now, -3)
        break
      case '6m':
        cutoffDate = addMonths(now, -6)
        break
      case '12m':
        cutoffDate = addMonths(now, -12)
        break
      default:
        cutoffDate = new Date(0) // All time
    }

    const filteredData = salesData.filter(item => item.date >= cutoffDate)

    // Group by month
    const monthlyTrends = {}
    filteredData.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          totalPrice: 0,
          totalQuantity: 0,
          count: 0
        }
      }
      monthlyTrends[monthKey].totalPrice += (item.price * item.soldQuantity)
      monthlyTrends[monthKey].totalQuantity += item.soldQuantity
      monthlyTrends[monthKey].count += 1
    })

    return Object.entries(monthlyTrends)
      .map(([month, data]) => ({
        month,
        date: new Date(month + '-01'),
        avgPrice: data.totalQuantity > 0 ? data.totalPrice / data.totalQuantity : 0,
        totalQuantity: data.totalQuantity
      }))
      .sort((a, b) => a.date - b.date)
  }

  /**
   * Calculate price impact on sales forecast
   * @param {Array} salesData - Historical sales data
   * @param {string} sku - SKU to analyze
   * @returns {Object} Forecast adjustment factors
   */
  static calculatePriceImpactOnForecast(salesData, sku = null) {
    const correlation = this.correlatePriceWithSales(salesData, sku)
    
    if (correlation.correlation === 0) {
      return {
        impactFactor: 1.0,
        confidence: 0,
        recommendation: 'Insufficient price variation data to adjust forecast'
      }
    }

    // Calculate impact factor based on correlation strength and direction
    const impactFactor = 1.0 + (correlation.correlation * 0.15) // Max 15% adjustment
    
    let recommendation = ''
    if (correlation.correlation < -0.3) {
      recommendation = 'Strong negative correlation suggests price increases may significantly reduce sales. Consider price optimization strategies.'
    } else if (correlation.correlation > 0.3) {
      recommendation = 'Positive correlation suggests price increases may boost sales. Consider premium pricing strategies.'
    } else {
      recommendation = 'Weak correlation suggests price changes have minimal impact on sales forecast.'
    }

    return {
      impactFactor: Math.max(0.85, Math.min(1.15, impactFactor)), // Limit to ±15%
      confidence: correlation.confidence,
      recommendation,
      correlation: correlation.correlation,
      priceElasticity: correlation.priceElasticity
    }
  }

  /**
   * Analyze promotional impact on sales
   * @param {Array} salesData - Sales data
   * @param {string} sku - SKU to analyze
   * @returns {Object} Promotional analysis results
   */
  static analyzePromotionalImpact(salesData, sku = null) {
    if (!salesData || salesData.length === 0) return null

    const filteredData = sku ? salesData.filter(item => item.sku === sku) : salesData

    // Group by month and calculate price variance
    const monthlyData = {}
    filteredData.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          prices: [],
          quantities: [],
          dates: []
        }
      }
      monthlyData[monthKey].prices.push(item.price)
      monthlyData[monthKey].quantities.push(item.soldQuantity)
      monthlyData[monthKey].dates.push(item.date)
    })

    // Calculate promotional periods (months with significant price variance)
    const promotionalPeriods = Object.entries(monthlyData)
      .map(([month, data]) => {
        const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
        const priceVariance = data.prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / data.prices.length
        const avgQuantity = data.quantities.reduce((sum, q) => sum + q, 0) / data.quantities.length
        
        return {
          month,
          date: new Date(month + '-01'),
          avgPrice,
          priceVariance,
          avgQuantity,
          isPromotional: priceVariance > (avgPrice * 0.1) // 10% price variance threshold
        }
      })
      .sort((a, b) => a.date - b.date)

    const promotionalMonths = promotionalPeriods.filter(p => p.isPromotional)
    const regularMonths = promotionalPeriods.filter(p => !p.isPromotional)

    if (promotionalMonths.length === 0 || regularMonths.length === 0) {
      return {
        promotionalImpact: 0,
        recommendation: 'Insufficient promotional data for analysis'
      }
    }

    const avgPromotionalQuantity = promotionalMonths.reduce((sum, m) => sum + m.avgQuantity, 0) / promotionalMonths.length
    const avgRegularQuantity = regularMonths.reduce((sum, m) => sum + m.avgQuantity, 0) / regularMonths.length

    const promotionalImpact = avgRegularQuantity > 0 ? 
      (avgPromotionalQuantity - avgRegularQuantity) / avgRegularQuantity : 0

    return {
      promotionalImpact,
      promotionalMonths: promotionalMonths.length,
      regularMonths: regularMonths.length,
      avgPromotionalQuantity,
      avgRegularQuantity,
      recommendation: promotionalImpact > 0.1 ? 
        'Promotions show significant positive impact on sales volume.' :
        promotionalImpact < -0.1 ? 
        'Promotions show negative impact on sales volume.' :
        'Promotions show minimal impact on sales volume.'
    }
  }
}

export default PriceSalesAnalysisService 