# Python Forecasting Backend

This Flask backend provides advanced statistical forecasting capabilities for the DFS-MVP sales dashboard.

## Features

- **Ensemble Forecasting**: Combines Moving Average, Exponential Smoothing, and Linear Trend with Seasonality
- **Accuracy Metrics**: MAE, MAPE, RMSE calculation with train/validation split
- **Product Categorization**: Good/Medium/Poor accuracy classification
- **RESTful API**: JSON endpoints for easy integration with React frontend

## Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Backend

```bash
python app.py
```

The server will start on `http://localhost:5000`

### 3. Test the API

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status": "healthy", "message": "Forecasting API is running"}`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status

### Generate Forecast
- **POST** `/api/forecast`
- Body: `{"salesData": [...], "periods": 12, "productId": "SKU123"}`
- Returns forecast data with confidence intervals

### Calculate Accuracy
- **POST** `/api/accuracy`
- Body: `{"salesData": [...], "productId": "SKU123"}`
- Returns MAE, MAPE, RMSE, and accuracy category

### Calculate All Products Accuracy
- **POST** `/api/accuracy/all`
- Body: `{"salesData": [...]}` (must include 'sku' column)
- Returns accuracy metrics for all products

## Forecasting Methods

The backend uses an ensemble approach combining:

1. **Moving Average with Trend**: Captures recent patterns and trends
2. **Exponential Smoothing**: Handles varying levels of noise
3. **Linear Trend with Seasonality**: Accounts for long-term trends and seasonal patterns

## Data Format

Sales data should be in the format:
```json
[
  {
    "date": "2023-01-01",
    "sales": 100.50,
    "sku": "PRODUCT123"
  }
]
```

## Integration with React Frontend

The React frontend automatically connects to this backend when available. If the backend is not running, the frontend will fall back to JavaScript-based forecasting.

## Production Deployment

For production, consider:
- Using Gunicorn or uWSGI instead of Flask development server
- Adding authentication and rate limiting
- Using environment variables for configuration
- Setting up proper CORS policies
- Adding logging and monitoring 