from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import math
import statistics

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class SimpleForecastingService:
    """Simplified forecasting service using basic Python libraries"""
    
    def __init__(self):
        self.models = {}
    
    def prepare_data(self, sales_data: List[Dict]) -> List[Dict]:
        """Convert sales data to sorted format"""
        # Sort by date
        sorted_data = sorted(sales_data, key=lambda x: x['date'])
        
        # Convert sales to float and handle missing values
        for item in sorted_data:
            item['sales'] = float(item.get('sales', 0))
        
        return sorted_data
    
    def calculate_accuracy_metrics(self, actual: List[float], forecast: List[float]) -> Dict[str, float]:
        """Calculate MAE, MAPE, RMSE using basic math"""
        if len(actual) != len(forecast) or len(actual) == 0:
            return {'mae': 0, 'mape': 0, 'rmse': 0}
        
        # Calculate MAE
        mae = sum(abs(a - f) for a, f in zip(actual, forecast)) / len(actual)
        
        # Calculate MAPE
        mape_errors = []
        for a, f in zip(actual, forecast):
            if a > 0:  # Avoid division by zero
                mape_errors.append(abs((a - f) / a) * 100)
        mape = statistics.mean(mape_errors) if mape_errors else 0
        
        # Calculate RMSE
        rmse = math.sqrt(sum((a - f) ** 2 for a, f in zip(actual, forecast)) / len(actual))
        
        return {'mae': mae, 'mape': mape, 'rmse': rmse}
    
    def categorize_accuracy(self, mape: float) -> str:
        """Categorize forecast accuracy based on MAPE"""
        if mape <= 10:
            return 'Good'
        elif mape <= 25:
            return 'Medium'
        else:
            return 'Poor'
    
    def moving_average_forecast(self, data: List[float], periods: int) -> List[float]:
        """Simple moving average forecast"""
        if len(data) < 2:
            return [data[0]] * periods if data else [0] * periods
        
        window = min(6, len(data) // 2)
        ma = sum(data[-window:]) / window
        
        # Calculate simple trend
        if len(data) >= window * 2:
            recent_avg = sum(data[-window:]) / window
            older_avg = sum(data[-window*2:-window]) / window
            trend = (recent_avg - older_avg) / window
        else:
            trend = 0
        
        return [max(0, ma + trend * (i + 1)) for i in range(periods)]
    
    def exponential_smoothing_forecast(self, data: List[float], periods: int, alpha: float = 0.3) -> List[float]:
        """Exponential smoothing forecast"""
        if not data:
            return [0] * periods
        
        # Calculate exponential smoothing
        smoothed = [data[0]]
        for i in range(1, len(data)):
            smoothed.append(alpha * data[i] + (1 - alpha) * smoothed[i-1])
        
        # Calculate trend
        if len(smoothed) > 1:
            trend = (smoothed[-1] - smoothed[0]) / len(smoothed)
        else:
            trend = 0
        
        return [max(0, smoothed[-1] + trend * (i + 1)) for i in range(periods)]
    
    def linear_trend_forecast(self, data: List[float], periods: int) -> List[float]:
        """Linear trend forecast"""
        if len(data) < 2:
            return [data[0]] * periods if data else [0] * periods
        
        # Simple linear regression
        n = len(data)
        x_values = list(range(n))
        y_values = data
        
        # Calculate means
        x_mean = sum(x_values) / n
        y_mean = sum(y_values) / n
        
        # Calculate slope and intercept
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        intercept = y_mean - slope * x_mean
        
        # Generate forecasts
        forecasts = []
        for i in range(periods):
            forecast_value = intercept + slope * (n + i)
            forecasts.append(max(0, forecast_value))
        
        return forecasts
    
    def generate_ensemble_forecast(self, sales_data: List[Dict], periods: int = 12) -> Dict[str, Any]:
        """Generate ensemble forecast using multiple methods"""
        try:
            sorted_data = self.prepare_data(sales_data)
            
            if len(sorted_data) < 6:
                raise ValueError("Insufficient data for forecasting (minimum 6 data points)")
            
            # Extract sales values
            sales_values = [item['sales'] for item in sorted_data]
            
            # Generate forecasts using all methods
            ma_forecast = self.moving_average_forecast(sales_values, periods)
            es_forecast = self.exponential_smoothing_forecast(sales_values, periods)
            lt_forecast = self.linear_trend_forecast(sales_values, periods)
            
            # Combine forecasts (weighted average)
            weights = [0.3, 0.4, 0.3]  # MA, ES, Linear Trend
            ensemble_forecast = []
            
            for i in range(periods):
                combined = (
                    ma_forecast[i] * weights[0] +
                    es_forecast[i] * weights[1] +
                    lt_forecast[i] * weights[2]
                )
                ensemble_forecast.append(max(0, combined))
            
            # Generate forecast dates
            last_date = datetime.strptime(sorted_data[-1]['date'], '%Y-%m-%d')
            forecast_dates = [last_date + timedelta(days=30*i) for i in range(1, periods+1)]
            
            # Calculate confidence intervals
            std_dev = statistics.stdev(sales_values) if len(sales_values) > 1 else 0
            confidence_interval = std_dev * 1.96  # 95% confidence
            
            forecast_data = []
            for i, (date, value) in enumerate(zip(forecast_dates, ensemble_forecast)):
                forecast_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'sales': round(value, 2),
                    'upperBound': round(value + confidence_interval, 2),
                    'lowerBound': round(max(0, value - confidence_interval), 2)
                })
            
            return {
                'success': True,
                'forecast': forecast_data,
                'model': {
                    'type': 'Ensemble (MA + ES + Linear Trend)',
                    'methods': ['Moving Average', 'Exponential Smoothing', 'Linear Trend'],
                    'weights': weights,
                    'lastTrainingDate': last_date.strftime('%Y-%m-%d')
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_forecast_accuracy(self, sales_data: List[Dict], product_id: str = None) -> Dict[str, Any]:
        """Calculate forecast accuracy using train/validation split"""
        try:
            sorted_data = self.prepare_data(sales_data)
            
            if len(sorted_data) < 8:
                return {
                    'success': False,
                    'error': 'Insufficient data for accuracy assessment (minimum 8 data points)'
                }
            
            # Split data: 70% training, 30% validation
            split_idx = int(len(sorted_data) * 0.7)
            train_data = sorted_data[:split_idx]
            validation_data = sorted_data[split_idx:]
            
            if len(validation_data) < 2:
                return {
                    'success': False,
                    'error': 'Insufficient validation data'
                }
            
            # Generate forecast for validation period
            forecast_periods = len(validation_data)
            forecast_result = self.generate_ensemble_forecast(train_data, forecast_periods)
            
            if not forecast_result['success']:
                return forecast_result
            
            # Compare forecast with actual validation data
            actual_values = [item['sales'] for item in validation_data]
            forecast_values = [f['sales'] for f in forecast_result['forecast'][:len(actual_values)]]
            
            # Calculate accuracy metrics
            metrics = self.calculate_accuracy_metrics(actual_values, forecast_values)
            accuracy_category = self.categorize_accuracy(metrics['mape'])
            
            # Calculate confidence level
            confidence = min(1.0, len(validation_data) / 6) * (1 - metrics['mape'] / 100)
            confidence = max(0, confidence)
            
            return {
                'success': True,
                'mae': metrics['mae'],
                'mape': metrics['mape'],
                'rmse': metrics['rmse'],
                'accuracy': accuracy_category,
                'confidence': round(confidence, 3),
                'dataPoints': len(validation_data),
                'trainingMonths': len(train_data),
                'validationMonths': len(validation_data),
                'totalMonths': len(sorted_data),
                'comparisonData': [
                    {
                        'actual': float(actual),
                        'forecast': float(forecast),
                        'date': validation_data[i]['date']
                    }
                    for i, (actual, forecast) in enumerate(zip(actual_values, forecast_values))
                ]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Initialize forecasting service
forecasting_service = SimpleForecastingService()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Simple Forecasting API is running'})

@app.route('/api/forecast', methods=['POST'])
def generate_forecast():
    """Generate forecast for sales data"""
    try:
        data = request.get_json()
        sales_data = data.get('salesData', [])
        periods = data.get('periods', 12)
        product_id = data.get('productId')
        
        if not sales_data:
            return jsonify({'success': False, 'error': 'No sales data provided'}), 400
        
        result = forecasting_service.generate_ensemble_forecast(sales_data, periods)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accuracy', methods=['POST'])
def calculate_accuracy():
    """Calculate forecast accuracy metrics"""
    try:
        data = request.get_json()
        sales_data = data.get('salesData', [])
        product_id = data.get('productId')
        
        if not sales_data:
            return jsonify({'success': False, 'error': 'No sales data provided'}), 400
        
        result = forecasting_service.calculate_forecast_accuracy(sales_data, product_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/accuracy/all', methods=['POST'])
def calculate_all_accuracy():
    """Calculate accuracy for all products"""
    try:
        data = request.get_json()
        sales_data = data.get('salesData', [])
        
        if not sales_data:
            return jsonify({'success': False, 'error': 'No sales data provided'}), 400
        
        # Group by product/SKU
        product_groups = {}
        for item in sales_data:
            sku = item.get('sku', 'Unknown')
            if sku not in product_groups:
                product_groups[sku] = []
            product_groups[sku].append(item)
        
        results = {}
        category_summary = {'Good': 0, 'Medium': 0, 'Poor': 0}
        
        for sku, group_data in product_groups.items():
            accuracy_result = forecasting_service.calculate_forecast_accuracy(group_data, sku)
            
            if accuracy_result['success']:
                results[sku] = accuracy_result
                category_summary[accuracy_result['accuracy']] += 1
            else:
                results[sku] = {
                    'success': False,
                    'error': accuracy_result['error'],
                    'mae': 0, 'mape': 0, 'rmse': 0,
                    'accuracy': 'Poor', 'confidence': 0
                }
                category_summary['Poor'] += 1
        
        # Calculate overall statistics
        total_products = len(results)
        successful_products = [r for r in results.values() if r['success']]
        
        overall_accuracy = {
            'goodPercentage': (category_summary['Good'] / total_products * 100) if total_products > 0 else 0,
            'mediumPercentage': (category_summary['Medium'] / total_products * 100) if total_products > 0 else 0,
            'poorPercentage': (category_summary['Poor'] / total_products * 100) if total_products > 0 else 0,
            'averageMape': sum(r['mape'] for r in successful_products) / len(successful_products) if successful_products else 0,
            'totalProducts': total_products
        }
        
        return jsonify({
            'success': True,
            'productAccuracies': results,
            'categorySummary': category_summary,
            'overallAccuracy': overall_accuracy
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 