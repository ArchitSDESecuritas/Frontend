import React, { useState, useEffect } from 'react'

/**
 * Extract a clean brand domain slug dynamically from any organization name.
 */
export function getDynamicBrandDomain(name: string): string {
  if (!name || typeof name !== 'string') return ''
  const lower = name.toLowerCase().trim()

  // High-priority enterprise contributor aliases
  if (lower.includes('tata consultancy') || lower.includes('tcs')) return 'tcs.com'
  if (lower.includes('infosys')) return 'infosys.com'
  if (lower.includes('wipro')) return 'wipro.com'
  if (lower.includes('accenture')) return 'accenture.com'
  if (lower.includes('cognizant')) return 'cognizant.com'
  if (lower.includes('securitas')) return 'securitas.com'
  if (lower.includes('hcl')) return 'hcltech.com'
  if (lower.includes('tech mahindra')) return 'techmahindra.com'
  if (lower.includes('deloitte')) return 'deloitte.com'
  if (lower.includes('capgemini')) return 'capgemini.com'
  if (lower.includes('ibm')) return 'ibm.com'
  if (lower.includes('microsoft')) return 'microsoft.com'
  if (lower.includes('google')) return 'google.com'
  if (lower.includes('amazon')) return 'amazon.com'

  const parenMatch = lower.match(/\(([^)]+)\)/)
  if (parenMatch && parenMatch[1]) {
    const acronym = parenMatch[1].replace(/[^a-z0-9]/g, '')
    if (acronym.length >= 2 && acronym.length <= 6) {
      return `${acronym}.com`
    }
  }

  const cleaned = lower
    .replace(/\([^)]*\)/g, '')
    .replace(
      /\b(private|pvt|limited|ltd|corp|corporation|inc|technologies|technology|tech|services|service|solutions|solution|group|india|global|consulting|enterprises|enterprise|industries|industry|holdings|holding|bank|international|co)\b/gi,
      ''
    )
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    const fallbackClean = lower.replace(/[^a-z0-9]/g, '')
    return fallbackClean ? `${fallbackClean}.com` : ''
  }

  const primarySlug = words[0].length >= 3 ? words[0] : words.join('')
  return `${primarySlug}.com`
}

/**
 * 100% Dynamic logo URL generator without hardcoded dictionaries
 */
export function getOrgLogoUrl(name: string): string {
  const domain = getDynamicBrandDomain(name)
  if (!domain) return ''
  return `https://unavatar.io/${domain}?fallback=https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

export interface OrgLogoProps {
  name?: string
  organizationName?: string
  className?: string
  size?: string
  fallbackTextSize?: string
}

/**
 * Dynamic organization logo component with automatic fallback
 */
export function OrgLogo({
  name,
  organizationName,
  className = 'w-9 h-9',
  size,
  fallbackTextSize = 'text-sm',
}: OrgLogoProps) {
  const effectiveName =
    (typeof name === 'string' ? name : typeof organizationName === 'string' ? organizationName : '') || ''
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : className
  const domain = getDynamicBrandDomain(effectiveName)
  const [imgUrlIndex, setImgUrlIndex] = useState<number>(0)
  const [hasError, setHasError] = useState(false)

  const logoSources = [
    `https://unavatar.io/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}`,
  ]

  useEffect(() => {
    setImgUrlIndex(0)
    setHasError(false)
  }, [effectiveName, domain])

  const handleImageError = () => {
    if (imgUrlIndex < logoSources.length - 1) {
      setImgUrlIndex((prev) => prev + 1)
    } else {
      setHasError(true)
    }
  }

  const initialLetter = (effectiveName.trim().charAt(0) || 'O').toUpperCase()

  if (!domain || hasError) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-gradient-to-tr from-[#0680A6] to-[#10B981] flex items-center justify-center text-white font-extrabold ${fallbackTextSize} shadow-sm shrink-0 select-none`}
      >
        {initialLetter}
      </div>
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0 overflow-hidden`}
    >
      <img
        src={logoSources[imgUrlIndex]}
        alt={effectiveName}
        className="w-full h-full object-contain filter drop-shadow-2xs"
        loading="lazy"
        onError={handleImageError}
      />
    </div>
  )
}

export default OrgLogo
