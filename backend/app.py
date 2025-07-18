from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class ForecastingService:
    """Advanced forecasting service using statistical models"""
    
    def __init__(self):
        self.models = {}
    
    def prepare_data(self, sales_data: List[Dict]) -> pd.DataFrame:
        """Convert sales data to pandas DataFrame for analysis"""
        df = pd.DataFrame(sales_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        df['sales'] = pd.to_numeric(df['sales'], errors='coerce').fillna(0)
        return df
    
    def calculate_accuracy_metrics(self, actual: List[float], forecast: List[float]) -> Dict[str, float]:
        """Calculate MAE, MAPE, RMSE"""
        actual = np.array(actual)
        forecast = np.array(forecast)
        
        # Remove any NaN values
        mask = ~(np.isnan(actual) | np.isnan(forecast))
        actual = actual[mask]
        forecast = forecast[mask]
        
        if len(actual) == 0:
            return {'mae': 0, 'mape': 0, 'rmse': 0}
        
        mae = np.mean(np.abs(actual - forecast))
        mape = np.mean(np.abs((actual - forecast) / actual)) * 100 if np.any(actual > 0) else 0
        rmse = np.sqrt(np.mean((actual - forecast) ** 2))
        
        return {'mae': float(mae), 'mape': float(mape), 'rmse': float(rmse)}
    
    def categorize_accuracy(self, mape: float) -> str:
        """Categorize forecast accuracy based on MAPE"""
        if mape <= 10:
            return 'Good'
        elif mape <= 25:
            return 'Medium'
        else:
            return 'Poor'
    
    def generate_ensemble_forecast(self, sales_data: List[Dict], periods: int = 12) -> Dict[str, Any]:
        """Generate ensemble forecast using multiple methods"""
        try:
            df = self.prepare_data(sales_data)
            
            if len(df) < 6:
                raise ValueError("Insufficient data for forecasting (minimum 6 data points)")
            
            # Method 1: Simple Moving Average with Trend
            def moving_average_forecast(data, periods):
                window = min(6, len(data) // 2)
                ma = data.rolling(window=window).mean().iloc[-1]
                trend = (data.iloc[-1] - data.iloc[-window]) / window if window > 1 else 0
                return [max(0, ma + trend * (i + 1)) for i in range(periods)]
            
            # Method 2: Exponential Smoothing
            def exponential_smoothing_forecast(data, periods, alpha=0.3):
                smoothed = [data.iloc[0]]
                for i in range(1, len(data)):
                    smoothed.append(alpha * data.iloc[i] + (1 - alpha) * smoothed[i-1])
                
                trend = (smoothed[-1] - smoothed[0]) / len(smoothed) if len(smoothed) > 1 else 0
                return [max(0, smoothed[-1] + trend * (i + 1)) for i in range(periods)]
            
            # Method 3: Linear Trend with Seasonality
            def linear_trend_forecast(data, periods):
                x = np.arange(len(data))
                y = data.values
                coeffs = np.polyfit(x, y, 1)
                trend = coeffs[0]
                intercept = coeffs[1]
                
                # Simple seasonality (monthly pattern)
                monthly_avg = data.groupby(data.index.month).mean()
                seasonal_factors = monthly_avg / monthly_avg.mean()
                
                forecasts = []
                for i in range(periods):
                    trend_value = intercept + trend * (len(data) + i)
                    month = (df.index[-1].month + i + 1) % 12
                    if month == 0: month = 12
                    seasonal_factor = seasonal_factors.get(month, 1.0)
                    forecasts.append(max(0, trend_value * seasonal_factor))
                
                return forecasts
            
            # Generate forecasts using all methods
            ma_forecast = moving_average_forecast(df['sales'], periods)
            es_forecast = exponential_smoothing_forecast(df['sales'], periods)
            lt_forecast = linear_trend_forecast(df['sales'], periods)
            
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
            last_date = df.index[-1]
            forecast_dates = [last_date + timedelta(days=30*i) for i in range(1, periods+1)]
            
            # Calculate confidence intervals
            std_dev = df['sales'].std()
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
                    'methods': ['Moving Average', 'Exponential Smoothing', 'Linear Trend with Seasonality'],
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
            df = self.prepare_data(sales_data)
            
            if len(df) < 8:
                return {
                    'success': False,
                    'error': 'Insufficient data for accuracy assessment (minimum 8 data points)'
                }
            
            # Split data: 70% training, 30% validation
            split_idx = int(len(df) * 0.7)
            train_data = df.iloc[:split_idx]
            validation_data = df.iloc[split_idx:]
            
            if len(validation_data) < 2:
                return {
                    'success': False,
                    'error': 'Insufficient validation data'
                }
            
            # Generate forecast for validation period
            forecast_periods = len(validation_data)
            forecast_result = self.generate_ensemble_forecast(
                train_data.reset_index().to_dict('records'), 
                forecast_periods
            )
            
            if not forecast_result['success']:
                return forecast_result
            
            # Compare forecast with actual validation data
            actual_values = validation_data['sales'].tolist()
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
                'totalMonths': len(df),
                'comparisonData': [
                    {
                        'actual': float(actual),
                        'forecast': float(forecast),
                        'date': validation_data.index[i].strftime('%Y-%m-%d')
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
forecasting_service = ForecastingService()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Forecasting API is running'})

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
        df = pd.DataFrame(sales_data)
        if 'sku' not in df.columns:
            return jsonify({'success': False, 'error': 'No SKU column found in data'}), 400
        
        product_groups = df.groupby('sku')
        results = {}
        category_summary = {'Good': 0, 'Medium': 0, 'Poor': 0}
        
        for sku, group_data in product_groups:
            group_records = group_data.to_dict('records')
            accuracy_result = forecasting_service.calculate_forecast_accuracy(group_records, sku)
            
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
            'averageMape': np.mean([r['mape'] for r in successful_products]) if successful_products else 0,
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