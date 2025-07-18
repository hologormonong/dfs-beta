class PythonForecastService {
  constructor() {
    this.baseUrl = 'http://localhost:5000/api';
  }

  /**
   * Check if the Python backend is running
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Python backend not available:', error);
      return false;
    }
  }

  /**
   * Generate forecast using Python backend
   * @param {Array} salesData - Historical sales data
   * @param {number} periods - Number of periods to forecast
   * @param {string} productId - Product identifier
   * @returns {Object} - Forecast results
   */
  async generateForecast(salesData, periods = 12, productId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesData,
          periods,
          productId
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Forecasting failed');
      }

      return result;
    } catch (error) {
      console.error('Forecast generation error:', error);
      throw error;
    }
  }

  /**
   * Calculate forecast accuracy using Python backend
   * @param {Array} salesData - Historical sales data
   * @param {string} productId - Product identifier
   * @returns {Object} - Accuracy metrics
   */
  async calculateAccuracy(salesData, productId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/accuracy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesData,
          productId
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Accuracy calculation failed');
      }

      return result;
    } catch (error) {
      console.error('Accuracy calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate accuracy for all products using Python backend
   * @param {Array} salesData - Historical sales data for all products
   * @returns {Object} - Accuracy results for all products
   */
  async calculateAllProductsAccuracy(salesData) {
    try {
      const response = await fetch(`${this.baseUrl}/accuracy/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesData
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Accuracy calculation failed');
      }

      return result;
    } catch (error) {
      console.error('All products accuracy calculation error:', error);
      throw error;
    }
  }

  /**
   * Generate ensemble forecast with multiple methods
   * @param {Array} salesData - Historical sales data
   * @param {number} periods - Number of periods to forecast
   * @param {string} productId - Product identifier
   * @returns {Object} - Ensemble forecast results
   */
  async generateEnsembleForecast(salesData, periods = 12, productId = null) {
    // This uses the same endpoint as generateForecast since the Python backend
    // already implements ensemble forecasting
    return this.generateForecast(salesData, periods, productId);
  }
}

export default new PythonForecastService(); 