import React from 'react'
import { Filter } from 'lucide-react'

const Filters = ({ filters, onFiltersChange, availableFilters, viewMode, onViewModeChange }) => {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="filters-section">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <Filter size={20} style={{ marginRight: '0.5rem', color: '#64748b' }} />
        <h3 style={{ color: '#374151', fontSize: '1.1rem' }}>Filters & View Options</h3>
      </div>
      
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="sku-filter">SKU</label>
          <select
            id="sku-filter"
            value={filters.sku}
            onChange={(e) => handleFilterChange('sku', e.target.value)}
          >
            <option value="">All SKUs</option>
            {availableFilters.skus.map(sku => (
              <option key={sku} value={sku}>
                {sku}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="year-filter">Year</label>
          <select
            id="year-filter"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
          >
            <option value="">All Years</option>
            {availableFilters.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month-filter">Month</label>
          <select
            id="month-filter"
            value={filters.month}
            onChange={(e) => handleFilterChange('month', e.target.value)}
          >
            <option value="">All Months</option>
            {availableFilters.months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>View Mode</label>
          <div className="view-toggle">
            <button
              className={viewMode === 'units' ? 'active' : ''}
              onClick={() => onViewModeChange('units')}
            >
              Units
            </button>
            <button
              className={viewMode === 'revenue' ? 'active' : ''}
              onClick={() => onViewModeChange('revenue')}
            >
              Revenue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Filters 