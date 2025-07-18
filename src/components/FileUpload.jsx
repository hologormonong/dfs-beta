import React, { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'

const FileUpload = ({ onFileUpload, loading }) => {
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onFileUpload(file)
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return (
      <div className="upload-section">
        <div className="loading">
          <div className="spinner"></div>
          <span>Processing your CSV file...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="upload-section">
      <div
        className={`file-upload ${dragActive ? 'dragover' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-icon">
          <Upload size={48} />
        </div>
        <div className="upload-text">
          <strong>Click to upload</strong> or drag and drop
        </div>
        <div className="upload-hint">
          CSV files only (Max 10MB)
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px', margin: '2rem auto 0' }}>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
          <FileText size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Expected CSV Format
        </h3>
        <div style={{ 
          background: '#f8fafc', 
          padding: '1rem', 
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#64748b'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            Your CSV should include these columns (column names are case-insensitive):
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>• <strong>Date</strong> - Sales date (YYYY-MM-DD, M/D/YYYY, or other common formats)</li>
            <li>• <strong>SKU</strong> - Product identifier</li>
            <li>• <strong>Ordered Quantity</strong> - Number of units ordered</li>
            <li>• <strong>Sold Quantity</strong> - Number of units sold</li>
            <li>• <strong>Price</strong> - Price per unit</li>
            <li>• <strong>Cost</strong> - Cost per unit</li>
          </ul>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <strong>Note:</strong> Fill Rate, Revenue, and Production Cost are calculated automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

export default FileUpload 