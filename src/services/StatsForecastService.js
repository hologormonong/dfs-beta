import { format, addMonths } from 'date-fns'

class StatsForecastService {
  /**
   * Generate forecasts using StatsForecast models
   * @param {Array} historicalData - Historical sales data
   * @param {string} sku - Product SKU (optional)
   * @param {number} forecastPeriods - Number of periods to forecast
   * @returns {Object} Forecast results with accuracy metrics
   */
  static async generateForecasts(historicalData, sku = null, forecastPeriods = 12) {
    try {
      // Filter data by SKU if provided
      const filteredData = sku ? historicalData.filter(item => item.sku === sku) : historicalData
      
      if (filteredData.length < 8) {
        return {
          success: false,
          error: 'Insufficient data for forecasting (need at least 8 months)',
          forecasts: [],
          accuracy: null
        }
      }

      // Group data by month
      const monthlyData = this.groupByMonth(filteredData)
      const timeSeries = this.prepareTimeSeries(monthlyData)
      
      // Split data for validation (70% training, 30% validation)
      const splitIndex = Math.floor(timeSeries.length * 0.7)
      const trainingData = timeSeries.slice(0, splitIndex)
      const validationData = timeSeries.slice(splitIndex)
      
      if (trainingData.length < 4 || validationData.length < 2) {
        return {
          success: false,
          error: 'Insufficient data split for validation',
          forecasts: [],
          accuracy: null
        }
      }

      // Generate forecasts using multiple models
      const forecasts = await this.runMultipleModels(trainingData, forecastPeriods)
      
      // Calculate accuracy metrics
      const accuracy = this.calculateAccuracy(validationData, forecasts.validation)
      
      return {
        success: true,
        forecasts: forecasts.future,
        accuracy,
        trainingMonths: trainingData.length,
        validationMonths: validationData.length,
        totalMonths: timeSeries.length
      }
    } catch (error) {
      console.error('Forecasting error:', error)
      return {
        success: false,
        error: error.message,
        forecasts: [],
        accuracy: null
      }
    }
  }

  /**
   * Group data by month
   */
  static groupByMonth(data) {
    const monthlyData = {}
    
    data.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          soldQuantity: 0,
          revenue: 0,
          count: 0
        }
      }
      monthlyData[monthKey].soldQuantity += item.soldQuantity
      monthlyData[monthKey].revenue += (item.revenue || item.soldRevenue || 0)
      monthlyData[monthKey].count += 1
    })

    return monthlyData
  }

  /**
   * Prepare time series data for forecasting
   */
  static prepareTimeSeries(monthlyData) {
    return Object.entries(monthlyData)
      .map(([monthKey, values]) => ({
        date: new Date(monthKey + '-01'),
        soldQuantity: values.soldQuantity,
        revenue: values.revenue
      }))
      .sort((a, b) => a.date - b.date)
  }

  /**
   * Run multiple forecasting models
   */
  static async runMultipleModels(trainingData, forecastPeriods) {
    // For now, implement a simplified version that mimics StatsForecast behavior
    // In production, you would use the actual StatsForecast library
    
    const quantities = trainingData.map(item => item.soldQuantity)
    const revenues = trainingData.map(item => item.revenue)
    
    // Model 1: AutoARIMA-like (ARIMA with automatic parameter selection)
    const arimaForecasts = this.generateARIMAForecasts(quantities, forecastPeriods)
    
    // Model 2: ETS-like (Exponential Smoothing)
    const etsForecasts = this.generateETSForecasts(quantities, forecastPeriods)
    
    // Model 3: Theta-like (Decomposition)
    const thetaForecasts = this.generateThetaForecasts(quantities, forecastPeriods)
    
    // Combine forecasts using weighted average
    const combinedForecasts = []
    for (let i = 0; i < forecastPeriods; i++) {
      const weights = this.calculateModelWeights(quantities, i)
      
      const combinedQuantity = Math.round(
        (arimaForecasts[i] * weights.arima +
         etsForecasts[i] * weights.ets +
         thetaForecasts[i] * weights.theta) / 
        (weights.arima + weights.ets + weights.theta)
      )
      
      // Calculate revenue using average price
      const avgPrice = revenues.reduce((sum, rev, idx) => sum + (rev / quantities[idx]), 0) / quantities.length
      const forecastRevenue = combinedQuantity * avgPrice
      
      combinedForecasts.push({
        soldQuantity: Math.max(0, combinedQuantity),
        revenue: forecastRevenue
      })
    }
    
    // Generate validation forecasts (for accuracy calculation)
    const validationForecasts = this.generateValidationForecasts(trainingData, trainingData.length - 1)
    
    return {
      future: combinedForecasts,
      validation: validationForecasts
    }
  }

  /**
   * Generate ARIMA-like forecasts
   */
  static generateARIMAForecasts(quantities, forecastPeriods) {
    const n = quantities.length
    
    // Calculate trend using linear regression
    const xValues = Array.from({length: n}, (_, i) => i)
    const yValues = quantities
    
    const { slope, intercept } = this.linearRegression(xValues, yValues)
    
    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors(quantities)
    
    const forecasts = []
    for (let i = 1; i <= forecastPeriods; i++) {
      const trendValue = intercept + slope * (n + i - 1)
      const month = (n + i - 1) % 12
      const seasonalFactor = seasonalFactors[month] || 1.0
      
      forecasts.push(Math.max(0, Math.round(trendValue * seasonalFactor)))
    }
    
    return forecasts
  }

  /**
   * Generate ETS-like forecasts (Exponential Smoothing)
   */
  static generateETSForecasts(quantities, forecastPeriods) {
    const alpha = 0.3 // Smoothing factor
    const beta = 0.1  // Trend smoothing factor
    const gamma = 0.1 // Seasonal smoothing factor
    
    // Initialize
    let level = quantities[0]
    let trend = 0
    const seasonals = Array(12).fill(0)
    
    // Calculate initial seasonal factors
    for (let i = 0; i < Math.min(12, quantities.length); i++) {
      seasonals[i] = quantities[i] || 0
    }
    
    // Apply triple exponential smoothing
    for (let i = 1; i < quantities.length; i++) {
      const oldLevel = level
      level = alpha * (quantities[i] - seasonals[i % 12]) + (1 - alpha) * (level + trend)
      trend = beta * (level - oldLevel) + (1 - beta) * trend
      seasonals[i % 12] = gamma * (quantities[i] - level) + (1 - gamma) * seasonals[i % 12]
    }
    
    // Generate forecasts
    const forecasts = []
    for (let i = 1; i <= forecastPeriods; i++) {
      const forecast = level + trend * i + seasonals[(quantities.length + i - 1) % 12]
      forecasts.push(Math.max(0, Math.round(forecast)))
    }
    
    return forecasts
  }

  /**
   * Generate Theta-like forecasts
   */
  static generateThetaForecasts(quantities, forecastPeriods) {
    const n = quantities.length
    
    // Decompose series into trend and seasonality
    const trend = this.calculateTrend(quantities)
    const seasonal = this.calculateSeasonal(quantities)
    
    // Generate forecasts
    const forecasts = []
    for (let i = 1; i <= forecastPeriods; i++) {
      const trendComponent = trend[n - 1] + (trend[1] - trend[0]) * i
      const seasonalComponent = seasonal[(n + i - 1) % 12]
      const forecast = trendComponent + seasonalComponent
      
      forecasts.push(Math.max(0, Math.round(forecast)))
    }
    
    return forecasts
  }

  /**
   * Calculate linear regression
   */
  static linearRegression(xValues, yValues) {
    const n = xValues.length
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = yValues.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return { slope, intercept }
  }

  /**
   * Calculate seasonal factors
   */
  static calculateSeasonalFactors(quantities) {
    const monthlyAverages = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }))
    
    quantities.forEach((qty, i) => {
      const month = i % 12
      monthlyAverages[month].sum += qty
      monthlyAverages[month].count += 1
    })
    
    const monthlyMeans = monthlyAverages.map(month => 
      month.count > 0 ? month.sum / month.count : 0
    )
    
    const overallMean = monthlyMeans.reduce((sum, mean) => sum + mean, 0) / 
                       monthlyMeans.filter(mean => mean > 0).length
    
    const seasonalFactors = {}
    monthlyMeans.forEach((mean, month) => {
      if (mean > 0) {
        seasonalFactors[month] = mean / overallMean
      }
    })
    
    return seasonalFactors
  }

  /**
   * Calculate trend component
   */
  static calculateTrend(quantities) {
    const n = quantities.length
    const trend = []
    
    for (let i = 0; i < n; i++) {
      const window = Math.min(5, Math.floor(n / 2))
      const start = Math.max(0, i - window)
      const end = Math.min(n, i + window + 1)
      const windowData = quantities.slice(start, end)
      
      const avg = windowData.reduce((sum, val) => sum + val, 0) / windowData.length
      trend.push(avg)
    }
    
    return trend
  }

  /**
   * Calculate seasonal component
   */
  static calculateSeasonal(quantities) {
    const seasonal = Array(12).fill(0)
    const counts = Array(12).fill(0)
    
    quantities.forEach((qty, i) => {
      const month = i % 12
      seasonal[month] += qty
      counts[month] += 1
    })
    
    return seasonal.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0)
  }

  /**
   * Calculate model weights based on data characteristics
   */
  static calculateModelWeights(quantities, forecastIndex) {
    const volatility = this.calculateVolatility(quantities)
    const trend = this.calculateTrendStrength(quantities)
    const seasonality = this.calculateSeasonalityStrength(quantities)
    
    // Base weights
    let weights = {
      arima: 0.4,
      ets: 0.3,
      theta: 0.3
    }
    
    // Adjust based on data characteristics
    if (volatility > 0.5) {
      weights = { arima: 0.2, ets: 0.5, theta: 0.3 } // High volatility favors ETS
    } else if (trend > 0.3) {
      weights = { arima: 0.5, ets: 0.3, theta: 0.2 } // Strong trend favors ARIMA
    } else if (seasonality > 0.4) {
      weights = { arima: 0.3, ets: 0.4, theta: 0.3 } // Strong seasonality favors ETS
    }
    
    return weights
  }

  /**
   * Calculate volatility
   */
  static calculateVolatility(quantities) {
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length
    const variance = quantities.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / quantities.length
    const stdDev = Math.sqrt(variance)
    
    return mean > 0 ? stdDev / mean : 0
  }

  /**
   * Calculate trend strength
   */
  static calculateTrendStrength(quantities) {
    const { slope } = this.linearRegression(
      Array.from({length: quantities.length}, (_, i) => i),
      quantities
    )
    
    const mean = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length
    return mean > 0 ? Math.abs(slope) / mean : 0
  }

  /**
   * Calculate seasonality strength
   */
  static calculateSeasonalityStrength(quantities) {
    const seasonalFactors = this.calculateSeasonalFactors(quantities)
    const factors = Object.values(seasonalFactors)
    
    if (factors.length === 0) return 0
    
    const mean = factors.reduce((sum, factor) => sum + factor, 0) / factors.length
    const variance = factors.reduce((sum, factor) => sum + Math.pow(factor - mean, 2), 0) / factors.length
    
    return Math.sqrt(variance) / mean
  }

  /**
   * Generate validation forecasts
   */
  static generateValidationForecasts(trainingData, validationPeriods) {
    const quantities = trainingData.map(item => item.soldQuantity)
    const forecasts = []
    
    for (let i = 1; i <= validationPeriods; i++) {
      const availableData = quantities.slice(0, quantities.length - validationPeriods + i - 1)
      const forecast = this.generateSingleForecast(availableData, 1)[0]
      forecasts.push(forecast)
    }
    
    return forecasts
  }

  /**
   * Generate single forecast
   */
  static generateSingleForecast(quantities, periods) {
    const arimaForecasts = this.generateARIMAForecasts(quantities, periods)
    const etsForecasts = this.generateETSForecasts(quantities, periods)
    const thetaForecasts = this.generateThetaForecasts(quantities, periods)
    
    const weights = this.calculateModelWeights(quantities, 0)
    
    const combined = []
    for (let i = 0; i < periods; i++) {
      const forecast = Math.round(
        (arimaForecasts[i] * weights.arima +
         etsForecasts[i] * weights.ets +
         thetaForecasts[i] * weights.theta) / 
        (weights.arima + weights.ets + weights.theta)
      )
      combined.push(Math.max(0, forecast))
    }
    
    return combined
  }

  /**
   * Calculate accuracy metrics
   */
  static calculateAccuracy(actualData, forecastData) {
    if (actualData.length !== forecastData.length || actualData.length === 0) {
      return {
        mae: 0,
        mape: 0,
        rmse: 0,
        accuracy: 'Poor',
        confidence: 0
      }
    }

    const actual = actualData.map(item => item.soldQuantity)
    const forecast = forecastData

    // Calculate MAE
    const mae = actual.reduce((sum, act, i) => sum + Math.abs(act - forecast[i]), 0) / actual.length

    // Calculate MAPE
    const mape = actual
      .filter((act, i) => act > 0)
      .reduce((sum, act, i) => sum + Math.abs((act - forecast[i]) / act), 0) / actual.filter(act => act > 0).length * 100

    // Calculate RMSE
    const rmse = Math.sqrt(actual.reduce((sum, act, i) => sum + Math.pow(act - forecast[i], 2), 0) / actual.length)

    // Categorize accuracy
    const accuracy = mape <= 10 ? 'Good' : mape <= 25 ? 'Medium' : 'Poor'

    // Calculate confidence
    const confidence = Math.min(actual.length / 6, 1) * (mape <= 10 ? 1.0 : mape <= 25 ? 0.8 : 0.6)

    return {
      mae,
      mape,
      rmse,
      accuracy,
      confidence
    }
  }
}

export default StatsForecastService 