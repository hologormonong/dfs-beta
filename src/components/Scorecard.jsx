import React from 'react'

const Scorecard = ({ title, value, icon, change, changeType = 'positive' }) => {
  return (
    <div className="scorecard">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ 
          color: '#667eea', 
          marginRight: '0.75rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          {icon}
        </div>
        <div className="scorecard-title">{title}</div>
      </div>
      <div className="scorecard-value">{value}</div>
      {change && (
        <div className={`scorecard-change ${changeType === 'negative' ? 'negative' : ''}`}>
          {change}
        </div>
      )}
    </div>
  )
}

export default Scorecard 