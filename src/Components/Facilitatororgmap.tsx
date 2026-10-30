import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import {
    Building2,
    Users,
    Lock,
    Unlock,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Search,
    RefreshCw,
    X,
    ShieldCheck,
    Check
} from 'lucide-react'
import { API_ENDPOINTS, getAPI_HEADER } from '../endpoint'

type Facilitator = {
    id: number
    username: string
    EmailID?: string
    FirstName?: string
    LastName?: string
    ActiveStatus: number | string
}

type Organization = {
    OrganizationID: number
    OrganizationName: string
}

type FacilitatorMapping = {
    Id: number
    FacilitatorId: string
    OrgMasterId: string
    OrganizationName: string
    LockedStatus: string
    CreateDate: string
}

const Facilitatororgmap: React.FC = () => {
    const [facilitators, setFacilitators] = useState<Facilitator[]>([])
    const [allFacilitators, setAllFacilitators] = useState<Facilitator[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [refreshing, setRefreshing] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null)
    const [assignError, setAssignError] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState<boolean>(false)
    const [facilitatorMappings, setFacilitatorMappings] = useState<FacilitatorMapping[]>([])
    const [selectedOrgs, setSelectedOrgs] = useState<Set<number>>(new Set())
    const [orgFacilitator, setOrgFacilitator] = useState<{ [orgId: number]: number | '' }>({})
    const [orgSearch, setOrgSearch] = useState<string>('')
    const [facSearch, setFacSearch] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'locked' | 'unlocked'>('all')
    const [selectedFacilitatorFilter, setSelectedFacilitatorFilter] = useState<number | null>(null)
    const [deleteModal, setDeleteModal] = useState<{
        mappingId: number
        orgName: string
        facilitatorName: string
    } | null>(null)
    const [deactivateFacilitatorModal, setDeactivateFacilitatorModal] = useState<Facilitator | null>(null)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

    // Create Facilitator UI State
    const [showCreateFacilitator, setShowCreateFacilitator] = useState(false)
    const [showManageFacilitator, setShowManageFacilitator] = useState(false)
    const [manageStatusFilter, setManageStatusFilter] = useState<'active' | 'inactive'>('active')
    const [updatingFacilitatorId, setUpdatingFacilitatorId] = useState<number | null>(null)
    const [createFacForm, setCreateFacForm] = useState({
        UserName: '',
        Password: '',
        EmailD: '',
        FirstName: '',
        LastName: ''
    })
    const [isCreatingFacilitator, setIsCreatingFacilitator] = useState(false)
    const [createFacError, setCreateFacError] = useState<string | null>(null)
    const [createFacSuccess, setCreateFacSuccess] = useState<string | null>(null)

    // Utility: remove duplicates (keep most recent by CreateDate) for orgId
    function dedupeMappingsByOrgAndFacilitator(mappings: FacilitatorMapping[]): FacilitatorMapping[] {
        const latestMap: Record<string, FacilitatorMapping> = {}
        mappings.forEach(map => {
            const key = `${map.OrgMasterId}_${map.FacilitatorId}`
            if (!(key in latestMap)) {
                latestMap[key] = map
            } else {
                const old = latestMap[key]
                if (new Date(map.CreateDate) > new Date(old.CreateDate)) {
                    latestMap[key] = map
                }
            }
        })
        const orgLatest: Record<string, FacilitatorMapping> = {}
        for (const mapping of Object.values(latestMap)) {
            const key = mapping.OrgMasterId
            if (!(key in orgLatest)) {
                orgLatest[key] = mapping
            } else {
                if (mapping.LockedStatus === "1" && orgLatest[key].LockedStatus !== "1") {
                    orgLatest[key] = mapping
                } else if (
                    mapping.LockedStatus === orgLatest[key].LockedStatus &&
                    new Date(mapping.CreateDate) > new Date(orgLatest[key].CreateDate)
                ) {
                    orgLatest[key] = mapping
                }
            }
        }
        return Object.values(orgLatest)
    }

    const fetchAll = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)
        try {
            // Fetch facilitators
            const facilitatorsRes = await axios.get(
                API_ENDPOINTS.FacilitatorsData,
                { headers: getAPI_HEADER() }
            )
            const allAccounts: Facilitator[] = Array.isArray(facilitatorsRes.data) ? facilitatorsRes.data : []
            setAllFacilitators(allAccounts)
            setFacilitators(allAccounts.filter(facilitator => Number(facilitator.ActiveStatus) === 1))

            // Fetch organizations
            const orgsRes = await axios.get(
                API_ENDPOINTS.OrgmasterData,
                { headers: getAPI_HEADER() }
            )
            setOrganizations(Array.isArray(orgsRes.data?.data) ? orgsRes.data.data : [])

            // Fetch facilitator-org mappings (dedup and use only latest, one per org)
            const mappingsRes = await axios.get(
                API_ENDPOINTS.FacilitatorsMapData,
                { headers: getAPI_HEADER() }
            )
            const mappingsRaw: FacilitatorMapping[] = Array.isArray(mappingsRes.data) ? mappingsRes.data : []
            const deduped = dedupeMappingsByOrgAndFacilitator(mappingsRaw)
            setFacilitatorMappings(deduped)
        } catch (err: any) {
            setError(err?.message || 'Error fetching data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    // Derived: orgId -> latest mapping (locked if LockedStatus = "1")
    const lockedOrgMap = useMemo(() => {
        const map: Record<number, FacilitatorMapping | undefined> = {}
        facilitatorMappings.forEach(m => {
            if (m.LockedStatus === "1" && m.OrgMasterId) {
                map[Number(m.OrgMasterId)] = m
            }
        })
        return map
    }, [facilitatorMappings])

    // Derived: count of locked orgs assigned per facilitator ID
    const facilitatorAssignmentCounts = useMemo(() => {
        const counts: Record<number, number> = {}
        Object.values(lockedOrgMap).forEach(m => {
            if (m && m.FacilitatorId) {
                const fId = Number(m.FacilitatorId)
                counts[fId] = (counts[fId] || 0) + 1
            }
        })
        return counts
    }, [lockedOrgMap])

    const isOrgLockedToFacilitator = (orgId: number) =>
        !!lockedOrgMap[orgId] && lockedOrgMap[orgId]?.LockedStatus === "1"

    const getLockedFacilitatorIdForOrg = (orgId: number): number | null => {
        const mapping = lockedOrgMap[orgId]
        return mapping ? Number(mapping.FacilitatorId) : null
    }

    const handleOrgCheckbox = (orgId: number) => {
        if (isOrgLockedToFacilitator(orgId)) return
        setSelectedOrgs(prev => {
            const newSet = new Set(prev)
            if (newSet.has(orgId)) {
                newSet.delete(orgId)
            } else {
                newSet.add(orgId)
            }
            return newSet
        })
    }

    const handleFacilitatorChange = (orgId: number, facilitatorId: number) => {
        setOrgFacilitator(prev => ({
            ...prev,
            [orgId]: facilitatorId,
        }))
        if (!selectedOrgs.has(orgId) && facilitatorId) {
            setSelectedOrgs(prev => new Set(prev).add(orgId))
        }
    }

    const handleApplyFacilitatorToAllSelected = (facilitatorId: number) => {
        if (!facilitatorId) return
        setOrgFacilitator(prev => {
            const next = { ...prev }
            selectedOrgs.forEach(orgId => {
                next[orgId] = facilitatorId
            })
            return next
        })
    }

    const handleAssign = async () => {
        setAssignSuccess(null)
        setAssignError(null)
        if (selectedOrgs.size === 0) {
            setAssignError('Select at least one organization to assign.')
            return
        }
        for (const orgId of selectedOrgs) {
            if (!orgFacilitator[orgId]) {
                const org = organizations.find(o => o.OrganizationID === orgId)
                setAssignError(`Please pick a facilitator for "${org?.OrganizationName || 'selected organization'}".`)
                return
            }
            if (isOrgLockedToFacilitator(orgId)) {
                setAssignError('One or more selected organizations are already locked to a facilitator.')
                return
            }
            if (
                facilitatorMappings.find(
                    m =>
                        m.OrgMasterId === String(orgId) &&
                        m.FacilitatorId === String(orgFacilitator[orgId]) &&
                        m.LockedStatus === "1"
                )
            ) {
                setAssignError('A selected facilitator is already assigned/locked to an organization.')
                return
            }
        }

        setIsAssigning(true)
        try {
            for (const orgId of selectedOrgs) {
                const organization = organizations.find(org => org.OrganizationID === orgId)
                const organizationName = organization ? organization.OrganizationName : ''
                const postBody = {
                    orgId: orgId,
                    orgFacilitator: orgFacilitator[orgId],
                    organizationName: organizationName,
                }
                // Remove the console.log as per style
                await axios.post(
                    API_ENDPOINTS.MapFacilitatorToOrg,
                    postBody,
                    { headers: getAPI_HEADER() }
                )
            }
            setAssignSuccess(`${selectedOrgs.size} organization(s) assigned to facilitator successfully!`)
            setSelectedOrgs(new Set())
            setOrgFacilitator({})

            const mappingsRes = await axios.get(
                API_ENDPOINTS.FacilitatorsMapData,
                { headers: getAPI_HEADER() }
            )
            const mappingsRaw: FacilitatorMapping[] = Array.isArray(mappingsRes.data) ? mappingsRes.data : []
            const deduped = dedupeMappingsByOrgAndFacilitator(mappingsRaw)
            setFacilitatorMappings(deduped)
        } catch (e: any) {
            setAssignError(e?.message || 'Assignment failed. Please try again.')
        } finally {
            setIsAssigning(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteModal) return
        setIsDeleting(true)
        setAssignSuccess(null)
        setAssignError(null)
        try {
            const body = { id: deleteModal.mappingId }
            await axios.post(
                API_ENDPOINTS.DeleteFacilitatorOrgMap,
                body,
                { headers: getAPI_HEADER() }
            )
            setAssignSuccess(`Successfully unmapped ${deleteModal.facilitatorName} from ${deleteModal.orgName}!`)
            setDeleteModal(null)

            const mappingsRes = await axios.get(
                API_ENDPOINTS.FacilitatorsMapData,
                { headers: getAPI_HEADER() }
            )
            const mappingsRaw: FacilitatorMapping[] = Array.isArray(mappingsRes.data) ? mappingsRes.data : []
            const deduped = dedupeMappingsByOrgAndFacilitator(mappingsRaw)
            setFacilitatorMappings(deduped)
        } catch (e: any) {
            setAssignError(e?.message || 'Failed to delete mapping!')
        } finally {
            setIsDeleting(false)
        }
    }

    // CREATE FACILITATOR HANDLER
    const handleOpenCreateFacilitator = () => {
        setShowCreateFacilitator(true)
        setShowManageFacilitator(false)
        setCreateFacError(null)
        setCreateFacSuccess(null)
    }

    const handleCloseCreateFacilitator = () => {
        setShowCreateFacilitator(false)
        setShowManageFacilitator(false)
        setCreateFacError(null)
        setCreateFacSuccess(null)
        setCreateFacForm({
            UserName: '',
            Password: '',
            EmailD: '',
            FirstName: '',
            LastName: ''
        })
    }

    const handleChangeCreateFac = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setCreateFacForm(form => ({
            ...form,
            [name]: value,
        }))
    }

    const handleCreateFacilitatorSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreatingFacilitator(true)
        setCreateFacError(null)
        setCreateFacSuccess(null)
        // Basic validation: must have all values filled
        if (
            !createFacForm.UserName ||
            !createFacForm.Password ||
            !createFacForm.EmailD ||
            !createFacForm.FirstName ||
            !createFacForm.LastName
        ) {
            setCreateFacError('Please fill all the fields.')
            setIsCreatingFacilitator(false)
            return
        }
        try {
            const payload = {
                UserName: createFacForm.UserName,
                Password: createFacForm.Password,
                EmailID: createFacForm.EmailD,
                FirstName: createFacForm.FirstName,
                LastName: createFacForm.LastName
            }
            await axios.post(
                API_ENDPOINTS.CreateFacilitator,
                payload,
                {
                    headers: getAPI_HEADER(),
                    withCredentials: true // for the cookie
                }
            )
            setCreateFacSuccess('Facilitator created successfully.')
            setTimeout(() => {
                handleCloseCreateFacilitator()
                fetchAll()
            }, 1200)
        } catch (err: any) {
            setCreateFacError(err?.response?.data?.message || err?.message || "Failed to create facilitator.")
        } finally {
            setIsCreatingFacilitator(false)
        }
    }

    const handleManageFacilitator = () => {
        setShowCreateFacilitator(false)
        setShowManageFacilitator(true)
        setManageStatusFilter('active')
        setAssignError(null)
        setAssignSuccess(null)
    }

    const handleBackFromFacilitatorView = () => {
        setShowCreateFacilitator(false)
        setShowManageFacilitator(false)
        setCreateFacError(null)
        setCreateFacSuccess(null)
        setAssignError(null)
        setAssignSuccess(null)
    }

    const handleUpdateFacilitatorStatus = async (facilitator: Facilitator, activeStatus: 0 | 1) => {
        setUpdatingFacilitatorId(facilitator.id)
        setAssignError(null)
        setAssignSuccess(null)
        try {
            const response = await axios.post(
                API_ENDPOINTS.FacilitatorStatus,
                { facilitatorId: facilitator.id, activeStatus },
                { headers: getAPI_HEADER() }
            )
            const removedOrganizations: string[] = response.data?.unmappedOrganizations || []
            setAssignSuccess(
                activeStatus === 1
                    ? `${facilitator.username} is now active.`
                    : `${facilitator.username} is inactive.${removedOrganizations.length
                        ? ` Removed mappings: ${removedOrganizations.join(', ')}.`
                        : ''}`
            )
            setDeactivateFacilitatorModal(null)
            await fetchAll(true)
        } catch (err: any) {
            setAssignError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Failed to update facilitator status.'
            )
        } finally {
            setUpdatingFacilitatorId(null)
        }
    }

    // Filtered Facilitators
    const filteredFacilitators = useMemo(() => {
        if (!facSearch.trim()) return facilitators
        const q = facSearch.toLowerCase().trim()
        return facilitators.filter(f =>
            f.username.toLowerCase().includes(q) || String(f.id).includes(q)
        )
    }, [facilitators, facSearch])

    // Filtered Organizations
    const filteredOrganizations = useMemo(() => {
        return organizations.filter(org => {
            const isLocked = isOrgLockedToFacilitator(org.OrganizationID)
            const lockedFacId = getLockedFacilitatorIdForOrg(org.OrganizationID)
            if (statusFilter === 'locked' && !isLocked) return false
            if (statusFilter === 'unlocked' && isLocked) return false
            if (selectedFacilitatorFilter !== null && lockedFacId !== selectedFacilitatorFilter) {
                return false
            }
            if (orgSearch.trim()) {
                const q = orgSearch.toLowerCase().trim()
                const nameMatches = org.OrganizationName.toLowerCase().includes(q)
                const idMatches = String(org.OrganizationID).includes(q)
                const lockedFac = facilitators.find(f => f.id === lockedFacId)
                const facMatches = lockedFac ? lockedFac.username.toLowerCase().includes(q) : false
                return nameMatches || idMatches || facMatches
            }
            return true
        })
    }, [organizations, statusFilter, selectedFacilitatorFilter, orgSearch, lockedOrgMap, facilitators])

    const unlockedFilteredOrgs = useMemo(() => {
        return filteredOrganizations.filter(org => !isOrgLockedToFacilitator(org.OrganizationID))
    }, [filteredOrganizations, lockedOrgMap])

    const isAllUnlockedSelected =
        unlockedFilteredOrgs.length > 0 &&
        unlockedFilteredOrgs.every(org => selectedOrgs.has(org.OrganizationID))

    const handleToggleSelectAll = () => {
        setSelectedOrgs(prev => {
            const next = new Set(prev)
            if (isAllUnlockedSelected) {
                unlockedFilteredOrgs.forEach(org => next.delete(org.OrganizationID))
            } else {
                unlockedFilteredOrgs.forEach(org => next.add(org.OrganizationID))
            }
            return next
        })
    }

    // Counts for KPI Cards
    const totalOrgs = organizations.length
    const totalLockedOrgs = useMemo(() => {
        return organizations.filter(o => isOrgLockedToFacilitator(o.OrganizationID)).length
    }, [organizations, lockedOrgMap])
    const totalAvailableOrgs = totalOrgs - totalLockedOrgs

    return (
        <div className="space-y-6 font-securitas antialiased text-slate-800 select-text pb-12">
            {/* 1. Header Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-800/10 bg-gradient-to-r from-[#102c44] via-[#0D4C74] to-[#031f30] text-white p-6 sm:p-8">
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-[#10B981]">
                                <ShieldCheck className="w-5 h-5" />
                            </span>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#10B981]">
                                Superadmin Control Hub
                            </span>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Facilitator & Organization Mapping
                        </h1>
                        <p className="text-slate-200/85 text-xs sm:text-sm leading-relaxed font-normal">
                            Assign organizations to dedicated facilitators, manage lock credentials, and orchestrate client verification routing.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => fetchAll(true)}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title="Reload live data from server"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Facilitators */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-indigo-400/40 transition-all group">
                    <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Total Facilitators
                        </span>
                        <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {facilitators.length}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Authorized verifiers</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
                {/* ...rest KPI cards unchanged ... */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-400/40 transition-all group">
                    <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Total Organizations
                        </span>
                        <span className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                            {totalOrgs}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Registered enterprise orgs</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-400/40 transition-all group">
                    <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                            Mapped & Locked
                        </span>
                        <span className="text-2xl font-black text-emerald-600">
                            {totalLockedOrgs}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Active routing locks</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                        <Lock className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-amber-400/40 transition-all group">
                    <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 block">
                            Unmapped / Available
                        </span>
                        <span className="text-2xl font-black text-amber-600">
                            {totalAvailableOrgs}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Awaiting facilitator assignment</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                        <Unlock className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* 3. Alerts (Success / Error) */}
            {assignSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{assignSuccess}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAssignSuccess(null)}
                        className="p-1 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {assignError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{assignError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAssignError(null)}
                        className="p-1 text-rose-600 hover:text-rose-900 rounded-lg hover:bg-rose-100/60 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold">Error loading live data: {error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchAll()}
                        className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* --- Main Working Hub --- */}
            {loading ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-[#0680A6] rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-slate-700">Loading facilitator & organization directory...</span>
                    <span className="text-xs text-slate-400">Synchronizing mapping topology</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* If in create facilitator mode, show the form here, hiding the two main panels */}
                    {showCreateFacilitator ? (
                        <div className="lg:col-span-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center p-10 min-h-[420px]">
                            <form
                                className="w-full max-w-md space-y-5 mx-auto"
                                onSubmit={handleCreateFacilitatorSubmit}
                                autoComplete="off"
                            >
                                <h3 className="text-lg font-black text-slate-900 text-center mb-2">Create Facilitator</h3>
                                {createFacSuccess && (
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {createFacSuccess}
                                    </div>
                                )}
                                {createFacError && (
                                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {createFacError}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        name="UserName"
                                        placeholder="Username"
                                        value={createFacForm.UserName}
                                        onChange={handleChangeCreateFac}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs bg-slate-50"
                                        autoFocus
                                    />
                                    <input
                                        type="password"
                                        name="Password"
                                        placeholder="Password"
                                        value={createFacForm.Password}
                                        onChange={handleChangeCreateFac}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs bg-slate-50"
                                    />
                                    <input
                                        type="email"
                                        name="EmailD"
                                        placeholder="Email"
                                        value={createFacForm.EmailD}
                                        onChange={handleChangeCreateFac}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs bg-slate-50"
                                    />
                                    <input
                                        type="text"
                                        name="FirstName"
                                        placeholder="First Name"
                                        value={createFacForm.FirstName}
                                        onChange={handleChangeCreateFac}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs bg-slate-50"
                                    />
                                    <input
                                        type="text"
                                        name="LastName"
                                        placeholder="Last Name"
                                        value={createFacForm.LastName}
                                        onChange={handleChangeCreateFac}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 text-xs bg-slate-50"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseCreateFacilitator}
                                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                                        disabled={isCreatingFacilitator}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 disabled:opacity-60"
                                        disabled={isCreatingFacilitator}
                                    >
                                        {isCreatingFacilitator
                                            ? (<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Creating...</>)
                                            : (<><Check className="w-4 h-4" /> Create</>)
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : showManageFacilitator ? (
                        <div className="lg:col-span-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="p-5 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Manage Facilitators</h3>
                                    <p className="mt-1 text-xs text-slate-500">View all facilitator accounts and manage their active status.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBackFromFacilitatorView}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                                >
                                    <span aria-hidden="true">←</span>
                                    Back to organization mapping
                                </button>
                            </div>
                            <div className="p-5 sm:p-7">
                                <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
                                    {(['active', 'inactive'] as const).map(status => {
                                        const count = allFacilitators.filter(
                                            facilitator => (Number(facilitator.ActiveStatus) === 1) === (status === 'active')
                                        ).length
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setManageStatusFilter(status)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${
                                                    manageStatusFilter === status
                                                        ? status === 'active'
                                                            ? 'bg-white text-emerald-700 shadow-sm'
                                                            : 'bg-white text-slate-700 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                {status} ({count})
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="space-y-3">
                                    {allFacilitators
                                        .filter(facilitator =>
                                            (Number(facilitator.ActiveStatus) === 1) === (manageStatusFilter === 'active')
                                        )
                                        .map(facilitator => {
                                            const isActive = Number(facilitator.ActiveStatus) === 1
                                            const mappedOrgs = facilitatorMappings.filter(
                                                mapping => Number(mapping.FacilitatorId) === facilitator.id
                                            )
                                            const isUpdating = updatingFacilitatorId === facilitator.id
                                            return (
                                                <div key={facilitator.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black ${
                                                            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {facilitator.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm text-slate-900 truncate">{facilitator.username}</p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                #{facilitator.id}{facilitator.EmailID ? ` · ${facilitator.EmailID}` : ''}
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                {mappedOrgs.length
                                                                    ? `Mapped organizations: ${mappedOrgs.map(mapping => mapping.OrganizationName).join(', ')}`
                                                                    : 'No organizations mapped'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleUpdateFacilitatorStatus(facilitator, 1)}
                                                            disabled={isActive || isUpdating}
                                                            className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUpdating ? 'Updating…' : 'Set Active'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeactivateFacilitatorModal(facilitator)}
                                                            disabled={!isActive || isUpdating}
                                                            className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUpdating ? 'Updating…' : 'Set Inactive'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    {allFacilitators.filter(facilitator =>
                                        (Number(facilitator.ActiveStatus) === 1) === (manageStatusFilter === 'active')
                                    ).length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                                            No {manageStatusFilter} facilitators found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Facilitator Roster */}
                            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Facilitator Roster</h3>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                                {facilitators.length} Available Facilitators
                                            </span>
                                        </div>
                                    </div>
                                    {selectedFacilitatorFilter !== null && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFacilitatorFilter(null)}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full cursor-pointer"
                                            title="Clear facilitator filter"
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                </div>
                                <div className="p-3.5 border-b border-slate-100 bg-white">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={facSearch}
                                            onChange={(e) => setFacSearch(e.target.value)}
                                            placeholder="Search facilitator..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                                        />
                                    </div>
                                </div>
                                <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[580px] custom-scrollbar">
                                    {filteredFacilitators.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-slate-400 font-medium">
                                            No facilitators match your search.
                                        </div>
                                    ) : (
                                        filteredFacilitators.map((fac) => {
                                            const assignedCount = facilitatorAssignmentCounts[fac.id] || 0
                                            const isSelected = selectedFacilitatorFilter === fac.id
                                            return (
                                                <div
                                                    key={fac.id}
                                                    onClick={() => {
                                                        setSelectedFacilitatorFilter(prev => prev === fac.id ? null : fac.id)
                                                    }}
                                                    className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                        isSelected
                                                            ? 'bg-indigo-50/90 border border-indigo-200 text-indigo-950 shadow-2xs'
                                                            : 'hover:bg-slate-50 border border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-[#0680A6] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                            {fac.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-bold text-xs text-slate-900 block truncate">
                                                                {fac.username}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                ID: #{fac.id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                                assignedCount > 0
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                            title={`${assignedCount} organizations locked to this facilitator`}
                                                        >
                                                            {assignedCount} {assignedCount === 1 ? 'Org' : 'Orgs'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                                <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 font-medium text-center">
                                    Tip: Click any facilitator above to filter their assigned organizations.
                                </div>
                            </div>
                            {/* Right Column: Organization Mapping & Assignment Hub (8 Cols) */}
                            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/60 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-[#0680A6]" />
                                                    Organization Mapping Workspace
                                                </h3>
                                                {/* Create Facilitator button replaced logic */}
                                                <button
                                                    type="button"
                                                    onClick={handleOpenCreateFacilitator}
                                                    className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-700 transition shadow cursor-pointer"
                                                    style={{marginRight: "0.4rem"}}
                                                >
                                                    Create Facilitator
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleManageFacilitator}
                                                    className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-700 transition shadow cursor-pointer"
                                                >
                                                    Manage Facilitator
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                                Showing {filteredOrganizations.length} of {organizations.length} Organizations
                                            </span>
                                        </div>
                                        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                                                    statusFilter === 'all'
                                                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                All ({totalOrgs})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('locked')}
                                                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                                                    statusFilter === 'locked'
                                                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                                        : 'text-emerald-700 hover:text-emerald-900'
                                                }`}
                                            >
                                                Mapped ({totalLockedOrgs})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('unlocked')}
                                                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                                                    statusFilter === 'unlocked'
                                                        ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                                                        : 'text-amber-700 hover:text-amber-900'
                                                }`}
                                            >
                                                Available ({totalAvailableOrgs})
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                                        <div className="relative flex-1 min-w-[200px]">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={orgSearch}
                                                onChange={(e) => setOrgSearch(e.target.value)}
                                                placeholder="Search organization by name, ID or assigned facilitator..."
                                                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0680A6] bg-white shadow-2xs"
                                            />
                                            {orgSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOrgSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {unlockedFilteredOrgs.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleToggleSelectAll}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer whitespace-nowrap self-start md:self-auto"
                                            >
                                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                                                    isAllUnlockedSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                                                }`}>
                                                    {isAllUnlockedSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </span>
                                                <span>{isAllUnlockedSelected ? 'Deselect All' : 'Select All Available'}</span>
                                            </button>
                                        )}
                                    </div>
                                    {selectedOrgs.size > 0 && (
                                        <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-150">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
                                                    {selectedOrgs.size}
                                                </span>
                                                <span className="text-xs font-extrabold text-indigo-950">
                                                    {selectedOrgs.size === 1 ? 'organization selected' : 'organizations selected'} for assignment
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value)
                                                        if (val) handleApplyFacilitatorToAllSelected(val)
                                                    }}
                                                    defaultValue=""
                                                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-2xs cursor-pointer"
                                                >
                                                    <option value="" disabled>Apply Facilitator To All Selected...</option>
                                                    {facilitators.map(fac => (
                                                        <option key={fac.id} value={fac.id}>
                                                            Assign to: {fac.username}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedOrgs(new Set())}
                                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-bold transition cursor-pointer"
                                                >
                                                    Clear Selection
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Orgs Table (kept as original) */}
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse select-text">
                                        <thead>
                                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                <th className="px-4 py-3.5 w-12 text-center">Select</th>
                                                <th className="px-5 py-3.5">Organization Details</th>
                                                <th className="px-5 py-3.5">Mapping Status</th>
                                                <th className="px-5 py-3.5 text-right w-64">Assign Facilitator / Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filteredOrganizations.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                                                        No organizations match the selected criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredOrganizations.map((org) => {
                                                    const lockedMapping = lockedOrgMap[org.OrganizationID]
                                                    const isLocked = isOrgLockedToFacilitator(org.OrganizationID)
                                                    const lockedFacilitatorId = getLockedFacilitatorIdForOrg(org.OrganizationID)
                                                    const lockedFacilitator = facilitators.find(f => f.id === lockedFacilitatorId)
                                                    const isSelected = selectedOrgs.has(org.OrganizationID)
                                                    return (
                                                        <tr
                                                            key={org.OrganizationID}
                                                            className={`transition-colors ${
                                                                isLocked
                                                                    ? 'bg-slate-50/40 hover:bg-slate-50'
                                                                    : isSelected
                                                                    ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                                                                    : 'hover:bg-slate-50/80 bg-white'
                                                            }`}
                                                        >
                                                            <td className="px-4 py-3.5 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleOrgCheckbox(org.OrganizationID)}
                                                                    disabled={isLocked}
                                                                    className={`h-4 w-4 rounded text-indigo-600 focus:ring-indigo-400 cursor-pointer ${
                                                                        isLocked ? 'opacity-30 cursor-not-allowed' : ''
                                                                    }`}
                                                                    title={isLocked ? "Organization is locked to an active facilitator mapping" : "Select organization for assignment"}
                                                                />
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                                        isLocked
                                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                                                            : 'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                        <Building2 className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-bold text-slate-900 block text-xs">
                                                                            {org.OrganizationName}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                                            ID: #{org.OrganizationID}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                {isLocked ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                        <Lock className="w-3 h-3 text-emerald-600" />
                                                                        <span>Assigned & Locked</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                                                        <Unlock className="w-3 h-3 text-amber-600" />
                                                                        <span>Available</span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                {!isLocked ? (
                                                                    <div className="inline-flex items-center gap-2">
                                                                        <select
                                                                            value={orgFacilitator[org.OrganizationID] ?? ''}
                                                                            onChange={(e) => handleFacilitatorChange(org.OrganizationID, Number(e.target.value))}
                                                                            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0680A6] shadow-2xs cursor-pointer min-w-[180px]"
                                                                        >
                                                                            <option value="">Select Facilitator...</option>
                                                                            {facilitators.map((fac) => (
                                                                                <option key={fac.id} value={fac.id}>
                                                                                    {fac.username}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                ) : (
                                                                    <div className="inline-flex items-center gap-2 justify-end">
                                                                        <div className="text-left bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-1">
                                                                            <span className="text-[10px] text-slate-400 block font-bold leading-none">
                                                                                ASSIGNED TO
                                                                            </span>
                                                                            <span className="text-xs font-bold text-emerald-800">
                                                                                {lockedFacilitator ? lockedFacilitator.username : `Facilitator #${lockedMapping?.FacilitatorId}`}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDeleteModal({
                                                                                mappingId: lockedMapping?.Id!,
                                                                                orgName: org.OrganizationName,
                                                                                facilitatorName: lockedFacilitator ? lockedFacilitator.username : `ID #${lockedMapping?.FacilitatorId}`
                                                                            })}
                                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/80 text-xs font-bold transition shadow-2xs cursor-pointer"
                                                                            title="Unmap this facilitator from organization"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                            <span>Unmap</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-slate-500 font-semibold">
                                        {selectedOrgs.size === 0 ? (
                                            <span>Select organizations with the checkboxes above to assign facilitators in bulk.</span>
                                        ) : (
                                            <span className="text-indigo-900 font-bold">
                                                Ready to map <span className="underline decoration-indigo-400">{selectedOrgs.size} organization(s)</span>.
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAssign}
                                        disabled={selectedOrgs.size === 0 || isAssigning}
                                        className="inline-flex items-center justify-center gap-2 h-10 px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAssigning ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Assigning...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>Assign Selected ({selectedOrgs.size})</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 5. Unmap / Delete Confirmation Modal */}
            {deleteModal && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setDeleteModal(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-xs">
                                <Trash2 className="w-7 h-7" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-black text-slate-900 tracking-tight">
                                    Confirm Unmapping
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Are you sure you want to unmap facilitator <span className="font-bold text-slate-800">{deleteModal.facilitatorName}</span> from <span className="font-bold text-slate-800">{deleteModal.orgName}</span>?
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 text-left font-medium">
                                Notice: Unmapping will release the routing lock on this organization, making it available for reassignment.
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteModal(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Unmapping...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Yes, Unmap</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deactivateFacilitatorModal && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => updatingFacilitatorId === null && setDeactivateFacilitatorModal(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-facilitator-title"
                        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="p-6 sm:p-7 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-sm">
                                <Trash2 className="w-7 h-7" />
                            </div>
                            <h3 id="deactivate-facilitator-title" className="mt-4 text-lg font-black text-slate-900">
                                Deactivate facilitator?
                            </h3>
                            <p className="mt-2 text-sm text-slate-600">
                                <span className="font-bold text-slate-900">{deactivateFacilitatorModal.username}</span> will no longer be able to sign in.
                            </p>
                        </div>
                        <div className="mx-6 sm:mx-7 mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 w-5 h-5 shrink-0 text-amber-600" />
                                <div className="min-w-0">
                                    <p className="text-sm font-extrabold text-amber-900">
                                        Organization mappings will be removed
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                                        Mapped organizations will become available for reassignment. This action does not delete candidate records.
                                    </p>
                                    {(() => {
                                        const mappedOrganizations = facilitatorMappings
                                            .filter(mapping => Number(mapping.FacilitatorId) === deactivateFacilitatorModal.id)
                                            .map(mapping => mapping.OrganizationName)
                                        return mappedOrganizations.length > 0 ? (
                                            <ul className="mt-3 space-y-1.5">
                                                {mappedOrganizations.map((organizationName, index) => (
                                                    <li key={`${organizationName}-${index}`} className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">{organizationName}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-3 text-xs font-semibold text-amber-900">No organizations are currently mapped.</p>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 sm:px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeactivateFacilitatorModal(null)}
                                disabled={updatingFacilitatorId !== null}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleUpdateFacilitatorStatus(deactivateFacilitatorModal, 0)}
                                disabled={updatingFacilitatorId !== null}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md disabled:opacity-60"
                            >
                                {updatingFacilitatorId !== null ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Deactivating…
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Deactivate facilitator
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Facilitatororgmap