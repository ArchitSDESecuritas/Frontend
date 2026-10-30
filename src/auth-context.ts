import { createContext } from 'react'

export type AuthUser = {
  id?: number
  username?: string
  CompanyName?: string
  CompanyCode?: string
  password?: string
  created_at?: string
  activestatus: string
  EmailID: string
  Usertype: 'Superadmin' | 'Admin' | 'Fascilator' | 'Contributor' | 'Client' | 'ContributorAdmin' | 'ContributorUser' | string
  UserMasterID?: number
  OrgMasterID?: number
}

export type MenuRoute = {
  Sno?: number
  Usertype?: 'Superadmin' | 'Admin' | 'Fascilator' | 'Contributor' | 'Client' | 'ContributorAdmin' | 'ContributorUser' | string
  Route: string
  components: string
  children?: MenuRoute[]
  submenu?: MenuRoute[]
}

// Session Constants (10 minutes inactivity timeout)
export const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes = 600,000 ms
export const SESSION_WARNING_MS = 60 * 1000     // 60 seconds warning before timeout
export const USER_STORAGE_KEY = 'worktrail_user'
export const TOKEN_STORAGE_KEY = 'worktrail_token'
export const LAST_ACTIVITY_KEY = 'worktrail_last_activity'
export const SESSION_EXPIRED_KEY = 'worktrail_session_expired'

/**
 * Safely parses the JSON payload from a JWT token without external libraries
 */
export function parseJwtPayload(token: string | null | undefined): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}


// Superadmin menu
export const SUPERADMIN_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'Superadmin', Route: '/AdminDashboard', components: 'AdminDashboard.tsx' },
  { Sno: 2, Usertype: 'Superadmin', Route: '/ServiceRequest', components: 'ServiceRequest.tsx' },
  { Sno: 3, Usertype: 'Superadmin', Route: '/FacilitatorManage', components: 'Facilitatororgmap.tsx' },
  { Sno: 4, Usertype: 'Superadmin', Route: '/UserMaster', components: 'Usermaster.tsx' },
  { Sno: 5, Usertype: 'Superadmin', Route: '/OrgMaster', components: 'OrgMaster.tsx' },
  { Sno: 5, Usertype: 'Superadmin', Route: '/Recyclebin', components: 'Recyclebin.tsx' },
  { Sno: 6, Usertype: 'Superadmin', Route: '/Client', components: 'Client.tsx' },
  { Sno: 7, Usertype: 'Superadmin', Route: '/Contributor', components: 'Contributor.tsx' },
  { Sno: 8, Usertype: 'Superadmin', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 9, Usertype: 'Superadmin', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 10, Usertype: 'Superadmin', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

// Admin menu
export const ADMIN_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'Admin', Route: '/dashboard', components: 'Dashboard.tsx' },
  { Sno: 2, Usertype: 'Admin', Route: '/ServiceRequest', components: 'ServiceRequest.tsx' },
  { Sno: 2, Usertype: 'Admin', Route: '/ServiceRequestReview', components: 'ServiceRequestReview.tsx' },
  { Sno: 3, Usertype: 'Admin', Route: '/AddEmployee', components: 'AddEmployee.tsx' },
  { Sno: 4, Usertype: 'Admin', Route: '/Client', components: 'Client.tsx' },
  { Sno: 5, Usertype: 'Admin', Route: '/Contributor', components: 'Contributor.tsx' },
  { Sno: 6, Usertype: 'Admin', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 7, Usertype: 'Admin', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 8, Usertype: 'Admin', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

// Fascilator menu
export const FASCILATOR_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'Fascilator', Route: '/dashboard', components: 'Dashboard.tsx' },
  { Sno: 2, Usertype: 'Fascilator', Route: '/ServiceRequest', components: 'ServiceRequest.tsx' },  { Sno: 5, Usertype: 'Fascilator', Route: '/Contributor', components: 'Contributor.tsx' },
  { Sno: 6, Usertype: 'Fascilator', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 7, Usertype: 'Fascilator', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 8, Usertype: 'Fascilator', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

// Contributor menu
export const CONTRIBUTOR_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'Contributor', Route: '/dashboard', components: 'Dashboard.tsx' },
  { Sno: 2, Usertype: 'Contributor', Route: '/ServiceRequest', components: 'ServiceRequest.tsx' },
  { Sno: 3, Usertype: 'Contributor', Route: '/AddEmployee', components: 'AddEmployee.tsx' },
  { Sno: 6, Usertype: 'Contributor', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 7, Usertype: 'Contributor', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 8, Usertype: 'Contributor', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

export const CONTRIBUTORADMIN_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'ContributorAdmin', Route: '/ContributorDashboard', components: 'ContributorDashboard.tsx' },
  { Sno: 2, Usertype: 'ContributorAdmin', Route: '/ServiceRequest', components: 'ContributorServicerequest.tsx' },
  { Sno: 3, Usertype: 'ContributorAdmin', Route: '/ConAdminAddEmployee', components: 'ConAdminAddEmployee.tsx' },
  { Sno: 3, Usertype: 'ContributorAdmin', Route: '/ConAdminUserMaster', components: 'ConAdminUsermaster.tsx' },
  { Sno: 6, Usertype: 'ContributorAdmin', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 7, Usertype: 'ContributorAdmin', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 8, Usertype: 'ContributorAdmin', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

export const CONTRIBUTORUSER_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'ContributorUser', Route: '/ContributorDashboard', components: 'ContributorDashboard.tsx'},
  { Sno: 2, Usertype: 'ContributorUser', Route: '/ServiceRequest', components: 'ServiceRequest.tsx' },
  { Sno: 3, Usertype: 'ContributorUser', Route: '/ConUserAddEmployee', components: 'ConUserAddEmployee.tsx' },
  { Sno: 6, Usertype: 'ContributorUser', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 7, Usertype: 'ContributorUser', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 8, Usertype: 'ContributorUser', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

// Client menu
export const CLIENT_MENU: MenuRoute[] = [
  { Sno: 1, Usertype: 'Client', Route: '/dashboard', components: 'Dashboard.tsx' },
  { Sno: 2, Usertype: 'Client', Route: '/CandidateVerification', components: 'CandidateVerificationForm.tsx' },
  { Sno: 2, Usertype: 'Client', Route: '/ClientRequest', components: 'ClientRequest.tsx' },
  { Sno: 4, Usertype: 'Client', Route: '/Termsandconditions', components: 'TermsandConditions.tsx' },
  { Sno: 5, Usertype: 'Client', Route: '/Privacypolicy', components: 'Privacypolicy.tsx' },
  { Sno: 6, Usertype: 'Client', Route: '/OtherServices', components: 'OtherServices.tsx' },
]

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC) ROUTE PERMISSIONS
// ==========================================
export const ROLE_ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['Superadmin', 'Admin', 'Fascilator', 'Client', 'Contributor', 'ContributorAdmin', 'ContributorUser'],
  '/AdminDashboard': ['Superadmin'],
  '/ContributorDashboard': ['ContributorAdmin', 'ContributorUser', 'Contributor', 'Superadmin'],
  '/CandidateVerification': ['Client', 'Superadmin'],
  '/ClientRequest': ['Client', 'Superadmin', 'Admin','Fascilator'],
  '/ServiceRequest': ['Superadmin', 'Admin', 'Fascilator', 'Contributor', 'ContributorAdmin', 'ContributorUser'],
  '/ServiceRequestReview': ['Admin', 'Superadmin','Fascilator'],
  '/AddEmployee': ['Admin', 'Contributor', 'Superadmin'],
  '/ConAdminAddEmployee': ['ContributorAdmin', 'Superadmin'],
  '/ConUserAddEmployee': ['ContributorUser', 'ContributorAdmin', 'Superadmin'],
  '/ConAdminUserMaster': ['ContributorAdmin', 'Superadmin'],
  '/FacilitatorManage': ['Superadmin'],
  '/UserMaster': ['Superadmin'],
  '/OrgMaster': ['Superadmin'],
  '/Recyclebin': ['Superadmin'],
  '/Client': ['Superadmin', 'Admin', 'Fascilator'],
  '/Contributor': ['Superadmin', 'Admin', 'Fascilator'],
  '/Invoice': ['Client', 'Superadmin', 'Admin'],
  '/Termsandconditions': ['Superadmin', 'Admin', 'Fascilator', 'Contributor', 'ContributorAdmin', 'ContributorUser', 'Client'],
  '/Privacypolicy': ['Superadmin', 'Admin', 'Fascilator', 'Contributor', 'ContributorAdmin', 'ContributorUser', 'Client'],
  '/OtherServices': ['Superadmin', 'Admin', 'Fascilator', 'Contributor', 'ContributorAdmin', 'ContributorUser', 'Client']
}

/**
 * Normalizes user role string for reliable comparison
 */
export const normalizeUserRole = (usertype?: string): string => {
  return (usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
}

/**
 * Normalizes a route path for matching (e.g. '/CandidateVerification/' -> '/CandidateVerification')
 */
export const normalizePath = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0].trim()
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1)
  }
  return clean
}

/**
 * Returns the default home dashboard route for a given user type
 */
export const getDefaultDashboardRoute = (usertype?: string): string => {
  const norm = normalizeUserRole(usertype)
  if (norm.includes('superadmin')) return '/AdminDashboard'
  if (norm.includes('contributoradmin') || norm.includes('contributoruser') || norm.includes('contributor')) {
    return '/ContributorDashboard'
  }
  if (norm.includes('client') || norm.includes('customer')) return '/dashboard'
  if (norm === 'admin') return '/dashboard'
  if (norm.includes('fascilator')) return '/dashboard'
  return '/dashboard'
}

/**
 * Checks whether a given path is authorized for the user's role
 */
export const isRouteAllowedForUser = (pathname: string, usertype?: string): boolean => {
  const normPath = normalizePath(pathname)
  const normRole = normalizeUserRole(usertype)

  // Public paths are always allowed
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/privacy-policy', '/cookie-policy']
  if (publicPaths.includes(normPath)) {
    return true
  }

  // Superadmin has unrestricted access to all routes
  if (normRole.includes('superadmin')) {
    return true
  }

  // Check defined role permissions table
  const allowedRoles = ROLE_ROUTE_PERMISSIONS[normPath]
  if (allowedRoles) {
    return allowedRoles.some((role) => {
      const normAllowed = normalizeUserRole(role)
      return normRole === normAllowed || normRole.includes(normAllowed)
    })
  }

  // Default fallback: allow if path starts with dashboard or is in user's menu
  return normPath === '/dashboard' || normPath === '/CandidateVerification'
}

export type LoginResult = {
  otpRequired?: boolean
  message?: string
  EmailID?: string
  user?: AuthUser
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  menu: MenuRoute[]
  isAuthenticated: boolean
  isLoading: boolean
  isMenuLoading: boolean
  menuError: string
  error: string
  // 10-minute session state
  remainingSeconds: number
  isExpiringSoon: boolean
  resetInactivityTimer: () => void
  extendSession: () => Promise<void>
  login: (emailId: string, password: string) => Promise<LoginResult>
  verifyOtp: (emailId: string, otp: string, password?: string) => Promise<AuthUser>
  logout: (dueToInactivity?: boolean) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
