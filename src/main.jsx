import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#2d2d2d',
            color: '#e0e0e0',
            border: '1px solid #404040',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#00ff88',
              secondary: '#1a1a1a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4444',
              secondary: '#1a1a1a',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
