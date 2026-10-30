import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from './endpoint'
import {
  AuthContext,
  SUPERADMIN_MENU,
  ADMIN_MENU,
  FASCILATOR_MENU,
  CONTRIBUTORUSER_MENU,
  CONTRIBUTORADMIN_MENU,
  CLIENT_MENU,
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MS,
  USER_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  LAST_ACTIVITY_KEY,
  SESSION_EXPIRED_KEY,
  parseJwtPayload,
  type AuthUser,
  type LoginResult
} from './auth-context'


// Helper to map user types to their corresponding menus
const MENU_MAP: Record<string, any> = {
  superadmin: SUPERADMIN_MENU,
  admin: ADMIN_MENU,
  fascilator: FASCILATOR_MENU,
  contributor: CONTRIBUTORUSER_MENU,
  contributoruser: CONTRIBUTORUSER_MENU,
  'contributor user': CONTRIBUTORUSER_MENU,
  contributoradmin: CONTRIBUTORADMIN_MENU,
  admin_contributor: CONTRIBUTORADMIN_MENU,
  'contributor admin': CONTRIBUTORADMIN_MENU,
  client: CLIENT_MENU
}

type LoginResponse = {
  message?: string
  loginStatus?: boolean
  token?: string
  user?: AuthUser
}

function getMenuForUserType(usertype: string) {
  const ut = (usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
  if (ut.includes('superadmin')) return SUPERADMIN_MENU
  if (ut === 'admin') return ADMIN_MENU
  if (ut.includes('contributoradmin') || ut.includes('admincontributor')) return CONTRIBUTORADMIN_MENU
  if (ut.includes('contributoruser')) return CONTRIBUTORUSER_MENU
  if (ut.includes('fascilator')) return FASCILATOR_MENU
  if (ut.includes('client') || ut.includes('customer')) return CLIENT_MENU
  return []
}

function readStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY)
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!storedUser || !storedToken) return null

  // Check if session has exceeded 10 minutes of inactivity
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0')
  if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    return null
  }

  try {
    const raw = JSON.parse(storedUser)
    const storedEmail = localStorage.getItem('worktrail_client_email') || ''
    const fallback =
      raw.EmailID ||
      raw.email ||
      raw.Email ||
      storedEmail ||
      (raw.username && raw.username.includes('@') ? raw.username : '') ||
      (raw.Usertype?.toLowerCase() === 'client' ? 'Client.worktrial@Securitas-india.com' : '')
    const user = normalizeAuthUser(raw, raw, fallback) || (raw as AuthUser)
    const isActive = String(user.activestatus ?? '1') === '1'
    return isActive ? user : null
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [token, setToken] = useState<string | null>(() => {
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0')
    if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
      return null
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  })
  
  const rawUserType = user?.Usertype || (user as any)?.UserType || (user as any)?.role || (user as any)?.usertype || ''
  
  const [menu, setMenu] = useState(() => {
    return getMenuForUserType(rawUserType)
  })

  // Synchronize menu whenever user changes
  useEffect(() => {
    if (rawUserType) {
      setMenu(getMenuForUserType(rawUserType))
    }
  }, [rawUserType])

  // 10-Minute Inactivity Session State (600 seconds)
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now())
    const elapsed = Date.now() - last
    return Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000))
  })
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const isMenuLoading = false
  const menuError = ''
  const [error, setError] = useState('')

  const loginInFlight = useRef(false)
  const verifyInFlight = useRef(false)
  const lastRecordedRef = useRef<number>(Date.now())

  const resetInactivityTimer = useCallback(() => {
    const now = Date.now()
    lastRecordedRef.current = now
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
    } catch {}
    setIsExpiringSoon(false)
    setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))
  }, [])

  const tokenRefreshInFlight = useRef(false)
  const lastRefreshCallRef = useRef<number>(Date.now())

  const extendSession = useCallback(async () => {
    resetInactivityTimer()
    const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!currentToken || tokenRefreshInFlight.current) return

    tokenRefreshInFlight.current = true
    try {
      const res = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: {
          APIKEY: 'Securitas@#!1234',
          Authorization: `Bearer ${currentToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.token) {
          lastRefreshCallRef.current = Date.now()
          setToken(data.token)
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
          localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
          setIsExpiringSoon(false)
          setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))
        }
      }
    } catch (err) {
      console.warn('Failed to extend session:', err)
    } finally {
      tokenRefreshInFlight.current = false
    }
  }, [resetInactivityTimer, token])

  const handleUserActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastRecordedRef.current > 1500) {
      resetInactivityTimer()

      // Sliding session keepalive: check if token has less than 5 minutes remaining
      const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY)
      if (currentToken && now - lastRefreshCallRef.current > 45 * 1000) {
        const payload = parseJwtPayload(currentToken)
        if (payload?.exp) {
          const expMs = payload.exp * 1000
          if (expMs - now < 5 * 60 * 1000) {
            extendSession()
          }
        }
      }
    }
  }, [resetInactivityTimer, token, extendSession])


  const login = async (
    emailId: string,
    password: string
  ): Promise<LoginResult> => {
    if (loginInFlight.current) {
      if (import.meta.env.DEV) {
        console.warn('[Login API] Ignoring duplicate login call while in-flight')
      }
  
      throw new Error('Login already in progress. Please wait a moment.')
    }
  
    loginInFlight.current = true
    setIsLoading(true)
    setError('')
    try {
      const cleanIdentifier = emailId.trim()
      const loginPayload = {
        EmailID: cleanIdentifier,
        email: cleanIdentifier,
        username: cleanIdentifier,
        password,
      }
      if (import.meta.env.DEV) {
        console.log('[Login API] Request:', {
          endpoint: API_ENDPOINTS.auth.login,
          method: 'POST',
          body: loginPayload,
        })
      }
      let result, responseText, responseData: unknown

      try {
        result = await axios.post(
          API_ENDPOINTS.auth.login,
          loginPayload,
          {
            headers: { APIKEY: 'Securitas@#!1234', 'Content-Type': 'application/json' },
            validateStatus: () => true // Always resolve, we'll check status
          }
        )
        responseText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
        responseData = result.data
      } catch (err: any) {
        // Properly handle axios errors that have no response
        if (err.response) {
          responseText = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)
          responseData = err.response.data
        } else {
          responseData = { message: err.message }
          responseText = err.message
        }
        result = { status: err.response?.status ?? 0, ok: false }
      }

      if (import.meta.env.DEV) console.log('[Login API] Response:', responseData)
      const data = getLoginResponse(responseData, cleanIdentifier)

      // 1. Immediately check if an OTP was sent to user's email
      const rawMessage = (typeof (responseData as any)?.message === 'string' ? (responseData as any).message : data.message) || ''
      const isOtpDispatched =
        /otp/i.test(rawMessage) ||
        (responseData as any)?.otpRequired === true ||
        (responseData as any)?.isOtpRequired === true ||
        (!data.token && /sent to your email/i.test(rawMessage))

      if (isOtpDispatched) {
        const dispatchedEmail = (responseData as any)?.EmailID || (responseData as any)?.email || cleanIdentifier
        if (dispatchedEmail) {
          localStorage.setItem('worktrail_client_email', dispatchedEmail)
        }
        if ((responseData as any)?.user) {
          try {
            localStorage.setItem('worktrail_temp_user', JSON.stringify((responseData as any).user))
          } catch {}
        }
        return {
          otpRequired: true,
          message: rawMessage || 'A login OTP was sent to your email.',
          EmailID: dispatchedEmail
        }
      }

      // 2. Only if NOT an OTP dispatch and primary endpoint returned an internal server error / 404, try altEndpoint
      const isFailedOrServerError =
        (result.status !== 200 && result.status !== 201) ||
        (typeof responseData === 'object' &&
          responseData !== null &&
          (responseData as any).loginStatus === false &&
          typeof (responseData as any).message === 'string' &&
          (responseData as any).message.toLowerCase().includes('internal server error'))

      const altEndpoint = (API_ENDPOINTS.auth as any).loginAlt
      if (isFailedOrServerError && altEndpoint && altEndpoint !== API_ENDPOINTS.auth.login) {
        try {
          if (import.meta.env.DEV) {
            console.log('[Login API] Attempting fallback endpoint:', altEndpoint)
          }

          let altResult, altText, altData
          try {
            altResult = await axios.post(
              altEndpoint,
              loginPayload,
              {
                headers: { APIKEY: 'Securitas@#!1234', 'Content-Type': 'application/json' },
                validateStatus: () => true
              }
            )
            altText = typeof altResult.data === 'string' ? altResult.data : JSON.stringify(altResult.data)
            altData = altResult.data
          } catch (altErr: any) {
            if (altErr.response) {
              altText = typeof altErr.response.data === 'string' ? altErr.response.data : JSON.stringify(altErr.response.data)
              altData = altErr.response.data
            } else {
              altText = altErr.message
              altData = { message: altErr.message }
            }
            altResult = { status: altErr.response?.status ?? 0, ok: false }
          }
          const altMsg = (typeof altData?.message === 'string' ? altData.message : '') || ''
          if (/otp/i.test(altMsg) || altData?.otpRequired) {
            return {
              otpRequired: true,
              message: altMsg || 'A login OTP was sent to your email.'
            }
          }
          if ((altResult.status === 200 || altResult.status === 201) && (altData.loginStatus === true || altData.token)) {
            result = altResult
            responseData = altData
          }
        } catch {
          // Keep primary response
        }
      }

      if ((result.status !== 200 && result.status !== 201) || data.loginStatus !== true || !data.token || !data.user) {
        const rawMsg = data.message || `Login failed (${result.status})`
        if (rawMsg.toLowerCase().includes('internal server error')) {
          throw new Error('Invalid user credentials or account not found. Please check your User ID / Email and password.')
        }
        throw new Error(rawMsg)
      }

      if (String(data.user.activestatus) !== '1') {
        throw new Error('Your account is inactive. Please contact an administrator.')
      }

      // Update menu selection logic to pick correct menu for user type
      const availableMenu = data.user.Usertype ? getMenuForUserType(data.user.Usertype) : []
      setMenu(availableMenu)
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
      localStorage.removeItem(SESSION_EXPIRED_KEY)
      sessionStorage.removeItem(SESSION_EXPIRED_KEY)
      setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))
      setIsExpiringSoon(false)
      return { user: data.user, otpRequired: false }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to connect to the login service.'
      setError(message)
      throw new Error(message)
    } finally {
      loginInFlight.current = false
      setIsLoading(false)
    }
  }

  const verifyOtp = async (emailId: string, otp: string, password?: string): Promise<AuthUser> => {
    if (verifyInFlight.current) {
      if (import.meta.env.DEV) console.warn('[Verify OTP API] Ignoring duplicate verify call while in-flight')
      throw new Error('Verification already in progress. Please wait a moment.')
    }
    verifyInFlight.current = true
    setIsLoading(true)
    setError('')
    try {
      const cleanIdentifier = emailId.trim()
      const cleanOtp = otp.trim()
      const otpPayload = {
        EmailID: cleanIdentifier,
        email: cleanIdentifier,
        username: cleanIdentifier,
        password: password || '',
        OTP: cleanOtp,
        otp: cleanOtp,
      }

      // Dedicated OTP verification endpoints ONLY (NEVER include /login to avoid re-generating OTPs):
      const baseApi = API_ENDPOINTS.auth.login.replace(/\/login$/i, '')
      const endpointsToTry = [
        API_ENDPOINTS.auth.verifyLoginOtp,             // https://worktrail.ai/api/VerifyLoginOtp
        `${baseApi}/VerifyOtp`,                        // https://worktrail.ai/api/VerifyOtp
        `${baseApi}/verifyLoginOtp`,                   // https://worktrail.ai/api/verifyLoginOtp
        `${baseApi}/verifyOtp`,                        // https://worktrail.ai/api/verifyOtp
        (API_ENDPOINTS.auth as any).verifyLoginOtpAlt, // https://worktrail.ai/api/Auth/VerifyLoginOtp
        `${baseApi}/Auth/VerifyOtp`,                   // https://worktrail.ai/api/Auth/VerifyOtp
      ].filter(Boolean)

      let lastError = 'OTP verification failed'
      let verifiedUser: AuthUser | null = null
      let receivedToken: string | null = null

      for (const endpoint of endpointsToTry) {
        try {
          if (import.meta.env.DEV) {
            console.log('[Verify Login OTP API] Trying endpoint:', endpoint)
          }
          let res, text, json: any
          try {
            res = await axios.post(
              endpoint,
              otpPayload,
              {
                headers: { APIKEY: 'Securitas@#!1234', 'Content-Type': 'application/json' },
                validateStatus: () => true
              }
            )
            text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
            json = res.data
          } catch (err: any) {
            if (err.response) {
              text = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)
              json = err.response.data
            } else {
              text = err.message
              json = { message: err.message }
            }
            res = { status: err.response?.status ?? 0 }
          }
          
          // Skip if endpoint does not exist (Express HTML "Cannot POST ...")
          if (res.status === 404 || text.includes('Cannot POST') || text.includes('<!DOCTYPE html>')) {
            continue
          }

          if (import.meta.env.DEV) {
            console.log('[Verify Login OTP API] Response from', endpoint, ':', json)
          }
          console.log(json.token)

          const parsed = getLoginResponse(json, cleanIdentifier)

          if (parsed.loginStatus === true && parsed.token) {
            if (!parsed.user && localStorage.getItem('worktrail_temp_user')) {
              try {
                const temp = JSON.parse(localStorage.getItem('worktrail_temp_user') || '{}')
                parsed.user = normalizeAuthUser(temp, json, cleanIdentifier) || undefined
              } catch {}
            }
            if (parsed.user) {
              const finalEmail = (json as any)?.EmailID || (json as any)?.email ||  cleanIdentifier
              if (finalEmail) {
                localStorage.setItem('worktrail_client_email', finalEmail)
              }
              verifiedUser = parsed.user
              receivedToken = parsed.token
              break
            }
          }

          if (json && typeof json.message === 'string') {
            const msg = json.message
            if (!/cannot post/i.test(msg) && !/a login otp was sent/i.test(msg)) {
              lastError = msg
              if (/invalid/i.test(msg) || /expired/i.test(msg) || /incorrect/i.test(msg) || /wrong/i.test(msg)) {
                throw new Error(msg)
              }
            }
          }
        } catch (candidateErr: any) {
          if (/invalid/i.test(candidateErr.message) || /expired/i.test(candidateErr.message) || /incorrect/i.test(candidateErr.message)) {
            throw candidateErr
          }
          // Try next verification endpoint
        }
      }

      if (!verifiedUser || !receivedToken) {
        throw new Error(lastError || 'Invalid or expired verification code.')
      }

      if (String(verifiedUser.activestatus) !== '1') {
        throw new Error('Your account is inactive. Please contact an administrator.')
      }

      const availableMenu = verifiedUser.Usertype ? getMenuForUserType(verifiedUser.Usertype) : []
      setMenu(availableMenu)
      setUser(verifiedUser)
      setToken(receivedToken)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(verifiedUser))
      localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken)
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
      localStorage.removeItem(SESSION_EXPIRED_KEY)
      sessionStorage.removeItem(SESSION_EXPIRED_KEY)
      setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))
      setIsExpiringSoon(false)
      return verifiedUser
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Invalid or expired verification code.'
      setError(message)
      throw new Error(message)
    } finally {
      verifyInFlight.current = false
      setIsLoading(false)
    }
  }

  const logout = useCallback((dueToInactivity: boolean = false) => {
    // 1. Call backend logout endpoint asynchronously with token
    const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY)
    if (currentToken) {
      fetch(API_ENDPOINTS.auth.logout, {
        method: 'POST',
        headers: {
          APIKEY: 'Securitas@#!1234',
          Authorization: `Bearer ${currentToken}`
        }
      }).catch(() => {})
    }

    // 2. Clear state
    setUser(null)
    setToken(null)
    setMenu([])
    setIsExpiringSoon(false)
    setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))

    // 3. Clear storage
    try {
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      localStorage.removeItem('worktrail_client_email')
      localStorage.removeItem('worktrail_temp_user')
      if (dueToInactivity) {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
        localStorage.setItem(SESSION_EXPIRED_KEY, String(Date.now()))
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?sessionExpired=true'
        }
      } else {
        localStorage.removeItem(SESSION_EXPIRED_KEY)
        sessionStorage.removeItem(SESSION_EXPIRED_KEY)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    } catch {}
  }, [token])

  // Active Session and Inactivity Tracking Effect (10-minute timeout with sliding keepalive)
  useEffect(() => {
    if (!user || !token) {
      setIsExpiringSoon(false)
      return
    }

    // Initialize activity if missing
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    // Listen to all user activity events across the application
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }))

    // Sync activity & token across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = Number(e.newValue)
        lastRecordedRef.current = remoteTime
        const elapsed = Date.now() - remoteTime
        setRemainingSeconds(Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000)))
        setIsExpiringSoon(elapsed >= SESSION_TIMEOUT_MS - SESSION_WARNING_MS)
      }
      if (e.key === TOKEN_STORAGE_KEY) {
        if (!e.newValue) {
          // User logged out in another tab
          setUser(null)
          setToken(null)
          setMenu([])
        } else if (e.newValue !== token) {
          // Token refreshed in another tab
          setToken(e.newValue)
          lastRefreshCallRef.current = Date.now()
        }
      }
      if (e.key === SESSION_EXPIRED_KEY && e.newValue) {
        logout(true)
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Listen for custom session-expired event dispatched by endpoint.tsx interceptor
    const handleCustomExpired = () => {
      logout(true)
    }
    window.addEventListener('worktrail-session-expired', handleCustomExpired)

    // Listen for custom token refreshed event dispatched by endpoint.tsx / axios interceptors
    const handleTokenRefreshed = (e: Event) => {
      const newToken = (e as CustomEvent).detail?.token
      if (newToken && typeof newToken === 'string') {
        setToken(newToken)
        lastRefreshCallRef.current = Date.now()
        setIsExpiringSoon(false)
        setRemainingSeconds(Math.ceil(SESSION_TIMEOUT_MS / 1000))
      }
    }
    window.addEventListener('worktrail-token-refreshed', handleTokenRefreshed)

    // Interval checks elapsed inactivity every second and sliding session keepalive
    const interval = setInterval(() => {
      const storedLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now())
      const elapsed = Date.now() - storedLast
      const remaining = Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000))
      setRemainingSeconds(remaining)

      if (elapsed >= SESSION_TIMEOUT_MS) {
        logout(true)
      } else if (elapsed >= SESSION_TIMEOUT_MS - SESSION_WARNING_MS) {
        setIsExpiringSoon(true)
      } else {
        setIsExpiringSoon(false)

        // Sliding session keepalive: while user is active, if token has < 4 minutes left, silently refresh
        const now = Date.now()
        const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY)
        if (currentToken && now - lastRefreshCallRef.current > 45 * 1000) {
          const payload = parseJwtPayload(currentToken)
          if (payload?.exp) {
            const expMs = payload.exp * 1000
            if (expMs - now < 4 * 60 * 1000) {
              extendSession()
            }
          }
        }
      }
    }, 1000)

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity))
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('worktrail-session-expired', handleCustomExpired)
      window.removeEventListener('worktrail-token-refreshed', handleTokenRefreshed)
      clearInterval(interval)
    }
  }, [user, token, handleUserActivity, logout, extendSession])


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        menu,
        isAuthenticated: user?.activestatus === '1' && Boolean(token),
        isLoading,
        isMenuLoading,
        menuError,
        error,
        remainingSeconds,
        isExpiringSoon,
        resetInactivityTimer,
        extendSession,
        login,
        verifyOtp,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function normalizeAuthUser(candidate: any, rootPayload?: any, fallbackEmail?: string): AuthUser | null {
  if (typeof candidate !== 'object' || candidate === null) return null
  const usertype = candidate.Usertype || candidate.UserType || candidate.usertype || candidate.role || candidate.userType
  if (!usertype || typeof usertype !== 'string') return null

  const resolvedEmail = String(
    candidate.EmailID ||
    candidate.email ||
    candidate.Email ||
    candidate.emailId ||
    rootPayload?.EmailID ||
    rootPayload?.email ||
    rootPayload?.Email ||
    rootPayload?.emailId ||
    fallbackEmail ||
    (candidate.username && candidate.username.includes('@') ? candidate.username : '') ||
    ''
  ).trim()

  const activestatus = candidate.activestatus !== undefined ? String(candidate.activestatus) : '1'
  return {
    ...candidate,
    id: candidate.id || candidate.UserMasterID || candidate.userMasterId,
    UserMasterID: candidate.UserMasterID,
    OrgMasterID: candidate.OrgMasterID,
    CompanyCode: candidate.CompanyCode,
    username: candidate.username || resolvedEmail || '',
    email: resolvedEmail,
    Email: resolvedEmail,
    EmailID: resolvedEmail,
    FirstName: candidate.FirstName || candidate.firstName || '',
    LastName: candidate.LastName || candidate.lastName || '',
    CompanyName: candidate.CompanyName || candidate.companyName || '',
    created_at: candidate.created_at || new Date().toISOString(),
    activestatus,
    Usertype: usertype,
  }
}

function getLoginResponse(value: unknown, fallbackEmail?: string): LoginResponse {
  if (typeof value !== 'object' || value === null) return {}
  const response = value as {
    message?: unknown
    user?: unknown
    data?: unknown
    loginStatus?: unknown
    token?: unknown
    EmailID?: unknown
    email?: unknown
    Email?: unknown
  }

  const payloadEmail =
    (typeof response.EmailID === 'string' ? response.EmailID : '') ||
    (typeof response.email === 'string' ? response.email : '') ||
    (typeof response.Email === 'string' ? response.Email : '') ||
    fallbackEmail ||
    ''

  const user = normalizeAuthUser(response.user, response, payloadEmail)
  if (user) {
    return {
      message: typeof response.message === 'string' ? response.message : undefined,
      loginStatus: response.loginStatus === true || response.loginStatus === 'true',
      token: typeof response.token === 'string' ? response.token : (typeof (response as any).accessToken === 'string' ? (response as any).accessToken : undefined),
      user
    }
  }
  if (typeof response.data === 'object' && response.data !== null) return getLoginResponse(response.data, fallbackEmail || payloadEmail)
  return {
    message: typeof response.message === 'string' ? response.message : undefined,
    loginStatus: response.loginStatus === true || response.loginStatus === 'true',
    token: typeof response.token === 'string' ? response.token : undefined
  }
}
