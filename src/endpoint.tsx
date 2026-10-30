import rawAxios from 'axios';

/**
 * Lightweight Axios-compatible HTTP client & API Endpoints.
 * Pure fetch implementation with zero external dependencies.
 */

// Main API base headers (without the token)
export const API_HEADER = {
  APIKEY: "Securitas@#!1234",
  "Content-Type": "application/json",
};

// Helper to produce headers including Authorization token if available
export const getAPI_HEADER = (): Record<string, string> => {
  const token = typeof window !== "undefined" ? localStorage.getItem('worktrail_token') : null;
  return {
    ...API_HEADER,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface AxiosRequestConfig {
  baseURL?: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  timeout?: number
  _retry?: boolean
  _isRetry?: boolean
  [key: string]: any
}

export interface AxiosResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Headers
  config: AxiosRequestConfig
}

export class AxiosClient {
  public defaults: AxiosRequestConfig
  public interceptors = {
    request: { use: (fn: (c: AxiosRequestConfig) => any) => { this.reqInterceptors.push(fn) } },
    response: { use: (fn: (r: AxiosResponse) => any) => { this.resInterceptors.push(fn) } },
  }
  private reqInterceptors: Array<(c: AxiosRequestConfig) => any> = []
  private resInterceptors: Array<(r: AxiosResponse) => any> = []

  constructor(defaults: AxiosRequestConfig = {}) {
    this.defaults = { headers: { ...API_HEADER }, ...defaults }
  }

  async request<T = any>(cfg: AxiosRequestConfig & { url?: string; method?: string }): Promise<AxiosResponse<T>> {
    let conf: AxiosRequestConfig = {
      ...this.defaults,
      ...cfg,
      headers: { ...this.defaults.headers, ...cfg.headers },
    }
    for (const fn of this.reqInterceptors) conf = (await fn(conf)) || conf

    let url = conf.url || ''
    if (!/^https?:\/\//i.test(url) && conf.baseURL) {
      url = `${conf.baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
    }

    if (conf.params) {
      const q = new URLSearchParams()
      Object.entries(conf.params).forEach(([k, v]) => v != null && q.append(k, String(v)))
      const qs = q.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }

    const isJson = conf.data && typeof conf.data === 'object' && !(conf.data instanceof FormData || conf.data instanceof Blob)
    const res = await fetch(url, {
      method: (conf.method || 'GET').toUpperCase(),
      headers: conf.headers,
      body: isJson ? JSON.stringify(conf.data) : conf.data,
    })

    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => '')
    let axiosRes: AxiosResponse<T> = { data, status: res.status, statusText: res.statusText, headers: res.headers, config: conf }

    // Sliding Session: Pick up refreshed token from response header if present
    const refreshedToken = res.headers.get('x-refreshed-token') || res.headers.get('X-Refreshed-Token')
    if (refreshedToken && typeof window !== 'undefined') {
      localStorage.setItem('worktrail_token', refreshedToken)
      localStorage.setItem('worktrail_last_activity', String(Date.now()))
      window.dispatchEvent(new CustomEvent('worktrail-token-refreshed', { detail: { token: refreshedToken } }))
    }

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        const isAuthUrl = /login|verifyotp|verifyloginotp|auth\/refresh|auth\/logout/i.test(url)
        const lastActivity = Number(localStorage.getItem('worktrail_last_activity') || '0')
        const isRecentlyActive = (Date.now() - lastActivity) < 10 * 60 * 1000
        const isRetry = Boolean((conf as any)._isRetry)

        // If user was active recently, attempt transparent token refresh and retry
        if (!isAuthUrl && !isRetry && isRecentlyActive) {
          const currentToken = localStorage.getItem('worktrail_token')
          if (currentToken) {
            try {
              const refreshRes = await fetch(API_ENDPOINTS.auth.refresh, {
                method: 'POST',
                headers: {
                  APIKEY: 'Securitas@#!1234',
                  Authorization: `Bearer ${currentToken}`
                }
              })
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json()
                if (refreshData?.token) {
                  localStorage.setItem('worktrail_token', refreshData.token)
                  localStorage.setItem('worktrail_last_activity', String(Date.now()))
                  window.dispatchEvent(new CustomEvent('worktrail-token-refreshed', { detail: { token: refreshData.token } }))
                  return await this.request({
                    ...cfg,
                    _isRetry: true,
                    headers: {
                      ...cfg.headers,
                      Authorization: `Bearer ${refreshData.token}`
                    }
                  })
                }
              }
            } catch {
              // Refresh failed, proceed to dispatch session expired
            }
          }
        }

        // Dispatch custom session expired event
        window.dispatchEvent(new CustomEvent('worktrail-session-expired', {
          detail: {
            status: 401,
            code: data?.code || 'SESSION_EXPIRED',
            message: data?.message || 'Session expired. Please log in again.'
          }
        }))
      }
      const err: any = new Error(data?.message || `Request failed with status code ${res.status}`)
      err.response = axiosRes
      err.config = conf
      err.status = res.status
      throw err
    }

    for (const fn of this.resInterceptors) axiosRes = (await fn(axiosRes)) || axiosRes
    return axiosRes
  }

  get = <T = any>(url: string, c?: AxiosRequestConfig) => this.request<T>({ ...c, url, method: 'GET' })
  post = <T = any>(url: string, data?: any, c?: AxiosRequestConfig) => this.request<T>({ ...c, url, data, method: 'POST' })
  put = <T = any>(url: string, data?: any, c?: AxiosRequestConfig) => this.request<T>({ ...c, url, data, method: 'PUT' })
  delete = <T = any>(url: string, c?: AxiosRequestConfig) => this.request<T>({ ...c, url, method: 'DELETE' })
  patch = <T = any>(url: string, data?: any, c?: AxiosRequestConfig) => this.request<T>({ ...c, url, data, method: 'PATCH' })
}

//export const STAGE_URL = 'https://worktrail.ai/api'
//export const STAGE_URL = 'http://10.80.0.83:3001/api'
export const STAGE_URL = 'http://localhost:3001/api'

export const apiClient = new AxiosClient({
  baseURL: STAGE_URL,
  headers: getAPI_HEADER(),
})

apiClient.interceptors.request.use((config) => {
  // Use the helper to guarantee up-to-date token every call
  config.headers = {
    ...API_HEADER,
    ...(typeof window !== "undefined" && localStorage.getItem("worktrail_token")
      ? { Authorization: `Bearer ${localStorage.getItem("worktrail_token")}` }
      : {}),
    ...config.headers,
  }
  return config
})

// Configure global npm axios to support sliding session and auto-refresh
rawAxios.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('worktrail_token') : null
  if (token && !config.headers?.Authorization && !config.headers?.authorization) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  if (!config.headers?.APIKEY && !config.headers?.apikey) {
    config.headers = config.headers || {}
    config.headers.APIKEY = 'Securitas@#!1234'
  }
  return config
})

rawAxios.interceptors.response.use(
  (response) => {
    const refreshedToken = response.headers?.['x-refreshed-token'] || response.headers?.['X-Refreshed-Token']
    if (refreshedToken && typeof window !== 'undefined') {
      localStorage.setItem('worktrail_token', refreshedToken)
      localStorage.setItem('worktrail_last_activity', String(Date.now()))
      window.dispatchEvent(new CustomEvent('worktrail-token-refreshed', { detail: { token: refreshedToken } }))
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest?._retry) {
      const url = String(originalRequest?.url || '')
      const isAuthUrl = /login|verifyotp|verifyloginotp|auth\/refresh|auth\/logout/i.test(url)
      const lastActivity = Number(typeof window !== 'undefined' ? localStorage.getItem('worktrail_last_activity') || '0' : '0')
      const isRecentlyActive = (Date.now() - lastActivity) < 10 * 60 * 1000

      if (!isAuthUrl && isRecentlyActive) {
        originalRequest._retry = true
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('worktrail_token') : null
        if (currentToken) {
          try {
            const refreshRes = await fetch(API_ENDPOINTS.auth.refresh, {
              method: 'POST',
              headers: {
                APIKEY: 'Securitas@#!1234',
                Authorization: `Bearer ${currentToken}`
              }
            })
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json()
              if (refreshData?.token) {
                localStorage.setItem('worktrail_token', refreshData.token)
                localStorage.setItem('worktrail_last_activity', String(Date.now()))
                window.dispatchEvent(new CustomEvent('worktrail-token-refreshed', { detail: { token: refreshData.token } }))
                originalRequest.headers = originalRequest.headers || {}
                originalRequest.headers.Authorization = `Bearer ${refreshData.token}`
                return rawAxios(originalRequest)
              }
            }
          } catch {
            // refresh failed
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('worktrail-session-expired', {
          detail: {
            status: 401,
            code: error.response?.data?.code || 'SESSION_EXPIRED',
            message: error.response?.data?.message || 'Session expired. Please log in again.'
          }
        }))
      }
    }
    return Promise.reject(error)
  }
)

export const axios = {
  create: (config?: AxiosRequestConfig) => new AxiosClient(config),
  get: (url: string, config?: AxiosRequestConfig) => apiClient.get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => apiClient.delete(url, config),
  patch: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch(url, data, config),
}


export const API_ENDPOINTS = {
  auth: {
    login: `${STAGE_URL}/Login`,
    loginAlt: `${STAGE_URL}/login`,
    register: `${STAGE_URL}/Register`,
    logout: `${STAGE_URL}/auth/logout`,
    session: `${STAGE_URL}/auth/session`,
    me: `${STAGE_URL}/auth/me`,
    refresh: `${STAGE_URL}/auth/refresh`,
    verifyLoginOtp: `${STAGE_URL}/VerifyLoginOtp`,
    verifyRegistrationOtp: `${STAGE_URL}/VerifyRegistrationOtp`,
    requestPasswordReset: `${STAGE_URL}/RequestPasswordReset`,
    updatePassword: `${STAGE_URL}/UpdatePassword`,
  },
  menu: `${STAGE_URL}/Menu`,
  payments: {
    createOrder: `${STAGE_URL}/Payment/CreateOrder`,
    verify: `${STAGE_URL}/Payment/Verify`,
    failure: `${STAGE_URL}/Payment/Failure`,
    transaction: (orderId: string) => `${STAGE_URL}/Payment/Transaction/${encodeURIComponent(orderId)}`,
  },
  clientEmpData: `${STAGE_URL}/ClientEmpData`,
  clientEmpStatus: `${STAGE_URL}/ClientEmpStatus`,
  reviewClientData: `${STAGE_URL}/ReviewClientData`,
  clientDocumentUpdate: `${STAGE_URL}/ClientDocumentUpdate`,
  users: {
    profile: `${STAGE_URL}/users/profile`,
  },
  OrgmasterData:`${STAGE_URL}/OrgmasterData`,
  ContributorData:`${STAGE_URL}/ContributorData`,
  ContributorEmpSearch:`${STAGE_URL}/ContributorEmpSearch`,
  ContributorEditData:`${STAGE_URL}/ContributorEditData`,
  ContributorAdminFormDynamic:`${STAGE_URL}/ContributorAdminFormDynamic`,
  ContributorAdminData:`${STAGE_URL}/ContributorAdminData`,
  ContributorRegister:`${STAGE_URL}/ContributorRegister`,
  ContributorDelete:`${STAGE_URL}/ContributorDelete`,
  ContributorUpdate:`${STAGE_URL}/ContributorUpdate`,
  UpdateFinalReport:`${STAGE_URL}/UpdateFinalReport`,
  AdminClientData:`${STAGE_URL}/AdminClientData`,
  Orgmastermanage:`${STAGE_URL}/Orgmastermanage`,
  OrgmasterNameUpdate:`${STAGE_URL}/OrgmasterNameUpdate`,
  OrgmasterDelete:`${STAGE_URL}/OrgmasterDelete`,
  ContributorServiceRequest:`${STAGE_URL}/ContributorServiceRequest`,
  DownloadUpdatePDF:`${STAGE_URL}/DownloadUpdatePDF`,
  ContributorDash : `${STAGE_URL}/ContributorDash`,
  AdminRequestProgress:`${STAGE_URL}/AdminRequestProgress`,
  AdminDash:`${STAGE_URL}/AdminDash`,
  PaymentAdminData:`${STAGE_URL}/PaymentAdminData`,
  FacilitatorsData:`${STAGE_URL}/FacilitatorsData`,
  FacilitatorStatus:`${STAGE_URL}/FacilitatorStatus`,
  FacilitatorsMapData:`${STAGE_URL}/FacilitatorsMapData`,
  MapFacilitatorToOrg:`${STAGE_URL}/MapFacilitatorToOrg`,
  DeleteFacilitatorOrgMap:`${STAGE_URL}/DeleteFacilitatorOrgMap`,
  CreateFacilitator:`${STAGE_URL}/CreateFacilitator`,
  FacilitatorCommentsUpdate:`${STAGE_URL}/FacilitatorCommentsUpdate`,
  OrgsByFacilitator:`${STAGE_URL}/OrgsByFacilitator`,
  ContactUS:`${STAGE_URL}/ContactUS`,
  FascilatorComments:`${STAGE_URL}/FascilatorComments`,
  FascilatorDashboard:`${STAGE_URL}/FascilatorDashboard`,
  FacilitatorDashboard:`${STAGE_URL}/FacilitatorDashboard`
} as const

export type ApiEndpoint =
  (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS][keyof (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]]

export const API_HEADERS = { ...API_HEADER };