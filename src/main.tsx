import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './prototype_site.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
