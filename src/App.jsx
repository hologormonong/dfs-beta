import React, { useState, useCallback } from 'react'
import { Upload, BarChart3, TrendingUp, Package, DollarSign, Percent, Target } from 'lucide-react'
import Papa from 'papaparse'
import { format, parseISO } from 'date-fns'
import SalesChart from './components/SalesChart'
import Scorecard from './components/Scorecard'
import Filters from './components/Filters'
import FileUpload from './components/FileUpload'
import ForecastDashboard from './components/ForecastDashboard'
import PriceSalesCorrelation from './components/PriceSalesCorrelation'

function App() {
  const [salesData, setSalesData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('units') // 'units' or 'revenue'
  const [dashboardMode, setDashboardMode] = useState('analytics') // 'analytics' or 'forecast'
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [filters, setFilters] = useState({
    sku: '',
    year: '',
    month: ''
  })
  


  const handleFileUpload = useCallback((file) => {
    setLoading(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsing results:', results)
        console.log('First row:', results.data[0])
        console.log('Total rows:', results.data.length)
        console.log('Column names:', Object.keys(results.data[0] || {}))
        
        const processedData = results.data.map((row, index) => {
          try {
            // Handle multiple date formats
            let date
            const dateStr = row.date || row.Date || row.DATE
            
            if (!dateStr) {
              console.error(`Row ${index}: No date found`)
              return null
            }
            
            // Try M/D/YYYY format first (since that's what the CSV uses)
            const parts = dateStr.split('/')
            if (parts.length === 3) {
              const month = parseInt(parts[0]) - 1 // Month is 0-indexed
              const day = parseInt(parts[1])
              const year = parseInt(parts[2])
              date = new Date(year, month, day)
            } else {
              // Try ISO format or other formats
              try {
                date = parseISO(dateStr)
              } catch (e) {
                date = new Date(dateStr)
              }
            }
            
            // Validate the date
            if (isNaN(date.getTime())) {
              console.error(`Row ${index}: Invalid date - ${dateStr}`)
              return null
            }
            const sku = row.sku || row.SKU || row.Sku || ''
            const orderedQuantity = parseInt(row['Ordered Quantity'] || row.orderedQuantity || row.ordered_quantity || row.OrderedQuantity || 0)
            const soldQuantity = parseInt(row['Sold Quantity'] || row.soldQuantity || row.sold_quantity || row.SoldQuantity || 0)
            const price = parseFloat(row.price || row.Price || 0)
            const cost = parseFloat(row.cost || row.Cost || 0)
            
            // Debug logging for first few rows
            if (index < 3) {
              console.log(`Row ${index}:`, {
                originalRow: row,
                parsed: { date, sku, orderedQuantity, soldQuantity, price, cost }
              })
            }
            
            // Calculate derived values
            const fillRate = orderedQuantity > 0 ? soldQuantity / orderedQuantity : 0
            const revenue = soldQuantity * price
            const productionCost = soldQuantity * cost
            
            return {
              ...row,
              date,
              sku,
              orderedQuantity,
              soldQuantity,
              price,
              cost,
              fillRate,
              revenue,
              productionCost
            }
          } catch (error) {
            console.error(`Error processing row ${index}:`, row, error)
            console.error('Error details:', error.message)
            return null
          }
        }).filter(row => {
          if (!row) {
            console.log('Filtered out null row')
            return false
          }
          if (!row.date || isNaN(row.date.getTime())) {
            console.log('Filtered out row due to invalid date:', row)
            return false
          }
          if (row.soldQuantity <= 0 && row.orderedQuantity <= 0) {
            console.log('Filtered out row due to no quantities:', row)
            return false
          }
          return true
        })

        console.log('Processed data:', processedData)
        console.log('Filtered data length:', processedData.length)

        if (processedData.length === 0) {
          alert('No valid data found in CSV. Please check the format.')
          setLoading(false)
          return
        }

        setSalesData(processedData)
        setFilteredData(processedData)
        setLoading(false)
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        setLoading(false)
      }
    })
  }, [])

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    
    let filtered = salesData

    if (newFilters.sku) {
      filtered = filtered.filter(item => 
        item.sku.toLowerCase().includes(newFilters.sku.toLowerCase())
      )
    }

    if (newFilters.year) {
      filtered = filtered.filter(item => 
        item.date.getFullYear().toString() === newFilters.year
      )
    }

    if (newFilters.month) {
      filtered = filtered.filter(item => 
        (item.date.getMonth() + 1).toString() === newFilters.month
      )
    }

    setFilteredData(filtered)
  }, [salesData])

  const calculateMetrics = () => {
    if (filteredData.length === 0) return {}

    const monthlyData = {}
    
    filteredData.forEach(item => {
      const monthKey = format(item.date, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          soldQuantity: 0,
          orderedQuantity: 0,
          revenue: 0,
          productionCost: 0,
          count: 0
        }
      }
      
      monthlyData[monthKey].soldQuantity += item.soldQuantity
      monthlyData[monthKey].orderedQuantity += item.orderedQuantity
      monthlyData[monthKey].revenue += item.revenue
      monthlyData[monthKey].productionCost += item.productionCost
      monthlyData[monthKey].count += 1
    })

    const months = Object.values(monthlyData)
    const totalMonths = months.length

    return {
      avgMonthlyUnits: months.reduce((sum, month) => sum + month.soldQuantity, 0) / totalMonths,
      avgMonthlyRevenue: months.reduce((sum, month) => sum + month.revenue, 0) / totalMonths,
      avgProductionCost: months.reduce((sum, month) => sum + month.productionCost, 0) / totalMonths,
      avgFillRate: months.reduce((sum, month) => {
        const monthFillRate = month.soldQuantity / month.orderedQuantity
        return sum + monthFillRate
      }, 0) / totalMonths
    }
  }

  const metrics = calculateMetrics()

  const getAvailableFilters = () => {
    const skus = [...new Set(salesData.map(item => item.sku))].filter(Boolean).sort()
    const years = [...new Set(salesData.map(item => item.date.getFullYear()))].sort()
    
    // Create proper month names in chronological order
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    // Get unique months from data and convert to names
    const monthNumbers = [...new Set(salesData.map(item => item.date.getMonth()))].sort()
    const months = monthNumbers.map(monthNum => ({
      value: monthNum + 1,
      label: monthNames[monthNum]
    }))

    return { skus, years, months }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Sales Dashboard</h1>
        <p>Upload your CSV file to analyze sales performance and trends</p>
      </div>

      {salesData.length === 0 ? (
        <FileUpload onFileUpload={handleFileUpload} loading={loading} />
      ) : (
        <>
          <div className="dashboard-toggle">
            <button 
              className={dashboardMode === 'analytics' ? 'active' : ''}
              onClick={() => setDashboardMode('analytics')}
            >
              <BarChart3 size={16} />
              Analytics Dashboard
            </button>
            <button 
              className={dashboardMode === 'forecast' ? 'active' : ''}
              onClick={() => setDashboardMode('forecast')}
            >
              <Target size={16} />
              Forecast Simulation
            </button>
          </div>

          <Filters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableFilters={getAvailableFilters()}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {dashboardMode === 'analytics' ? (
            <>
              <div className="chart-section">
                <div className="chart-header">
                  <h2 className="chart-title">
                    {viewMode === 'revenue' ? 'Revenue: Sold vs Ordered' : 'Units: Sold vs Ordered'}
                  </h2>
                </div>
                <div className="chart-container">
                  <SalesChart 
                    data={filteredData} 
                    viewMode={viewMode}
                  />
                </div>
              </div>

              <div className="scorecards-grid">
                <Scorecard
                  title="Avg Monthly Units Sold"
                  value={Math.round(metrics.avgMonthlyUnits || 0).toLocaleString()}
                  icon={<Package />}
                  change="+12.5%"
                />
                <Scorecard
                  title="Avg Monthly Revenue"
                  value={`$${(metrics.avgMonthlyRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  icon={<DollarSign />}
                  change="+8.3%"
                />
                <Scorecard
                  title="Production Cost"
                  value={`$${(metrics.avgProductionCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  icon={<TrendingUp />}
                  change="-2.1%"
                  changeType="negative"
                />
                <Scorecard
                  title="Fill Rate"
                  value={`${((metrics.avgFillRate || 0) * 100).toFixed(1)}%`}
                  icon={<Percent />}
                  change="+5.2%"
                />
              </div>

              {/* Analytics Toggle */}
              <div className="analytics-toggle">
                <button 
                  className={`analytics-btn ${showAnalytics ? 'active' : ''}`}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  <BarChart3 size={16} />
                  {showAnalytics ? 'Hide' : 'Show'} Price Analytics
                </button>
              </div>

              {/* Price-Sales Correlation Analysis */}
              {showAnalytics && (
                <PriceSalesCorrelation 
                  salesData={filteredData}
                  selectedSku={filters.sku || null}
                  viewMode={viewMode}
                />
              )}
            </>
          ) : (
            <ForecastDashboard 
              data={filteredData} 
              viewMode={viewMode}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App 