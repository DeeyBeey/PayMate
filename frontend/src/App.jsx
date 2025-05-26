import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import SignUp from "./pages/SignUp/SignUp";
import SignIn from "./pages/SignIn/SignIn";
import ReceiptUpload from "./pages/ReceiptUpload/ReceiptUpload";
import "./App.css"
import Profile from "./pages/Profile/Profile";
import PrivateRoute from "./components/PrivateRoute";
import Header from './components/Header/Header';
import AssignSplits from "./pages/AssignSplits/AssignSplits";
import ViewSplits from "./pages/ViewSplits/ViewSplits";
import History from "./pages/History/History";
import About from "./pages/About/About";
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes without header */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />
        

        <Route element={<PrivateRoute />}>       
        <Route path="/scan-receipt" element={
          <>
            <Header />
            <ReceiptUpload />
          </>
        } />
        </Route>

        <Route element={<PrivateRoute />}> 
        <Route path="/assign-splits/:id" element={
          <>
            <Header />
            <AssignSplits />
          </>
        } />
        </Route>

        <Route element={<PrivateRoute />}> 
        <Route path="/view-splits/:splitId" element={
          <>
            <Header />
            <ViewSplits />
          </>
        } />
        </Route>

        <Route element={<PrivateRoute />}> 
        <Route path="/history" element={
          <>
            <Header />
            <History />
          </>
        } />
        </Route>

        <Route path="/about" element={
          <>
            <Header />
            <About />
          </>
        } />
        
        <Route element={<PrivateRoute />}>
          <Route path='/profile' element={
            <>
            <Header />
            <Profile />
            </>
          } />

        <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;