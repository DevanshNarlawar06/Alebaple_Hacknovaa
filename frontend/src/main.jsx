import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Console from './pages/Console'
import Beacon from './pages/Beacon'
import Eval from './pages/Eval'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/console" element={<Console />} />
      <Route path="/beacon" element={<Beacon />} />
      <Route path="/eval" element={<Eval />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
)
