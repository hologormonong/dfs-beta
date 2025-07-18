# 📊 Sales Dashboard

A modern, interactive web application for analyzing sales data from CSV files. Built with React, Vite, and Recharts.

## Features

- **CSV File Upload**: Drag and drop or click to upload your sales data
- **Interactive Dashboard**: Beautiful charts and visualizations
- **Advanced Filtering**: Filter by SKU, Year, and Month
- **Dual View Modes**: Toggle between Units (Sold vs Ordered) and Revenue (Sold vs Ordered) views
- **Key Metrics**: Scorecards showing important business metrics
- **Sales Forecasting**: Advanced statistical forecasting with Python backend
- **Forecast Accuracy Analysis**: MAE, MAPE, RMSE metrics with product categorization
- **Price-Sales Correlation**: Analyze how price changes affect sales volume
- **Responsive Design**: Works on desktop and mobile devices

## Key Metrics Displayed

- **Average Monthly Units Sold**: Total units sold per month on average
- **Average Monthly Revenue**: Total revenue per month on average  
- **Production Cost**: Average production costs
- **Fill Rate**: Average fill rate percentage

## CSV Format Requirements

Your CSV file should include these columns (column names are case-insensitive):

| Column | Description | Example |
|--------|-------------|---------|
| Date | Sales date | 2023-01-15 |
| SKU | Product identifier | SKU001 |
| Ordered Quantity | Number of units ordered | 158 |
| Sold Quantity | Number of units sold | 150 |
| Price | Price per unit | 50 |
| Cost | Cost per unit | 30 |

**Calculated Values:**
- **Fill Rate** = Sold Quantity / Ordered Quantity
- **Revenue** = Sold Quantity × Price
- **Production Cost** = Sold Quantity × Cost

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Python 3.8+ (for advanced forecasting features)

### Installation

1. Clone or download this project
2. Navigate to the project directory
3. Install Node.js dependencies:

```bash
npm install
```

4. (Optional) Set up Python backend for advanced forecasting:

```bash
python setup_backend.py
```

This will install Python dependencies and start the backend server.

### Running the Application

1. Start the React development server:

```bash
npm run dev
```

The application will open automatically in your browser at `http://localhost:3000`

2. (Optional) Start the Python backend for advanced forecasting:

```bash
cd backend
python app.py
```

The backend will be available at `http://localhost:5000`

**Note**: The React app will automatically detect if the Python backend is available and use it for enhanced forecasting. If the backend is not running, it will fall back to JavaScript-based forecasting.

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Usage

1. **Upload Data**: Click the upload area or drag and drop your CSV file
2. **View Dashboard**: Once uploaded, you'll see the dashboard with charts and metrics
3. **Apply Filters**: Use the filters to narrow down your data by SKU, Year, or Month
4. **Toggle Views**: Switch between Units and Revenue views to compare actual vs potential performance
5. **Explore Data**: Hover over chart lines to see detailed information

## Sample Data

A sample CSV file (`sample_data.csv`) is included with the project for testing. It contains:
- 12 months of sales data (2023)
- 5 different SKUs
- Realistic sales quantities and revenue
- Production costs and fill rates

## Technology Stack

### Frontend
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Recharts**: Beautiful and responsive charts
- **PapaParse**: CSV parsing library
- **date-fns**: Date manipulation utilities
- **Lucide React**: Modern icon library

### Backend (Optional)
- **Flask**: Python web framework
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computing
- **Scikit-learn**: Machine learning utilities

## Project Structure

```
src/
├── components/
│   ├── FileUpload.jsx          # CSV file upload component
│   ├── Filters.jsx             # Filter controls
│   ├── SalesChart.jsx          # Chart visualization
│   ├── Scorecard.jsx           # Metric display cards
│   ├── ForecastDashboard.jsx   # Sales forecasting dashboard
│   ├── ForecastAccuracy.jsx    # Forecast accuracy analysis
│   └── PriceCorrelation.jsx    # Price-sales correlation analysis
├── services/
│   ├── ForecastAccuracyService.js  # Forecast accuracy calculations
│   ├── PriceCorrelationService.js  # Price correlation analysis
│   ├── PythonForecastService.js    # Python backend communication
│   └── ARIMAForecastService.js     # JavaScript ARIMA forecasting
├── App.jsx                     # Main application component
├── main.jsx                   # React entry point
└── index.css                  # Global styles

backend/
├── app.py                     # Flask backend server
├── requirements.txt           # Python dependencies
└── README.md                 # Backend documentation
```

## Customization

### Adding New Metrics

To add new metrics, modify the `calculateMetrics` function in `App.jsx` and add new scorecards to the dashboard.

### Styling

The application uses CSS classes for styling. You can customize the appearance by modifying `src/index.css`.

### Chart Types

The application currently uses line charts for quantity comparison and revenue tracking. You can modify `SalesChart.jsx` to use different chart types from Recharts (bar charts, area charts, etc.).

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests! 