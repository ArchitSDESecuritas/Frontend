  import { BrowserRouter, Navigate, Route, Routes,useLocation } from 'react-router-dom'
  import type { ReactNode, } from 'react'
  import { useEffect } from 'react'
  import { AuthProvider } from './AuthContext'
  import Dashboard from './Dashboard'
  import Home from './Home' 
  import Login from './Login'
  import ForgotPassword from './ForgotPassword'
  import ProtectedRoute, { GuestOnlyRoute } from './ProtectedRoute'
  import SessionTimeoutModal from './Components/SessionTimeoutModal'
  import Register from './Register'
  import bgVideo from './assets/video/this_is_good_change_one_thing.mp4'
  import PrivacyPolicy from './PrivacyPolicy'
  import CookiePolicy from './CookiePolicy'
  import './App.css'

  function ScrollToTop() {
    const { pathname } = useLocation()
 
    useEffect(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, [pathname])
 
    return null
  }

  // Clean up deprecated verification data from local storage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('worktrail_verification_records')
    }
  } catch {
    // ignore
  }

  function AuthLayout({ children }: { children: ReactNode }) {
    return (
      <main className="flex flex-col md:flex-row min-h-[100dvh] bg-[#F4F7F9] select-text">
        {/* Video Banner: Visible on Tablet & Desktop (md: and above) */}
        <div className="hidden md:flex relative md:w-1/2 lg:w-[50%] xl:w-[55%] flex-col justify-between p-8 md:p-12 lg:p-16 overflow-hidden bg-[#031f30] text-white md:h-screen md:sticky md:top-0 select-none">
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
            <video
              className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover opacity-85 scale-105"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src={bgVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#031f30]/40 to-[#42638C]/35 z-10"></div>
            <div className="absolute inset-0 login-cyber-grid z-15 opacity-50"></div>
          </div>

          <div className="relative z-20 flex items-center gap-3">
            <div className="glass-panel px-6 py-3.5 rounded-2xl float-anim shadow-lg border border-white/15">
              <img
                src="https://worktrail.ai/static/images/Walsons-Logo-White.png"
                alt="Walsons Logo"
                className="h-7 object-contain"
              />
            </div>
          </div>

          <div className="relative z-20 mt-auto pt-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-tech tracking-tight leading-tight max-w-lg">
              Trust Begins With <br /> Verified Identities
            </h2>
            <p className="text-slate-300 text-sm md:text-base mt-4 max-w-md font-sans leading-relaxed">
              Screen smarter, hire confidently, and reduce risk. Background verification built for today's digital workforce.
            </p>
          </div>

          <div className="relative z-20 mt-10 flex justify-between items-center gap-3 text-xs text-slate-300 font-tech uppercase tracking-wider glass-panel px-6 py-4 rounded-2xl border border-white/10">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#88ffbb] animate-pulse shadow-[0_0_10px_#88ffbb]"></span>
              Node Secured
            </span>
            <span className="text-[10px] text-slate-400">Copyright © Walsons Worktrail 2026</span>
          </div>
        </div>

        {/* Form Area: Mobile Card, Desktop Original Layout */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 md:p-10 lg:p-14 min-h-[100dvh] md:min-h-screen bg-[#F4F7F9]">
          {/* Form Container */}
          <div className="w-full max-w-[440px] md:max-w-[480px] bg-white md:bg-transparent rounded-3xl md:rounded-none p-6 sm:p-8 md:p-0 shadow-sm md:shadow-none border border-slate-200/80 md:border-none animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    )
  }

  function App() {
    return (
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <SessionTimeoutModal />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route
              path="/login"
              element={
                <GuestOnlyRoute>
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnlyRoute>
                  <AuthLayout>
                    <Register />
                  </AuthLayout>
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <GuestOnlyRoute>
                  <AuthLayout>
                    <ForgotPassword />
                  </AuthLayout>
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    )
  }

export default App
