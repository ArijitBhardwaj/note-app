// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Sign In page */}
        <Route path="/signin" element={<SignInPage />} />
        
        {/* Sign Up page */}
        <Route path="/signup" element={<SignUpPage />} />

        {/* Dashboard (protected) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Default: redirect to sign in */}
        <Route path="*" element={<SignInPage />} />
      </Routes>
    </Router>
  );
}

export default App;
