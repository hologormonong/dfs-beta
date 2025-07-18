import { format, addMonths, subMonths, differenceInMonths } from 'date-fns'
import PythonForecastService from './PythonForecastService.js'

class ForecastAccuracyService {
  /**
   * Calculate forecast accuracy metrics for a product
   * @param {Array} historicalData - Actual historical sales data
   * @param {Array} forecastData - Forecasted sales data (for reference only)
   * @param {string} sku - Product SKU
   * @returns {Object} Accuracy metrics and categorization
   */
  static async calculateForecastAccuracy(historicalData, forecastData, sku = null) {
    if (!historicalData || historicalData.length === 0) {
      return {
        mae: 0,
        mape: 0,
        rmse: 0,
        accuracy: 'Poor',
        confidence: 0,
        recommendation: 'Insufficient historical data for accuracy assessment'
      }
    }

    // Use Python backend for better forecasting
    const forecastResult = await PythonForecastService.generateEnsembleForecast(historicalData, 12, sku)
    
    if (!forecastResult || !forecastResult.forecast) {
      return {
        mae: 0,
        mape: 0,
        rmse: 0,
        accuracy: 'Poor',
        confidence: 0,
        recommendation: 'Forecasting failed - insufficient data or model error'
      }
    }

    // Split historical data for validation
    const splitIndex = Math.floor(historicalData.length * 0.7)
    const trainingData = historicalData.slice(0, splitIndex)
    const validationData = historicalData.slice(splitIndex)
    
    if (validationData.length < 2) {
      return {
        mae: 0,
        mape: 0,
        rmse: 0,
        accuracy: 'Poor',
        confidence: 0,
        recommendation: 'Insufficient validation data for accuracy assessment'
      }
    }

    // Generate forecast for validation period
    const validationForecast = await PythonForecastService.generateForecast(trainingData, validationData.length, sku)
    
    if (!validationForecast || !validationForecast.forecast) {
      return {
        mae: 0,
        mape: 0,
        rmse: 0,
        accuracy: 'Poor',
        confidence: 0,
        recommendation: 'Validation forecasting failed'
      }
    }

    // Compare forecast with actual validation data
    const comparisonData = validationData.map((actual, index) => ({
      actual: parseFloat(actual.sales) || 0,
      forecast: parseFloat(validationForecast.forecast[index]?.sales) || 0,
      date: actual.date
    }))

    // Calculate accuracy metrics
    const mae = this.calculateMAE(comparisonData)
    const mape = this.calculateMAPE(comparisonData)
    const rmse = this.calculateRMSE(comparisonData)
    const accuracy = this.categorizeAccuracy(mape)
    const confidence = this.calculateConfidence(comparisonData.length, mape, trainingData.length)
    const recommendation = this.generateRecommendation(accuracy, mape, sku)

    return {
      mae,
      mape,
      rmse,
      accuracy,
      confidence,
      recommendation,
      dataPoints: comparisonData.length,
      comparisonData,
      trainingMonths: trainingData.length,
      validationMonths: validationData.length,
      totalMonths: historicalData.length
    }
  }

  /**
   * Generate robust forecasts using multiple forecasting methods
   * @param {Array} trainingData - Historical data used for training
   * @param {number} forecastPeriods - Number of periods to forecast
   * @returns {Array} Forecasted data
   */
  static generateRobustForecasts(trainingData, forecastPeriods) {
    if (trainingData.length < 4) return []

    // Method 1: Linear Trend with Seasonality
    const linearForecasts = this.generateLinearTrendForecasts(trainingData, forecastPeriods)
    
    // Method 2: Moving Average with Trend
    const movingAvgForecasts = this.generateMovingAverageForecasts(trainingData, forecastPeriods)
    
    // Method 3: Exponential Smoothing
    const expSmoothingForecasts = this.generateExponentialSmoothingForecasts(trainingData, forecastPeriods)
    
    // Combine forecasts using weighted average
    const combinedForecasts = []
    for (let i = 0; i < forecastPeriods; i++) {
      const weights = this.calculateForecastWeights(trainingData, i)
      
      const combinedQuantity = Math.round(
        (linearForecasts[i] * weights.linear +
         movingAvgForecasts[i] * weights.movingAvg +
         expSmoothingForecasts[i] * weights.expSmoothing) / 
        (weights.linear + weights.movingAvg + weights.expSmoothing)
      )
      
      // Calculate forecast revenue using average price from training data
      const avgPrice = trainingData.reduce((sum, month) => sum + month.avgPrice, 0) / trainingData.length
      const forecastRevenue = combinedQuantity * avgPrice

      combinedForecasts.push({
        month: format(addMonths(trainingData[trainingData.length - 1].date, i + 1), 'yyyy-MM'),
        date: addMonths(trainingData[trainingData.length - 1].date, i + 1),
        soldQuantity: Math.max(0, combinedQuantity),
        revenue: forecastRevenue
      })
    }

    return combinedForecasts
  }

  /**
   * Generate linear trend forecasts with seasonality
   */
  static generateLinearTrendForecasts(trainingData, forecastPeriods) {
    const quantities = trainingData.map(item => item.soldQuantity)
    
    // Calculate linear trend using least squares
    const n = quantities.length
    const xValues = Array.from({length: n}, (_, i) => i)
    const yValues = quantities
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = yValues.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors(trainingData)
    
    const forecasts = []
    for (let i = 1; i <= forecastPeriods; i++) {
      const trendValue = intercept + slope * (n + i - 1)
      const month = addMonths(trainingData[trainingData.length - 1].date, i).getMonth()
      const seasonalFactor = seasonalFactors[month] || 1.0
      
      forecasts.push(Math.max(0, Math.round(trendValue * seasonalFactor)))
    }
    
    return forecasts
  }

  /**
   * Generate moving average forecasts with trend
   */
  static generateMovingAverageForecasts(trainingData, forecastPeriods) {
    const quantities = trainingData.map(item => item.soldQuantity)
    const windowSize = Math.min(6, Math.floor(quantities.length / 2))
    
    // Calculate moving average
    const movingAverages = []
    for (let i = windowSize - 1; i < quantities.length; i++) {
      const window = quantities.slice(i - windowSize + 1, i + 1)
      movingAverages.push(window.reduce((sum, val) => sum + val, 0) / window.length)
    }
    
    // Calculate trend from moving averages
    const trend = movingAverages.length > 1 ? 
      (movingAverages[movingAverages.length - 1] - movingAverages[0]) / (movingAverages.length - 1) : 0
    
    const forecasts = []
    const lastMA = movingAverages[movingAverages.length - 1]
    
    for (let i = 1; i <= forecastPeriods; i++) {
      forecasts.push(Math.max(0, Math.round(lastMA + trend * i)))
    }
    
    return forecasts
  }

  /**
   * Generate exponential smoothing forecasts
   */
  static generateExponentialSmoothingForecasts(trainingData, forecastPeriods) {
    const quantities = trainingData.map(item => item.soldQuantity)
    const alpha = 0.3 // Smoothing factor
    
    // Calculate exponential smoothing
    let smoothed = quantities[0]
    const smoothedValues = [smoothed]
    
    for (let i = 1; i < quantities.length; i++) {
      smoothed = alpha * quantities[i] + (1 - alpha) * smoothed
      smoothedValues.push(smoothed)
    }
    
    // Calculate trend
    const trend = smoothedValues.length > 1 ? 
      (smoothedValues[smoothedValues.length - 1] - smoothedValues[0]) / (smoothedValues.length - 1) : 0
    
    const forecasts = []
    const lastSmoothed = smoothedValues[smoothedValues.length - 1]
    
    for (let i = 1; i <= forecastPeriods; i++) {
      forecasts.push(Math.max(0, Math.round(lastSmoothed + trend * i)))
    }
    
    return forecasts
  }

  /**
   * Calculate seasonal factors from training data
   */
  static calculateSeasonalFactors(trainingData) {
    const monthlyAverages = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }))
    
    trainingData.forEach(item => {
      const month = item.date.getMonth()
      monthlyAverages[month].sum += item.soldQuantity
      monthlyAverages[month].count += 1
    })
    
    // Calculate average for each month
    const monthlyMeans = monthlyAverages.map(month => 
      month.count > 0 ? month.sum / month.count : 0
    )
    
    // Calculate overall mean
    const overallMean = monthlyMeans.reduce((sum, mean) => sum + mean, 0) / 
                       monthlyMeans.filter(mean => mean > 0).length
    
    // Calculate seasonal factors
    const seasonalFactors = {}
    monthlyMeans.forEach((mean, month) => {
      if (mean > 0) {
        seasonalFactors[month] = mean / overallMean
      }
    })
    
    return seasonalFactors
  }

  /**
   * Calculate weights for combining different forecasting methods
   */
  static calculateForecastWeights(trainingData, forecastIndex) {
    // Base weights - can be adjusted based on data characteristics
    const baseWeights = {
      linear: 0.4,
      movingAvg: 0.3,
      expSmoothing: 0.3
    }
    
    // Adjust weights based on data volatility
    const quantities = trainingData.map(item => item.soldQuantity)
    const volatility = this.calculateVolatility(quantities)
    
    if (volatility > 0.5) {
      // High volatility - favor moving average and exponential smoothing
      return {
        linear: 0.2,
        movingAvg: 0.4,
        expSmoothing: 0.4
      }
    } else if (volatility < 0.2) {
      // Low volatility - favor linear trend
      return {
        linear: 0.6,
        movingAvg: 0.2,
        expSmoothing: 0.2
      }
    }
    
    return baseWeights
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  static calculateVolatility(quantities) {
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length
    const variance = quantities.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / quantities.length
    const stdDev = Math.sqrt(variance)
    
    return mean > 0 ? stdDev / mean : 0
  }

  /**
   * Calculate Mean Absolute Error (MAE)
   */
  static calculateMAE(comparisonData) {
    const absoluteErrors = comparisonData.map(item => Math.abs(item.actual - item.forecast))
    return absoluteErrors.reduce((sum, error) => sum + error, 0) / absoluteErrors.length
  }

  /**
   * Calculate Mean Absolute Percentage Error (MAPE)
   */
  static calculateMAPE(comparisonData) {
    const percentageErrors = comparisonData
      .filter(item => item.actual > 0) // Avoid division by zero
      .map(item => Math.abs((item.actual - item.forecast) / item.actual) * 100)
    
    return percentageErrors.length > 0 ? 
      percentageErrors.reduce((sum, error) => sum + error, 0) / percentageErrors.length : 0
  }

  /**
   * Calculate Root Mean Square Error (RMSE)
   */
  static calculateRMSE(comparisonData) {
    const squaredErrors = comparisonData.map(item => Math.pow(item.actual - item.forecast, 2))
    const meanSquaredError = squaredErrors.reduce((sum, error) => sum + error, 0) / squaredErrors.length
    return Math.sqrt(meanSquaredError)
  }

  /**
   * Categorize forecast accuracy based on MAPE
   */
  static categorizeAccuracy(mape) {
    if (mape <= 10) return 'Good'
    if (mape <= 25) return 'Medium'
    return 'Poor'
  }

  /**
   * Calculate confidence level based on data points, accuracy, and training data size
   */
  static calculateConfidence(dataPoints, mape, trainingMonths) {
    if (dataPoints < 2) return 0

    // Base confidence on sample size and training data
    const dataConfidence = Math.min(dataPoints / 6, 1) // Max confidence at 6+ data points
    const trainingConfidence = Math.min(trainingMonths / 12, 1) // Max confidence at 12+ training months
    
    // Adjust confidence based on accuracy
    const accuracyFactor = mape <= 10 ? 1.0 : mape <= 25 ? 0.8 : 0.6
    
    return (dataConfidence * 0.4 + trainingConfidence * 0.6) * accuracyFactor
  }

  /**
   * Generate recommendation based on accuracy
   */
  static generateRecommendation(accuracy, mape, sku) {
    const productName = sku || 'this product'
    
    switch (accuracy) {
      case 'Good':
        return `Forecast for ${productName} is highly reliable (${mape.toFixed(1)}% error). Safe to use for planning and inventory decisions.`
      case 'Medium':
        return `Forecast for ${productName} has moderate reliability (${mape.toFixed(1)}% error). Use with caution and consider additional factors.`
      case 'Poor':
        return `Forecast for ${productName} has low reliability (${mape.toFixed(1)}% error). Consider alternative forecasting methods or more data.`
      default:
        return `Unable to assess forecast reliability for ${productName}.`
    }
  }

  /**
   * Calculate accuracy metrics for all products
   */
  static async calculateAllProductsAccuracy(historicalData, forecastData) {
    if (!historicalData || historicalData.length === 0) return null

    // Get unique SKUs
    const allSkus = [...new Set(historicalData.map(item => item.sku))].filter(Boolean)

    const productAccuracies = {}
    const categorySummary = { Good: 0, Medium: 0, Poor: 0 }

    // Process all SKUs asynchronously
    const accuracyPromises = allSkus.map(async (sku) => {
      const accuracy = await this.calculateForecastAccuracy(historicalData, forecastData, sku)
      return { sku, accuracy }
    })

    const results = await Promise.all(accuracyPromises)
    
    results.forEach(({ sku, accuracy }) => {
      productAccuracies[sku] = accuracy
      categorySummary[accuracy.accuracy]++
    })

    const totalProducts = allSkus.length
    const overallAccuracy = {
      goodPercentage: totalProducts > 0 ? (categorySummary.Good / totalProducts) * 100 : 0,
      mediumPercentage: totalProducts > 0 ? (categorySummary.Medium / totalProducts) * 100 : 0,
      poorPercentage: totalProducts > 0 ? (categorySummary.Poor / totalProducts) * 100 : 0,
      averageMape: Object.values(productAccuracies).reduce((sum, acc) => sum + acc.mape, 0) / totalProducts,
      totalProducts
    }

    return {
      productAccuracies,
      categorySummary,
      overallAccuracy
    }
  }

  /**
   * Get products by accuracy category
   */
  static getProductsByCategory(productAccuracies, category) {
    return Object.entries(productAccuracies)
      .filter(([sku, accuracy]) => accuracy.accuracy === category)
      .map(([sku, accuracy]) => ({
        sku,
        accuracy: accuracy.accuracy,
        mae: accuracy.mae,
        mape: accuracy.mape,
        rmse: accuracy.rmse,
        confidence: accuracy.confidence,
        recommendation: accuracy.recommendation
      }))
      .sort((a, b) => a.mape - b.mape) // Sort by accuracy (best first)
  }
}

export default ForecastAccuracyService 