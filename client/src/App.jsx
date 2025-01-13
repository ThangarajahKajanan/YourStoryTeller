import React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // Import Route
import Home from "./pages/Home/Home";
import Login from "./pages/Auth/Login";

function App() {
  
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/dashboard" exact element={<Home />}/>
          <Route path="/login" exact element={ <Login />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
