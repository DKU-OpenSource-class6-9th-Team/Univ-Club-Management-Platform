import React from 'react'
import ReactDOM from 'react-dom/client'
//React Router기능 사용을 위함(브라우저 주소에 따라 컴포넌트 부여 후 이동)
import { BrowserRouter } from 'react-router-dom' 
import App from './App.jsx'
import './styles/auth.css' //로그인 및 회원가입 페이지에서 공통으로 사용하는 css파일

//BrowserRouter 안에 App이 들어가야 App.jsx에서 Routes, Link등을 사용할 수 있음
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)