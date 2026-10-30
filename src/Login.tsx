import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useAuth } from './useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  ArrowLeft, 
  RotateCw, 
  CheckCircle2,
  Clock
} from 'lucide-react'
import securitasLogo from './assets/Img/logo_b.png'
import { checkClientHasRequests } from './client-utils'

type LoginProps = {
  onRegister?: () => void
}

function Login({ onRegister }: LoginProps) {
  const [emailId, setEmailId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false)

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpMessage, setOtpMessage] = useState('')
  const [resendCountdown, setResendCountdown] = useState(45)
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState('')
  const [localError, setLocalError] = useState('')

  // Check for session expired redirect notice
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isExpiredUrl = params.get('sessionExpired') === 'true'
    const isExpiredStorage = sessionStorage.getItem('worktrail_session_expired') === '1'
    if (isExpiredUrl || isExpiredStorage) {
      setSessionExpiredNotice(true)
      sessionStorage.removeItem('worktrail_session_expired')
    }
  }, [])

  // Double-submit prevention ref
  const isSubmittingRef = useRef(false)

  const { login, verifyOtp, isLoading, error } = useAuth()
  const navigate = useNavigate()

  // Countdown timer for resending OTP
  useEffect(() => {
    if (!isOtpStep || resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOtpStep, resendCountdown])

  const handlePostLoginNavigation = (currentUser: any) => {
    const userType = (currentUser?.Usertype || '').toLowerCase().replace(/\s+/g, '')
    // Navigate based on usertype
    if (userType === 'superadmin') {
      navigate('/AdminDashboard', { replace: true })
    } else if (userType === 'client') {
      // You may want to customize for client, but keeping logic as before
      const hasRequests = checkClientHasRequests(currentUser, emailId)
      if (hasRequests) {
        navigate('/CandidateVerification', { replace: true })
      } else {
        navigate('/CandidateVerification', { replace: true })
      }
    } else if (userType === 'contributoradmin' || userType === 'contributoruser') {
      navigate('/ContributorDashboard', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setLocalError('')
    setResendStatus('')
    try {
      const response: any = await login(emailId, password)

      // Fix: login() likely returns void, so test only for actual response object
      if (response && typeof response === 'object') {
        // OTP required branch
        if ('otpRequired' in response && response.otpRequired) {
          setIsOtpStep(true)
          setOtpMessage(response.message || 'A login OTP was sent to your email.')
          setResendCountdown(45)
          return
        }

        // User object branch
        let user = ('user' in response && response.user) ? response.user : response
        let currentUser = user || (() => {
          try {
            const stored = localStorage.getItem('worktrail_user')
            return stored ? JSON.parse(stored) : null
          } catch {
            return null
          }
        })()
        if (currentUser) {
          handlePostLoginNavigation(currentUser)
        }
        // If no recognised user or OTP indicators, treat as error.
      } else {
        // If login() returned void/undefined, treat as failure.
        setLocalError('Login failed: Invalid credentials or unrecognized response.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      // If error indicates OTP was dispatched, seamlessly switch to OTP verification step
      if (/otp/i.test(msg) || /sent to your email/i.test(msg)) {
        setIsOtpStep(true)
        setOtpMessage(msg)
        setResendCountdown(45)
        return
      }
      setLocalError(msg)
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading || isSubmittingRef.current) return
    if (!otp.trim()) {
      setLocalError('Please enter the verification code sent to your email.')
      return
    }
    isSubmittingRef.current = true
    setLocalError('')
    setResendStatus('')
    try {
      const verifiedUser = await verifyOtp(emailId, otp, password)
      const currentUser = verifiedUser || (() => {
        try {
          const stored = localStorage.getItem('worktrail_user')
          return stored ? JSON.parse(stored) : null
        } catch {
          return null
        }
      })()

      handlePostLoginNavigation(currentUser)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Invalid or expired OTP code.')
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isResending || isLoading || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsResending(true)
    setLocalError('')
    setResendStatus('')
    try {
      // login() returns void, so just perform side effects and set banners accordingly
      await login(emailId, password)
      setResendCountdown(45)
      setResendStatus('A new verification code has been dispatched to your email.')
      setOtpMessage('A new verification code has been dispatched to your email.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend OTP.'
      if (/otp/i.test(msg) || /sent to your email/i.test(msg)) {
        setResendCountdown(45)
        setResendStatus('A new verification code has been dispatched to your email.')
        setOtpMessage('A new verification code has been dispatched to your email.')
      } else {
        setLocalError(msg)
      }
    } finally {
      isSubmittingRef.current = false
      setIsResending(false)
    }
  }

  const handleBackToLogin = () => {
    setIsOtpStep(false)
    setOtp('')
    setLocalError('')
    setResendStatus('')
  }

  // OTP Verification Step View
  if (isOtpStep) {
    return (
      <div className="flex flex-col w-full font-securitas select-text">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <img
            src={securitasLogo}
            alt="Securitas"
            className="h-7 sm:h-8 object-contain"
          />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            2FA Security
          </span>
        </div>

        {/* Headings */}
        <div className="mb-5 select-none text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#082136] tracking-tight leading-tight mb-1">
            Verify Login OTP
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Enter the one-time code sent to{' '}
            <span className="font-bold text-[#082136] break-all">{emailId}</span>
          </p>
        </div>

        {/* Info Banner */}
        {otpMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200/80 text-xs text-sky-800 font-medium mb-4 animate-fade-in">
            <Mail className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
            <span className="leading-snug">{otpMessage}</span>
          </div>
        )}

        {/* Resend Status Banner */}
        {resendStatus && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold mb-4 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{resendStatus}</span>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center select-none">
              <label className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                One-Time Password (OTP)
              </label>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
                Check Inbox & Spam
              </span>
            </div>
            <div className="flex items-center gap-3 h-[52px] px-4 bg-slate-50/70 hover:bg-slate-50 focus-within:bg-white border border-slate-200/90 focus-within:border-[#42638C] focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl transition-all shadow-2xs">
              <KeyRound className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ''))}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                className="w-full text-slate-900 placeholder-slate-300 outline-none text-base sm:text-lg font-mono font-bold tracking-[0.25em] bg-transparent text-center"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {(localError || error) && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold animate-fade-in" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isLoading || !otp.trim()}
            className="w-full h-[50px] rounded-full text-white text-xs sm:text-[13px] font-bold tracking-wider uppercase bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer select-none shadow-md disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            <span>{isLoading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Resend Actions */}
        <div className="flex items-center justify-between gap-3 text-xs mt-4 pt-4 border-t border-slate-200/80 select-none">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Details</span>
          </button>

          {resendCountdown > 0 ? (
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">
              Resend in <span className="text-[#082136]">{resendCountdown}s</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="inline-flex items-center gap-1 text-[#0680A6] hover:text-[#082136] font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
            </button>
          )}
        </div>

        {/* Telemetry Warning Footer */}
        <div className="flex flex-col items-center justify-center gap-1 select-none text-center mt-6">
          <p className="text-[9px] sm:text-[10px] leading-relaxed text-slate-400 font-bold tracking-wider uppercase">
            Securitas Identity Protection & Active Session Security.
          </p>
        </div>
      </div>
    )
  }

  // Standard Login Step View
  return (
    <div className="flex flex-col w-full font-securitas select-text">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <img
          src={securitasLogo}
          alt="Securitas"
          className="h-7 sm:h-8 object-contain"
        />
      </div>

      {/* Headings */}
      <div className="mb-6 select-none text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#082136] tracking-tight leading-tight mb-1">
          Sign In
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm font-medium">
          Enter credentials to access workforce verification portal.
        </p>
      </div>

      {/* Session Expired Inactivity Notice Banner */}
      {sessionExpiredNotice && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 font-medium mb-4 shadow-xs animate-fade-in">
          <Clock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-snug">
            <strong className="font-bold text-amber-950 block mb-0.5 text-[13px]">
              Session Expired (10m Inactivity)
            </strong>
            <span>Your session automatically ended after 10 minutes of inactivity for security. Please sign in again.</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {/* User ID Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase select-none">
             Email Address
          </label>
          <div className="flex items-center gap-3 h-[48px] px-4 bg-slate-50/70 hover:bg-slate-50 focus-within:bg-white border border-slate-200/90 focus-within:border-[#42638C] focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl transition-all shadow-2xs">
            <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={emailId}
              onChange={(event) => setEmailId(event.target.value)}
              placeholder="user@company.com or User ID"
              className="w-full text-slate-800 placeholder-slate-400 outline-none text-xs sm:text-sm bg-transparent font-medium"
              autoComplete="username"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center select-none">
            <label className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#0680A6] hover:text-[#082136] uppercase transition-colors cursor-pointer"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="flex items-center gap-3 h-[48px] px-4 bg-slate-50/70 hover:bg-slate-50 focus-within:bg-white border border-slate-200/90 focus-within:border-[#42638C] focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl transition-all shadow-2xs">
            <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              className="w-full text-slate-800 placeholder-slate-400 outline-none text-xs sm:text-sm tracking-wider bg-transparent font-medium"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
              className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none shrink-0 p-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 select-none py-0.5">
          <input
            type="checkbox"
            id="remember"
            className="w-4 h-4 accent-[#031f30] border-slate-300 rounded focus:ring-[#031f30]/20 cursor-pointer"
          />
          <label
            htmlFor="remember"
            className="text-[11px] font-bold tracking-wider text-slate-500 uppercase cursor-pointer select-none"
          >
            Remember session
          </label>
        </div>

        {/* Error Handling */}
        {(localError || error) && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold animate-fade-in" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          className="w-full h-[50px] rounded-full text-white text-xs sm:text-[13px] font-bold tracking-wider uppercase bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer select-none shadow-md disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          type="submit"
          disabled={isLoading}
        >
          <span>{isLoading ? 'Authenticating...' : 'Login'}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      {/* Separator */}
      <div className="w-full border-t border-slate-200/80 my-5"></div>

      {/* Toggle Link */}
      <div className="text-center select-none mb-4">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
          Don't have an account?{' '}
        </span>
        <Link
          to="/register"
          onClick={onRegister}
          className="text-[11px] sm:text-xs font-extrabold text-[#082136] hover:text-[#0b2b41] uppercase tracking-wider transition-colors ml-1"
        >
          Sign Up
        </Link>
      </div>

      {/* Telemetry Warning Footer */}
      <div className="flex flex-col items-center justify-center gap-1 select-none text-center">
        <p className="text-[9px] sm:text-[10px] leading-relaxed text-slate-400 font-bold tracking-wider uppercase">
          System Authorized Operations Only.
          <br className="hidden sm:inline" />
          IP Logging and Telemetry Tracking Active.
        </p>
      </div>
    </div>
  )
}

export default Login
