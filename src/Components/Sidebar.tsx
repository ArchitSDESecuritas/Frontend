import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type MenuRoute, CLIENT_MENU } from '../auth-context'
import { flattenMenu, menuPath } from './sidebar-utils'
import { useAuth } from '../useAuth'
import {
  LayoutGrid,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Building,
  Building2,
  UserCog,
  User,
  Trash2,
  Lock,
  LogOut,
  ChevronDown,
  FileText,
  Globe,
  Receipt,
  ClipboardList,
  X,Network
} from 'lucide-react'
import securitasLogo from '../assets/Img/logo_w.png'

type SidebarProps = {
  state: 'full' | 'mini' | 'closed';
  onClose?: () => void;
  userType?: string;
  menu: MenuRoute[];
  isLoading: boolean;
  error: string;
}

function Sidebar({ state, onClose, userType, menu, isLoading, error }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  // Robust client identification across any naming casing
  const effectiveUserType = (
    userType ||
    user?.Usertype ||
    (user as any)?.UserType ||
    (user as any)?.role ||
    ''
  ).toLowerCase().trim().replace(/[\s_-]+/g, '')

  const isClient = effectiveUserType.includes('client')

  // Guarantee client menu items are present even if menu state from context is stale/empty
  let resolvedMenu = (menu && menu.length > 0) ? menu : (isClient ? CLIENT_MENU : [])
  if (isClient && !resolvedMenu.some(item => item.Route.toLowerCase().includes('clientrequest') || item.components.toLowerCase().includes('clientrequest'))) {
    resolvedMenu = CLIENT_MENU
  }

  const menuItems = flattenMenu(resolvedMenu)

  const handleLogout = () => {
    logout(false)
  }

  // Get matching Lucide icon based on menu item route or component name
  const getIconForComponent = (item: MenuRoute) => {
    const comp = item.components.toLowerCase()
    const route = item.Route.toLowerCase()
    if (route.includes('createnew')) return UserCheck
    if (route.includes('candidateverification') || comp.includes('candidateverification')) return UserCheck
    if (comp.includes('dashboard')) return LayoutGrid
    if (route.includes('FacilitatorManage')) return Network
    if (comp.includes('servicerequest')) return ShieldCheck
    if (comp.includes('addemployee')) return UserPlus
    if (comp.includes('orgmaster')) return Building2
    if (comp.includes('usermaster')) return UserCog
    if (comp.includes('recyclebin')) return Trash2
    if (comp.includes('clientrequest') || route.includes('clientrequest')) return ClipboardList
    if (comp.includes('contributor')) return User
    if (comp.includes('invoice')) return Receipt
    if (comp.includes('privacypolicy')) return Lock
    if (comp.includes('termsandconditions')) return FileText
    if (comp.includes('otherservices')) return Globe
    return LayoutGrid
  }

  // Map route component to labels to match screenshot styling
  const getLabelForComponent = (item: MenuRoute) => {
    const comp = item.components.toLowerCase()
    const route = item.Route.toLowerCase()
    if (route.includes('createnew')) return 'Create New'
    if (route.includes('candidateverification') || comp.includes('candidateverification')) return 'Candidate Verification'
    if (comp.includes('dashboard')) return 'Dashboard'
     if (route.includes('facilitatormanage')) return 'Facilitator Manage'
    if (comp.includes('servicerequest')) return 'Service Requests'
    if (comp.includes('addemployee')) return 'Add Employee'
    if (comp.includes('orgmaster')) return 'Org Master'
    if (comp.includes('usermaster')) return 'User Master'
    if (comp.includes('recyclebin')) return 'Recycle Bin'
    if (comp.includes('clientrequest') || route.includes('clientrequest')) return 'Client Request'
    if (comp.includes('contributor')) return 'Contributor'
    if (comp.includes('invoice')) return isClient ? 'Invoice' : 'Invoices & Reports'
    if (comp.includes('privacypolicy')) return 'Privacy Policy'
    if (comp.includes('termsandconditions')) return 'Terms & Conditions'
    if (comp.includes('otherservices')) return 'Other Services'
    
    return item.components.replace(/\.tsx?$/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
  }

  return (
    <>
      {/* Backdrop cover for mobile/tablet when open */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${state !== 'closed' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      />

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-custom-gradient flex flex-col justify-between font-securitas select-none text-white border-r border-white/5 overflow-hidden transition-all duration-300 z-50 ${state === 'full'
          ? 'translate-x-0 w-64 p-6'
          : state === 'mini'
            ? 'translate-x-0 w-20 p-4'
            : '-translate-x-full md:translate-x-0 md:w-0 md:p-0 md:border-0 overflow-hidden'
          }`}
      >
        {/* Top Fixed Header Section */}
        <div className="flex flex-col shrink-0">
          {/* Securitas Brand Logo & Mobile Close */}
          <div className={`flex items-center justify-between mb-3 shrink-0 ${state === 'mini' ? 'justify-center' : ''}`}>
            <div className="flex items-center">
              <img
                src={securitasLogo}
                alt="Securitas"
                className={`${state === 'mini' ? 'h-11 w-11 object-contain' : 'h-6 object-contain'}`}
              />
            </div>
            {state !== 'mini' && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Close sidebar"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Separator line */}
          <div className="w-full border-t border-white/10 mb-2 shrink-0"></div>

          {/* Menu Section Header */}
          {state !== 'mini' && (
            <span className="text-[11px] font-extrabold tracking-widest text-[#4A6B82] uppercase mb-4 block shrink-0">
              MENU
            </span>
          )}
        </div>

        {/* Scrollable Menu Items Section */}
        <div className="flex-1 min-h-0 sidebar-scroll pr-1">
          {isLoading ? (
            <p className="text-xs text-white/55">Loading menu...</p>
          ) : error ? (
            <p className="text-xs text-red-300">{error}</p>
          ) : (
            <nav className="flex flex-col gap-1 pb-2">
              {menuItems.map((item) => {
                const path = menuPath(item.Route)
                const isActive =
                  location.pathname === path ||
                  (path === '/ServiceRequest' && location.pathname.startsWith('/ServiceRequestReview'))
                const Icon = getIconForComponent(item)
                const label = getLabelForComponent(item)
                const isServiceRequests = item.components.toLowerCase().includes('servicerequest')
                const isExternal = item.components.toLowerCase().includes('termsandconditions') || item.components.toLowerCase().includes('otherservices')
                const externalUrl = item.components.toLowerCase().includes('termsandconditions')
                  ? 'https://walsonsverify.com/assets/documents/Terms_and_condition.pdf'
                  : 'https://www.securitas.in/services/background-verification/'

                if (isExternal) {
                  return (
                    <a
                      key={`${item.Route}-${item.components}`}
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center rounded-2xl transition-all duration-200 group text-white hover:bg-white/10 ${state === 'mini' ? 'justify-center py-3 px-0' : 'justify-between px-4 py-3'
                        }`}
                      title={state === 'mini' ? label : undefined}
                    >
                      <div className={`flex items-center ${state === 'mini' ? 'gap-0' : 'gap-3.5'}`}>
                        <Icon className="w-5 h-5 text-white/90 group-hover:text-white" />
                        {state !== 'mini' && <span className="text-[13px] tracking-wide text-white">{label}</span>}
                      </div>
                    </a>
                  )
                }

                return (
                  <Link
                    key={`${item.Route}-${item.components}`}
                    to={path}
                    onClick={() => {
                      if (window.innerWidth < 768 && onClose) {
                        onClose()
                      }
                    }}
                    className={`flex items-center rounded-2xl transition-all duration-200 group ${state === 'mini' ? 'justify-center py-3 px-0' : 'justify-between px-4 py-3'
                      } ${isActive
                        ? 'bg-white/10 border border-white/5 text-slate-500 font-semibold shadow-inner'
                        : 'text-white hover:bg-white/10'
                      }`}
                    title={state === 'mini' ? label : undefined}
                  >
                    <div className={`flex items-center ${state === 'mini' ? 'gap-0' : 'gap-3.5'}`}>
                      <Icon
                        className={`w-5 h-5 transition-colors ${isActive
                          ? 'text-[#10B981]'
                          : 'text-white group-hover:text-white'
                          }`}
                      />
                      {state !== 'mini' && <span className="text-[13px] tracking-wide text-white">{label}</span>}
                    </div>
                    {state !== 'mini' && isActive && (
                      <span className="w-1.5 h-6 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]"></span>
                    )}
                    {state !== 'mini' && !isActive && isServiceRequests && (
                      <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white" />
                    )}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* Fixed Bottom Footer Section */}
        <div className="flex flex-col shrink-0 pt-4 mt-auto">
          {/* Separator line */}
          <div className="w-full border-t border-white/10 mb-4"></div>

          {/* Logout link button */}
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-2xl text-white hover:bg-white/10 transition-all duration-200 cursor-pointer text-left w-full select-none ${state === 'mini' ? 'justify-center py-3 px-0' : 'gap-3.5 px-4 py-3'
              }`}
            title={state === 'mini' ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 text-white group-hover:text-white" />
            {state !== 'mini' && <span className="text-[13px] font-semibold tracking-wide text-white">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
