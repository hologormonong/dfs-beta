import ARIMA from 'arima';

class ARIMAForecastService {
  constructor() {
    this.models = new Map();
  }

  /**
   * Prepare time series data for ARIMA
   * @param {Array} salesData - Array of sales data objects
   * @returns {Object} - Prepared data with dates and values
   */
  prepareTimeSeriesData(salesData) {
    // Sort by date
    const sortedData = salesData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Extract values and dates
    const values = sortedData.map(item => parseFloat(item.sales) || 0);
    const dates = sortedData.map(item => new Date(item.date));
    
    return { values, dates, sortedData };
  }

  /**
   * Generate forecast using ARIMA model
   * @param {Array} salesData - Historical sales data
   * @param {number} periods - Number of periods to forecast
   * @param {string} productId - Product identifier for caching
   * @returns {Object} - Forecast results
   */
  async generateForecast(salesData, periods = 12, productId = null) {
    try {
      const { values, dates, sortedData } = this.prepareTimeSeriesData(salesData);
      
      if (values.length < 3) {
        throw new Error('Insufficient data for forecasting (minimum 3 data points required)');
      }

      // Check if we have a cached model for this product
      let model = this.models.get(productId);
      
      if (!model) {
        // Create new ARIMA model with auto-parameter selection
        model = new ARIMA({
          p: 1, // AR order
          d: 1, // Difference order
          q: 1, // MA order
          verbose: false
        });
        
        // Train the model
        model.train(values);
        
        // Cache the model
        if (productId) {
          this.models.set(productId, model);
        }
      }

      // Generate forecast
      const forecast = model.predict(periods);
      
      // Generate forecast dates
      const lastDate = dates[dates.length - 1];
      const forecastDates = [];
      for (let i = 1; i <= periods; i++) {
        const newDate = new Date(lastDate);
        newDate.setMonth(lastDate.getMonth() + i);
        forecastDates.push(newDate);
      }

      // Calculate confidence intervals (simplified)
      const stdDev = this.calculateStandardDeviation(values);
      const confidenceInterval = stdDev * 1.96; // 95% confidence interval

      const forecastData = forecastDates.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        sales: Math.max(0, forecast[index]), // Ensure non-negative
        upperBound: Math.max(0, forecast[index] + confidenceInterval),
        lowerBound: Math.max(0, forecast[index] - confidenceInterval)
      }));

      return {
        historical: sortedData,
        forecast: forecastData,
        model: {
          type: 'ARIMA',
          parameters: { p: 1, d: 1, q: 1 },
          lastTrainingDate: dates[dates.length - 1]
        }
      };

    } catch (error) {
      console.error('ARIMA forecasting error:', error);
      throw error;
    }
  }

  /**
   * Calculate standard deviation for confidence intervals
   * @param {Array} values - Array of numerical values
   * @returns {number} - Standard deviation
   */
  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Generate multiple forecasts with different ARIMA parameters
   * @param {Array} salesData - Historical sales data
   * @param {number} periods - Number of periods to forecast
   * @param {string} productId - Product identifier
   * @returns {Object} - Ensemble forecast results
   */
  async generateEnsembleForecast(salesData, periods = 12, productId = null) {
    try {
      const { values, dates, sortedData } = this.prepareTimeSeriesData(salesData);
      
      if (values.length < 6) {
        throw new Error('Insufficient data for ensemble forecasting (minimum 6 data points required)');
      }

      // Different ARIMA parameter combinations
      const parameterSets = [
        { p: 1, d: 1, q: 1 }, // Basic ARIMA
        { p: 2, d: 1, q: 1 }, // Higher AR order
        { p: 1, d: 1, q: 2 }, // Higher MA order
        { p: 0, d: 1, q: 1 }, // IMA model
        { p: 1, d: 0, q: 1 }  // ARMA model
      ];

      const forecasts = [];
      
      for (const params of parameterSets) {
        try {
          const model = new ARIMA({
            ...params,
            verbose: false
          });
          
          model.train(values);
          const prediction = model.predict(periods);
          forecasts.push(prediction);
        } catch (error) {
          console.warn(`ARIMA model with params ${JSON.stringify(params)} failed:`, error);
        }
      }

      if (forecasts.length === 0) {
        throw new Error('All ARIMA models failed to generate forecasts');
      }

      // Calculate ensemble forecast (weighted average)
      const ensembleForecast = [];
      for (let i = 0; i < periods; i++) {
        let sum = 0;
        let count = 0;
        
        for (const forecast of forecasts) {
          if (forecast[i] !== undefined && !isNaN(forecast[i])) {
            sum += forecast[i];
            count++;
          }
        }
        
        ensembleForecast.push(count > 0 ? sum / count : 0);
      }

      // Generate forecast dates
      const lastDate = dates[dates.length - 1];
      const forecastDates = [];
      for (let i = 1; i <= periods; i++) {
        const newDate = new Date(lastDate);
        newDate.setMonth(lastDate.getMonth() + i);
        forecastDates.push(newDate);
      }

      const forecastData = forecastDates.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        sales: Math.max(0, ensembleForecast[index])
      }));

      return {
        historical: sortedData,
        forecast: forecastData,
        model: {
          type: 'Ensemble ARIMA',
          parameterSets,
          modelsUsed: forecasts.length,
          lastTrainingDate: dates[dates.length - 1]
        }
      };

    } catch (error) {
      console.error('Ensemble ARIMA forecasting error:', error);
      throw error;
    }
  }

  /**
   * Clear cached models
   */
  clearCache() {
    this.models.clear();
  }
}

export default new ARIMAForecastService(); 