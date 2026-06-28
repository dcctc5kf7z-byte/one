import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1A1A1A',
          colorBgBase: '#FAFAF9',
          colorBgContainer: '#FFFFFF',
          colorTextBase: '#1A1A1A',
          colorTextSecondary: '#525252',
          colorTextTertiary: '#8A8A8A',
          borderRadius: 4,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          fontSize: 14,
          controlHeight: 40,
          lineHeight: 1.6,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
