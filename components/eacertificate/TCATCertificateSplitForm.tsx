'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import { DocumentEditSheet } from '@/components/documents/DocumentEditSheet'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { createProductionSource } from '@/lib/services/production-sources'
import { createEACertificate } from '@/lib/services/eacertificates'
import { createEvent } from '@/lib/services/events'
import { createClientComponentClient } from '@/lib/supabase'
import { listOrganizationsWithRole } from '@/lib/services/organizations'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LocationField from '@/components/ui/location-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import DatePicker from '@/components/ui/date-picker'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import AmountsField from '@/components/eacertificate/AmountsField'
import EmissionsField from '@/components/eacertificate/EmissionsField'
import OrganizationRoleField from '@/components/eacertificate/OrganizationRoleField'
import ChipMultiSelect from '@/components/ui/chip-multi-select'
import OrganizationSelector from '@/components/ui/organization-selector'
import ProductionSourceSelector from '@/components/ui/production-source-selector'
import { getProductionSource } from '@/lib/services/production-sources'
import { toast } from 'sonner'
import type {
  MetadataItem,
  EACType,
  Amount,
  EmissionsData,
  OrganizationRole,
  ProductionSourceDB,
} from '@/lib/types/eacertificate'
import { FileType, EAC_TYPE_NAMES, EventTarget, EACType as EACTypeEnum, OrgRoleTypes } from '@/lib/types/eacertificate'
import { listProductionSources } from '@/lib/services/production-sources'

type UploadedDocument = {
  id: string
  file: File
  fileType: FileType
  fileExtension: 'PDF' | 'CSV'
  title: string
  description: string
  metadata: Array<{ key: string; label: string; value: string }>
  organizations: Array<{ orgId: string; role: string }>
}

// Metadata target options for where to attach metadata
type MetadataTarget = 'productionSource' | 'document' | 'event' | 'certificate'

export default function TCATCertificateSplitForm({ backHref }: { backHref: string }) {
  const router = useRouter()

  // Left side documents (proof of retirement)
  const [docs, setDocs] = useState<UploadedDocument[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const selectedDoc = useMemo(
    () => (selectedDocId ? docs.find(d => d.id === selectedDocId) || null : docs[0] || null),
    [docs, selectedDocId]
  )
  const [showEditModal, setShowEditModal] = useState(false)

  // Verification report document (point O)
  const [verificationReportDoc, setVerificationReportDoc] = useState<UploadedDocument | null>(null)

  // Other relevant information (point P)
  const [labels, setLabels] = useState<string[]>([]) // Array of label values
  // Common label options - can be expanded or loaded from API
  const labelOptions = React.useMemo(() => {
    // Get unique labels from existing labels to show as options
    const existingLabels = labels.map(label => ({
      value: label,
      label: label,
    }))
    // Add some common labels
    const commonLabels = [
      { value: 'Green-E', label: 'Green-E' },
      { value: 'REC', label: 'REC' },
      { value: 'I-REC', label: 'I-REC' },
      { value: 'APX', label: 'APX' },
      { value: 'M-RETS', label: 'M-RETS' },
      { value: 'WREGIS', label: 'WREGIS' },
    ]
    // Combine and deduplicate
    const allLabels = [...commonLabels, ...existingLabels]
    const uniqueLabels = Array.from(new Map(allLabels.map(item => [item.value, item])).values())
    return uniqueLabels
  }, [labels])
  const [rating, setRating] = useState<{
    orgId: string
    orgName?: string
    value: string
    date?: Date
    externalID?: string
  }>({
    orgId: '',
    value: '',
  })
  const [otherMetadata, setOtherMetadata] = useState<
    Array<{ key: string; label: string; value: string; target: MetadataTarget }>
  >([]) // Array of metadata items with target entity
  const [newMetadataTarget, setNewMetadataTarget] = useState<MetadataTarget>('productionSource') // Target for new metadata entry

  // Right side form state
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState('') // A -> ProductionSource.name
  const [projectNameOpen, setProjectNameOpen] = useState(false) // Open state for project name dropdown
  const [selectedProductionSourceForName, setSelectedProductionSourceForName] = useState<ProductionSourceDB | null>(
    null
  ) // Selected production source from name search
  const [isFormDisabled, setIsFormDisabled] = useState(false) // Whether form fields should be disabled
  const projectNameInputRef = useRef<HTMLDivElement>(null)
  const [projectDescription, setProjectDescription] = useState('') // E -> ProductionSource.description
  const [location, setLocation] = useState<any>({ country: '', subdivision: '', region: '', address: '', zipCode: '' }) // H
  const [psExternalId, setPsExternalId] = useState<string>('') // B -> ProductionSource.ExternalID.id
  const [selectedProductionSourceId, setSelectedProductionSourceId] = useState<string>('') // Selected production source from Registry field
  const [registryOrgId, setRegistryOrgId] = useState<string>('') // C -> ProductionSource.organizations with role=Registry
  const [links, setLinks] = useState<string[]>([]) // D -> external link to retirement doc (optional)
  const [productionSources, setProductionSources] = useState<
    Array<{ id: string; name: string | null; technology?: string; location?: any; external_ids?: any[] | null }>
  >([])
  const [isLoadingProductionSources, setIsLoadingProductionSources] = useState(false)
  const [productionSourcesForSearch, setProductionSourcesForSearch] = useState<ProductionSourceDB[]>([]) // All production sources for name search
  const [certType, setCertType] = useState<EACType>('REC' as EACType)
  const [amounts, setAmounts] = useState<Amount[]>([]) // F1 -> Amounts
  const [emissions, setEmissions] = useState<EmissionsData[]>([]) // I -> Emissions Mitigation Data
  const [vintageStart, setVintageStart] = useState<Date | undefined>() // G -> Event(type Production).dates
  const [vintageEnd, setVintageEnd] = useState<Date | undefined>()
  const [commercialOperationYear, setCommercialOperationYear] = useState<string>('') // J -> ProductionSource.Events(type ACTIVATION) - DEPRECATED, use date fields below
  const [commercialOperationDateYear, setCommercialOperationDateYear] = useState<string>('') // Year (YYYY)
  const [commercialOperationDateMonth, setCommercialOperationDateMonth] = useState<string>('') // Month (MM)
  const [commercialOperationDateDay, setCommercialOperationDateDay] = useState<string>('') // Day (DD)
  const [fuelTechnology, setFuelTechnology] = useState<string>('') // Fuel and technology types -> ProductionSource.technology + EACertificate.productionTech
  const [organizations, setOrganizations] = useState<OrganizationRole[]>([
    { orgId: '', role: OrgRoleTypes.SELLER, orgName: '' }, // Default: one organization with SELLER role
  ]) // Entity name -> EACertificate.events(type ISSUANCE or REDEMPTION).organizations
  const [verificationBodyOrgId, setVerificationBodyOrgId] = useState<string>('') // Verification body -> EACertificate.events(type MRVERIFICATION).organizations
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)

  // Load organizations for verification body selector
  React.useEffect(() => {
    const load = async () => {
      setIsLoadingOrgs(true)
      try {
        const orgs = await listOrganizationsWithRole()
        const transformed = (orgs || []).map((item: any) => ({
          id: item.organizations.id,
          name: item.organizations.name,
        }))
        setAvailableOrgs(transformed)
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setIsLoadingOrgs(false)
      }
    }
    load()
  }, [])

  // Load production sources for registry selector and name search
  React.useEffect(() => {
    const load = async () => {
      setIsLoadingProductionSources(true)
      try {
        const sources = await listProductionSources()
        const transformedSources = sources.map((source: any) => ({
          id: source.id,
          name: source.name,
          technology: source.technology,
          location: source.location,
          external_ids: source.external_ids || null,
        }))
        setProductionSources(transformedSources)

        // Also load full production sources for name search
        const supabase = createClientComponentClient()
        const { data: fullSources, error } = await supabase
          .from('production_sources')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && fullSources) {
          setProductionSourcesForSearch(fullSources as ProductionSourceDB[])
        }
      } catch (error) {
        console.error('Failed to load production sources:', error)
      } finally {
        setIsLoadingProductionSources(false)
      }
    }
    load()
  }, [])

  // When a production source is selected, extract the registry organization from it
  React.useEffect(() => {
    const extractRegistryOrg = async () => {
      if (selectedProductionSourceId) {
        try {
          const ps = await getProductionSource(selectedProductionSourceId)
          // Find the registry organization in the production source's organizations
          const registryOrg = ps.organizations?.find((org: any) => org.role === OrgRoleTypes.REGISTRY)
          if (registryOrg) {
            setRegistryOrgId(registryOrg.orgId)
          } else {
            setRegistryOrgId('')
          }
        } catch (error) {
          console.error('Failed to load production source:', error)
          setRegistryOrgId('')
        }
      } else {
        setRegistryOrgId('')
      }
    }
    extractRegistryOrg()
  }, [selectedProductionSourceId])

  // Filter production sources by name for search
  const filteredProductionSourcesForName = useMemo(() => {
    if (!projectName.trim()) return []
    const searchLower = projectName.toLowerCase()
    return productionSourcesForSearch.filter(ps => ps.name?.toLowerCase().includes(searchLower))
  }, [projectName, productionSourcesForSearch])

  // When a production source is selected from name search, prefill all fields
  const handleProductionSourceSelected = (ps: ProductionSourceDB) => {
    setSelectedProductionSourceForName(ps)
    setProjectName(ps.name || '')
    setProjectDescription(ps.description || '')
    setLocation(ps.location || { country: '', subdivision: '', region: '', address: '', zipCode: '' })
    setPsExternalId(ps.external_ids && ps.external_ids.length > 0 ? ps.external_ids[0].id : '')
    setFuelTechnology(Array.isArray(ps.technology) ? ps.technology.join(', ') : ps.technology || '')
    setLinks(ps.links || [])
    // Extract registry organization
    const registryOrg = ps.organizations?.find((org: any) => org.role === 'Registry')
    if (registryOrg) {
      setRegistryOrgId(registryOrg.orgId)
      // Also set the selected production source for registry field
      setSelectedProductionSourceId(ps.id)
    } else {
      setRegistryOrgId('')
      setSelectedProductionSourceId('')
    }
    setIsFormDisabled(true)
    setProjectNameOpen(false)
  }

  // When user types in project name after selection, reset to create-new mode
  const handleProjectNameChange = (value: string) => {
    setProjectName(value)
    if (selectedProductionSourceForName) {
      // Reset all fields to initial state
      setSelectedProductionSourceForName(null)
      setIsFormDisabled(false)
      setProjectDescription('')
      setLocation({ country: '', subdivision: '', region: '', address: '', zipCode: '' })
      setPsExternalId('')
      setFuelTechnology('')
      setLinks([])
      setRegistryOrgId('')
      setSelectedProductionSourceId('')
    }
    // Show dropdown if there's text and matches exist
    if (value.trim()) {
      setProjectNameOpen(true)
    } else {
      setProjectNameOpen(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectNameInputRef.current && !projectNameInputRef.current.contains(event.target as Node)) {
        setProjectNameOpen(false)
      }
    }

    if (projectNameOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [projectNameOpen])

  // Note: Verification body is intentionally decoupled from organizations (Entity name)
  // to avoid unintended coupling between the two inputs.

  // Default unit per EAC type
  const defaultUnitByType: Record<string, string> = {
    REC: 'MWh',
    RTC: 'MMBtu',
    RNG: 'MMBtu',
    SAF: 'gallons',
    CC: 'tCO2e',
    CR: 'tCO2e',
  }

  // Default emissions units per EAC type
  const defaultCIUnitByType: Record<string, string> = {
    REC: 'tCO2e/MWh',
    RTC: 'gCO2e/MMBtu',
    RNG: 'gCO2e/MMBtu',
    SAF: 'gCO2e/MJ',
    CC: 'tCO2e/tCO2e',
    CR: 'tCO2e/tCO2e',
  }

  // Emissions explainers per EAC type
  const emissionsExplainerByType: Record<string, string> = {
    REC: 'Generator emission rate (tonnes CO2e/MWh) and the amount of MWh this emissions rate is associated with',
    RTC: 'Carbon intensity (CI) score and type (full lifecycle CI, partial lifecycle CI, injection point CI), if applicable and provided for the amount of BTUs this CI score is associated with',
    SAF: 'GHG emissions reduction (mt of CO2e) or GHG core LCA value (gCO2e/MJ) and the corresponding volume (liters or gallons) this LCA value is associated with',
    RNG: 'Carbon intensity (CI) score and type (full lifecycle CI, partial lifecycle CI, injection point CI), if applicable and provided for the amount of BTUs this CI score is associated with',
  }

  const ensureDefaultAmountUnit = (type: EACType) => {
    if (amounts.length === 0) {
      setAmounts([{ amount: 1, unit: defaultUnitByType[type] || 'MWh', isPrimary: true } as Amount])
    }
  }

  // Auto-calculate emissionsFactor when carbonIntensity and amounts are provided
  const handleEmissionsChange = (newEmissions: EmissionsData[]) => {
    const defaultCIUnit = defaultCIUnitByType[certType] || 'tCO2e/MWh'

    // Auto-calculate emissionsFactor and set default units for each emission entry
    const updated = newEmissions.map((emission, idx) => {
      let updatedEmission = { ...emission }

      // Set default units if not already set
      if (!updatedEmission.ciUnit) {
        updatedEmission.ciUnit = defaultCIUnit
      }
      if (!updatedEmission.efUnit) {
        updatedEmission.efUnit = defaultCIUnit
      }

      // Auto-calculate emissionsFactor if carbonIntensity and amounts are provided
      if (updatedEmission.carbonIntensity > 0 && amounts.length > 0 && amounts[0]?.amount > 0) {
        updatedEmission.emissionsFactor = updatedEmission.carbonIntensity / amounts[0].amount
      }

      return updatedEmission
    })
    setEmissions(updated)
  }

  // Update emissions factor when amounts change
  React.useEffect(() => {
    if (emissions.length > 0 && amounts.length > 0 && amounts[0]?.amount > 0) {
      const updated = emissions.map(emission => {
        if (emission.carbonIntensity > 0) {
          return {
            ...emission,
            emissionsFactor: emission.carbonIntensity / amounts[0].amount,
          }
        }
        return emission
      })
      setEmissions(updated)
    }
  }, [amounts])

  // Set default CI unit when cert type changes (only if units are not already set)
  React.useEffect(() => {
    if (emissions.length > 0 && certType) {
      const defaultCIUnit = defaultCIUnitByType[certType]
      if (defaultCIUnit) {
        const updated = emissions.map(emission => ({
          ...emission,
          ciUnit: emission.ciUnit || defaultCIUnit,
          efUnit: emission.efUnit || defaultCIUnit,
        }))
        setEmissions(updated)
      }
    }
  }, [certType])

  const handleFilesUploaded = (files: File[]) => {
    const newDocuments: UploadedDocument[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      fileType: FileType.CERTIFICATE,
      fileExtension: file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF',
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      metadata: [],
      organizations: [],
    }))
    setDocs(prev => [...prev, ...newDocuments])
  }

  const handleDocumentUpdate = (
    documentId: string,
    updates: Partial<UploadedDocument & { metadata: MetadataItem[] }>
  ) => {
    setDocs(prev =>
      prev.map(d => {
        if (d.id !== documentId) return d
        const next = { ...d }
        if (updates.title !== undefined) next.title = updates.title
        if (updates.description !== undefined) next.description = updates.description
        if ((updates as any).fileType !== undefined) next.fileType = (updates as any).fileType
        if ((updates as any).fileExtension !== undefined) next.fileExtension = (updates as any).fileExtension as any
        if ((updates as any).organizations !== undefined) next.organizations = (updates as any).organizations as any
        if ((updates as any).metadata) {
          next.metadata = (updates as any).metadata.map((m: any) => ({
            key: m.key,
            label: m.label,
            value: m.value || '',
          }))
        }
        return next
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return toast.error('Project name is required')
    // Registry and Project / unit ID are optional
    if (!vintageStart) return toast.error('Vintage start date is required')
    if (amounts.length === 0) return toast.error('Quantity is required')
    // Rating: warn if only one of the two required fields is filled
    const hasRatingAgency = !!rating.orgId
    const hasRatingValue = !!rating.value?.trim()
    if (hasRatingAgency && !hasRatingValue) {
      return toast.error('Rating value is required when a rating agency is selected')
    }
    if (hasRatingValue && !hasRatingAgency) {
      return toast.error('Rating agency is required when a rating value is provided')
    }

    setSaving(true)
    try {
      // 1) Use existing Production Source if selected, otherwise create new one
      let ps
      if (selectedProductionSourceForName) {
        // Use existing production source
        ps = selectedProductionSourceForName
      } else {
        // Create new Production Source
        // Convert comma-separated technology to array
        const technologyArray = fuelTechnology.trim()
          ? fuelTechnology
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : ['TCAT']
        ps = await createProductionSource({
          name: projectName,
          description: projectDescription || undefined,
          location,
          technology: technologyArray,
          links: links.length ? links : undefined,
          documents: [],
          externalIDs: psExternalId.trim() ? [{ id: psExternalId.trim() }] : undefined,
          organizations: registryOrgId
            ? [
                {
                  orgId: registryOrgId,
                  role: OrgRoleTypes.REGISTRY,
                  orgName: availableOrgs.find(o => o.id === registryOrgId)?.name || '',
                },
              ]
            : undefined,
        })
      }

      // 2) Upload proof documents (if any) and attach to certificate later
      const uploadedDocIds: string[] = []
      if (docs.length > 0) {
        const supabase = createClientComponentClient()
        for (const doc of docs) {
          const uploadedDoc = await uploadAndCreateDocument({
            file: doc.file,
            fileName: doc.file.name,
            fileType: doc.fileType,
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            organizations: [{ orgId: ps.id, role: OrgRoleTypes.OTHER, orgName: projectName, roleCustom: 'Owner' }],
          })
          uploadedDocIds.push(uploadedDoc.id)
        }
        if (uploadedDocIds.length > 0) {
          await supabase.from('production_sources').update({ documents: uploadedDocIds }).eq('id', ps.id)
        }
      }

      // 3) Create Certificate
      const cert = await createEACertificate({
        type: certType,
        amounts,
        emissions: emissions.length > 0 ? emissions : undefined,
        productionSourceId: ps.id,
        productionTech: fuelTechnology.trim() || undefined, // Same technology value
        links: links.length ? links : undefined,
        documents: [],
      })

      // Attach uploaded docs to certificate
      if (uploadedDocIds.length > 0) {
        const supabase = createClientComponentClient()
        await supabase.from('eacertificates').update({ documents: uploadedDocIds }).eq('id', cert.id)
      }

      // 4) Create Production Event for Vintage
      await createEvent({
        target: EventTarget.EAC,
        targetId: cert.id,
        type: 'Production',
        dates: {
          start: vintageStart,
          ...(vintageEnd ? { end: vintageEnd } : {}),
        },
        location,
      })

      // 5) Create ACTIVATION Event for Production Source (Commercial Operation Date)
      // Support both new date fields (year, month, day) and legacy year field for backward compatibility
      const yearStr = commercialOperationDateYear.trim() || commercialOperationYear.trim()
      const monthStr = commercialOperationDateMonth.trim()
      const dayStr = commercialOperationDateDay.trim()

      let activationYear = 'N/A'
      let activationDate = new Date(2000, 0, 1) // Placeholder date when N/A

      if (yearStr) {
        const yearNum = parseInt(yearStr, 10)
        const isValidYear = yearNum >= 1900 && yearNum <= new Date().getFullYear() + 10

        if (isValidYear) {
          activationYear = yearStr
          // If month is provided, use it (0-indexed in Date constructor), otherwise default to 0 (January)
          const month = monthStr ? parseInt(monthStr, 10) - 1 : 0
          // If day is provided, use it, otherwise default to 1
          const day = dayStr ? parseInt(dayStr, 10) : 1
          activationDate = new Date(yearNum, month, day)
        }
      }

      await createEvent({
        target: EventTarget.PSOURCE,
        targetId: ps.id,
        type: 'ACTIVATION',
        value: activationYear, // Using value field for activation year
        dates: {
          start: activationDate,
        },
      })

      // 6) Create ISSUANCE Event for Certificate with Organizations (Entity name)
      // Filter out organizations without orgId (incomplete entries)
      const validOrganizations = organizations.filter(org => org.orgId && org.orgId.trim() !== '')
      let issuanceEventId: string | null = null
      if (validOrganizations.length > 0) {
        const issuanceEvent = await createEvent({
          target: EventTarget.EAC,
          targetId: cert.id,
          type: 'ISSUANCE', // Use ISSUANCE by default (not a specific redemption)
          organizations: validOrganizations,
          dates: {
            start: new Date(), // Use current date for issuance
          },
        })
        issuanceEventId = issuanceEvent.id
      }

      // 7) Create MRVERIFICATION Event for Certificate with Verification Body (behind the scenes)
      let verificationEventId: string | null = null
      if (verificationBodyOrgId) {
        const verificationOrg = availableOrgs.find(org => org.id === verificationBodyOrgId)
        if (verificationOrg) {
          // Upload verification report document if provided
          let verificationDocIds: string[] = []
          if (verificationReportDoc) {
            const uploadedDoc = await uploadAndCreateDocument({
              file: verificationReportDoc.file,
              fileName: verificationReportDoc.file.name,
              fileType: FileType.AUDIT, // Using AUDIT as closest match, or we could add VERIFICATION type
              title: verificationReportDoc.title,
              description: verificationReportDoc.description,
              metadata: verificationReportDoc.metadata,
              organizations: [
                { orgId: verificationBodyOrgId, role: OrgRoleTypes.MRV_VERIFIER, orgName: verificationOrg.name },
              ],
            })
            verificationDocIds.push(uploadedDoc.id)
          }

          const verificationEvent = await createEvent({
            target: EventTarget.EAC,
            targetId: cert.id,
            type: 'MRVERIFICATION',
            organizations: [
              { orgId: verificationBodyOrgId, role: OrgRoleTypes.MRV_VERIFIER, orgName: verificationOrg.name },
            ],
            documents:
              verificationDocIds.length > 0
                ? verificationDocIds.map(id => ({
                    id,
                    url: '',
                    fileType: FileType.AUDIT,
                    title: verificationReportDoc!.title,
                    description: verificationReportDoc!.description,
                    metadata: verificationReportDoc!.metadata,
                    organizations: [
                      { orgId: verificationBodyOrgId, role: OrgRoleTypes.MRV_VERIFIER, orgName: verificationOrg.name },
                    ],
                  }))
                : undefined,
            dates: {
              start: new Date(), // Use current date for verification
            },
          })
          verificationEventId = verificationEvent.id
        }
      }

      // 8) Create MRVLABELING Events for Labels
      if (labels.length > 0) {
        await Promise.all(
          labels.map(labelValue =>
            createEvent({
              target: EventTarget.EAC,
              targetId: cert.id,
              type: 'MRVLABELING',
              value: labelValue, // Using value field for label value
              dates: {
                start: new Date(),
              },
            })
          )
        )
      }

      // 9) Create MRVRATING Event for Rating (only one per certificate)
      if (rating.orgId && rating.value) {
        await createEvent({
          target: EventTarget.EAC,
          targetId: cert.id,
          type: 'MRVRATING',
          organizations: [
            { orgId: rating.orgId, role: OrgRoleTypes.MRV_RATING_AGENCY, orgName: rating.orgName || '' },
            ...(rating.externalID
              ? [{ orgId: rating.externalID, role: OrgRoleTypes.OTHER, orgName: '', roleCustom: 'External ID' }]
              : []),
          ],
          notes: rating.value, // Using notes field for rating value
          dates: {
            start: rating.date || new Date(),
          },
        })
      }

      // 10) Add other metadata to appropriate entities based on target
      if (otherMetadata.length > 0) {
        const supabase = createClientComponentClient()

        // Group metadata by target entity
        const metadataByTarget = otherMetadata.reduce(
          (acc, item) => {
            if (!acc[item.target]) {
              acc[item.target] = []
            }
            acc[item.target].push({
              key: item.key,
              label: item.label,
              value: item.value,
            })
            return acc
          },
          {} as Record<MetadataTarget, Array<{ key: string; label: string; value: string }>>
        )

        // Helper to merge metadata arrays
        const mergeMetadata = (
          existing: MetadataItem[] | null,
          newItems: Array<{ key: string; label: string; value: string }>
        ): MetadataItem[] => {
          return [...(existing || []), ...newItems]
        }

        // Save metadata to ProductionSource
        if (metadataByTarget.productionSource?.length > 0) {
          const { data: psData } = await supabase.from('production_sources').select('metadata').eq('id', ps.id).single()
          const updatedMetadata = mergeMetadata(psData?.metadata, metadataByTarget.productionSource)
          await supabase.from('production_sources').update({ metadata: updatedMetadata }).eq('id', ps.id)
        }

        // Save metadata to Document (first uploaded document)
        if (metadataByTarget.document?.length > 0) {
          const { data: certData } = await supabase
            .from('eacertificates')
            .select('documents')
            .eq('id', cert.id)
            .single()
          const docIdsToUpdate = uploadedDocIds.length > 0 ? uploadedDocIds : certData?.documents || []

          if (docIdsToUpdate.length > 0) {
            const { data: docData } = await supabase
              .from('documents')
              .select('metadata')
              .eq('doc_id', docIdsToUpdate[0])
              .single()
            const updatedMetadata = mergeMetadata(docData?.metadata, metadataByTarget.document)
            await supabase.from('documents').update({ metadata: updatedMetadata }).eq('doc_id', docIdsToUpdate[0])
          } else {
            console.warn('No documents available to attach document metadata to')
          }
        }

        // Save metadata to Event (ISSUANCE event)
        if (metadataByTarget.event?.length > 0) {
          if (issuanceEventId) {
            const { data: eventData } = await supabase
              .from('events')
              .select('metadata')
              .eq('id', issuanceEventId)
              .single()
            const updatedMetadata = mergeMetadata(eventData?.metadata, metadataByTarget.event)
            await supabase.from('events').update({ metadata: updatedMetadata }).eq('id', issuanceEventId)
          } else {
            // Create an ISSUANCE event if one doesn't exist, to hold the metadata
            const newEvent = await createEvent({
              target: EventTarget.EAC,
              targetId: cert.id,
              type: 'ISSUANCE',
              dates: { start: new Date() },
              metadata: metadataByTarget.event,
            })
            console.log('Created new ISSUANCE event for metadata:', newEvent.id)
          }
        }

        // Save metadata to Certificate (use sparingly per PEACH guidelines)
        if (metadataByTarget.certificate?.length > 0) {
          const { data: certMetaData } = await supabase
            .from('eacertificates')
            .select('metadata')
            .eq('id', cert.id)
            .single()
          const updatedMetadata = mergeMetadata(certMetaData?.metadata, metadataByTarget.certificate)
          await supabase.from('eacertificates').update({ metadata: updatedMetadata }).eq('id', cert.id)
        }
      }

      toast.success('TCAT Certificate created')
      router.push('/eacertificates')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create TCAT Certificate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="bg-white shadow rounded-lg">
          <div className="flex items-center gap-2 p-6 border-b">
            <BackButton />
            <h1 className="text-2xl font-semibold">Create TCAT Certificate</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-200px)]">
            {/* Left: Proof of retirement documents */}
            <div className="border-r border-gray-200 p-6">
              {docs.length === 0 ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Proof of Retirement</h2>
                  <Dropzone onFilesAccepted={handleFilesUploaded} maxFiles={10} className="h-64" />
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Uploaded Documents</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = '.pdf,.csv'
                          input.multiple = true
                          input.onchange = e => {
                            const files = Array.from((e.target as HTMLInputElement).files || [])
                            if (files.length > 0) handleFilesUploaded(files)
                          }
                          input.click()
                        }}
                        className="text-xs"
                      >
                        + Add More Files
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {docs.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          file={doc.file}
                          fileType={doc.fileType}
                          fileExtension={doc.fileExtension}
                          title={doc.title}
                          description={doc.description}
                          isSelected={selectedDocId === doc.id}
                          onSelect={() => setSelectedDocId(doc.id)}
                          onRemove={() => setDocs(prev => prev.filter(d => d.id !== doc.id))}
                          onEdit={() => setShowEditModal(true)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 mt-4">
                    <div className="sticky top-4">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
                      <FileViewer
                        file={selectedDoc?.file}
                        fileType={selectedDoc?.fileType}
                        fileExtension={selectedDoc?.fileExtension}
                        title={selectedDoc?.title}
                        className="h-[calc(100vh-100px)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: TCAT form */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Certificate Type (for default unit) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Type</label>
                  <Select
                    value={certType as any}
                    onValueChange={v => {
                      setCertType(v as EACType)
                      ensureDefaultAmountUnit(v as EACType)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EAC_TYPE_NAMES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* A. Project name - Searchable autocomplete */}
                <FormFieldWrapper label="Project name" required>
                  <div className="relative" ref={projectNameInputRef}>
                    <Input
                      value={projectName}
                      onChange={e => handleProjectNameChange(e.target.value)}
                      onFocus={() => {
                        if (projectName.trim() && filteredProductionSourcesForName.length > 0) {
                          setProjectNameOpen(true)
                        }
                      }}
                      placeholder="Project name"
                      required
                    />
                    {projectNameOpen && filteredProductionSourcesForName.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
                        <Command shouldFilter={false}>
                          <CommandList className="max-h-[300px] overflow-y-auto">
                            <CommandEmpty>No production source found. Type to create a new one.</CommandEmpty>
                            <CommandGroup>
                              {filteredProductionSourcesForName.map(ps => {
                                const isSelected = selectedProductionSourceForName?.id === ps.id
                                return (
                                  <CommandItem
                                    key={ps.id}
                                    value={ps.name || ''}
                                    onSelect={() => handleProductionSourceSelected(ps)}
                                  >
                                    {ps.name || `Source ${ps.id.slice(0, 8)}...`}
                                    <Check
                                      className={cn('ml-auto h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                                    />
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </FormFieldWrapper>

                {/* B. Project / unit ID */}
                <FormFieldWrapper label="Project / unit ID">
                  <Input
                    value={psExternalId}
                    onChange={e => setPsExternalId(e.target.value)}
                    placeholder="e.g., UNIT-12345"
                    disabled={isFormDisabled}
                  />
                </FormFieldWrapper>

                {/* Project or facility fuel and technology types */}
                <FormFieldWrapper label="Project or facility fuel and technology types">
                  <Input
                    value={fuelTechnology}
                    onChange={e => setFuelTechnology(e.target.value)}
                    placeholder="e.g. Solar, Wind, Hydro, Biomass, Natural Gas, etc."
                    disabled={isFormDisabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for both Production Source technology and Certificate production technology
                  </p>
                </FormFieldWrapper>

                {/* C. Registry (Organization selector) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registry</label>
                  <OrganizationSelector
                    value={registryOrgId}
                    onChange={orgId => setRegistryOrgId(orgId)}
                    placeholder="Select registry organization"
                    organizations={availableOrgs.map(org => ({
                      id: org.id,
                      name: org.name,
                    }))}
                    onOrganizationsChange={orgs => {
                      setAvailableOrgs(
                        orgs.map(org => ({
                          id: org.id,
                          name: org.name || '',
                        }))
                      )
                    }}
                    isLoading={isLoadingOrgs}
                    sharedDocuments={docs}
                    selectedDocumentId={selectedDocId}
                    createButtonText="Can't find it? Create a new organization"
                    disabled={isFormDisabled}
                  />
                </div>

                {/* J. Project or facility commercial operation date */}
                <FormFieldWrapper label="Project or facility commercial operation date">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 10}
                        placeholder="YYYY"
                        value={commercialOperationDateYear}
                        onChange={e => {
                          const year = e.target.value
                          // Only allow valid year format (4 digits)
                          if (year === '' || /^\d{0,4}$/.test(year)) {
                            setCommercialOperationDateYear(year)
                          }
                        }}
                        disabled={isFormDisabled}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="MM"
                        value={commercialOperationDateMonth}
                        onChange={e => {
                          const month = e.target.value
                          // Only allow valid month format (1-12)
                          if (month === '' || /^([1-9]|1[0-2])?$/.test(month)) {
                            setCommercialOperationDateMonth(month)
                          }
                        }}
                        disabled={isFormDisabled}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="DD"
                        value={commercialOperationDateDay}
                        onChange={e => {
                          const day = e.target.value
                          // Only allow valid day format (1-31)
                          if (day === '' || /^([1-9]|[12][0-9]|3[01])?$/.test(day)) {
                            setCommercialOperationDateDay(day)
                          }
                        }}
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use "N/A" if not available. All fields are optional.
                  </p>
                </FormFieldWrapper>

                {/* E. Project / facility description */}
                <FormFieldWrapper label="Project / facility description">
                  <Textarea
                    value={projectDescription}
                    onChange={e => setProjectDescription(e.target.value)}
                    rows={3}
                    placeholder="Short description"
                    disabled={isFormDisabled}
                  />
                </FormFieldWrapper>

                {/* H. Location */}
                <FormFieldWrapper>
                  <LocationField value={location} onChange={setLocation} disabled={isFormDisabled} />
                </FormFieldWrapper>

                {/* D. Proof of retirement (links) REMOVED */}
                {/* <LinksField
                  value={links}
                  onChange={setLinks}
                  label="Proof of retirement links"
                  description="Add links to retirement proof. To upload files, use the uploader on the left — they will be treated as proof of retirement."
                /> */}

                {/* F1. Quantity */}
                <div>
                  <AmountsField
                    value={amounts}
                    onChange={setAmounts}
                    label="Quantity"
                    description="Primary quantity for this certificate"
                    disabled={isFormDisabled}
                  />
                </div>

                {/* G. Vintage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormFieldWrapper label="Vintage start" required>
                    <DatePicker
                      value={vintageStart}
                      onChange={setVintageStart}
                      placeholder="Select start date"
                      disabled={isFormDisabled}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper label="Vintage end (optional)">
                    <DatePicker
                      value={vintageEnd}
                      onChange={setVintageEnd}
                      placeholder="Select end date"
                      disabled={isFormDisabled}
                    />
                  </FormFieldWrapper>
                </div>

                {/* I. Emissions Mitigation Data - Hide for Carbon Credits */}
                {certType !== EACTypeEnum.CC && (
                  <EmissionsField
                    value={emissions}
                    onChange={handleEmissionsChange}
                    label="Emissions Mitigation Data"
                    description={emissionsExplainerByType[certType]}
                    disabled={isFormDisabled}
                  />
                )}

                {/* Entity name - Organizations */}
                <div>
                  <OrganizationRoleField
                    value={organizations}
                    onChange={setOrganizations}
                    label="Organizations"
                    description="Information about the EAC seller and other organizations associated with this certificate. Organizations will be stored in an ISSUANCE event."
                    sharedDocuments={docs}
                    selectedDocumentId={selectedDocId}
                    addLabel="Add organization"
                  />
                </div>

                {/* Verification body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification body</label>
                  <OrganizationSelector
                    value={verificationBodyOrgId}
                    onChange={orgId => setVerificationBodyOrgId(orgId)}
                    placeholder="Select verification body"
                    organizations={availableOrgs.map(org => ({ id: org.id, name: org.name }))}
                    onOrganizationsChange={orgs => {
                      setAvailableOrgs(orgs.map(org => ({ id: org.id, name: org.name || '' })))
                    }}
                    isLoading={isLoadingOrgs}
                    sharedDocuments={docs}
                    selectedDocumentId={selectedDocId}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The selected organization will be automatically added to the Entity name list with "Verifier" role.
                    An MRVERIFICATION event will be created behind the scenes.
                  </p>
                </div>

                {/* O. Verification report */}
                {verificationBodyOrgId && (
                  <div>
                    <FormFieldWrapper label="Verification report">
                      {verificationReportDoc ? (
                        <div className="space-y-2">
                          <DocumentCard
                            file={verificationReportDoc.file}
                            fileType={verificationReportDoc.fileType}
                            fileExtension={verificationReportDoc.fileExtension}
                            title={verificationReportDoc.title}
                            description={verificationReportDoc.description}
                            isSelected={true}
                            onSelect={() => {}}
                            onRemove={() => setVerificationReportDoc(null)}
                            onEdit={() => {
                              // Could open edit modal for verification report
                            }}
                          />
                        </div>
                      ) : (
                        <Dropzone
                          onFilesAccepted={files => {
                            if (files.length > 0) {
                              const file = files[0]
                              setVerificationReportDoc({
                                id: crypto.randomUUID(),
                                file,
                                fileType: FileType.AUDIT,
                                fileExtension: file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF',
                                title: file.name.replace(/\.[^/.]+$/, ''),
                                description: '',
                                metadata: [],
                                organizations: [],
                              })
                            }
                          }}
                          maxFiles={1}
                          className="h-32"
                        />
                      )}
                    </FormFieldWrapper>
                  </div>
                )}

                {/* P. Other relevant information */}
                <div className="space-y-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700">Other relevant information</label>

                  {/* Labels - Always visible */}
                  <div className="p-4 border rounded">
                    <ChipMultiSelect
                      value={labels}
                      onChange={setLabels}
                      options={labelOptions}
                      label="Labels"
                      description="Select or create labels for this certificate"
                      placeholder="Type to search or create a label..."
                      allowCreate={true}
                      onCreateNew={value => value}
                      emptyMessage="No labels found. Type to create a new one."
                    />
                  </div>

                  {/* Rating - Always visible */}
                  <div className="p-4 border rounded space-y-3">
                    <div className="text-sm font-medium">Rating</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormFieldWrapper label="Rating agency">
                        <OrganizationSelector
                          value={rating.orgId}
                          onChange={(orgId, orgName) => {
                            setRating(prev => ({ ...prev, orgId, orgName }))
                          }}
                          placeholder="Select organization"
                          organizations={availableOrgs.map(org => ({ id: org.id, name: org.name }))}
                          onOrganizationsChange={orgs => {
                            setAvailableOrgs(orgs.map(org => ({ id: org.id, name: org.name || '' })))
                          }}
                          isLoading={isLoadingOrgs}
                          sharedDocuments={docs}
                          selectedDocumentId={selectedDocId}
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Rating value">
                        <Input
                          value={rating.value}
                          onChange={e => setRating(prev => ({ ...prev, value: e.target.value }))}
                          placeholder="e.g., A+, AAA"
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="Rating date">
                        <DatePicker
                          value={rating.date}
                          onChange={date => setRating(prev => ({ ...prev, date }))}
                          placeholder="Select date"
                        />
                      </FormFieldWrapper>
                      <FormFieldWrapper label="External ID (optional)">
                        <Input
                          value={rating.externalID || ''}
                          onChange={e => setRating(prev => ({ ...prev, externalID: e.target.value }))}
                          placeholder="Organization external ID"
                        />
                      </FormFieldWrapper>
                    </div>
                  </div>

                  {/* Other Metadata - Always visible */}
                  <div className="p-4 border rounded space-y-2">
                    <div className="text-sm font-medium mb-2">Other Metadata</div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Add custom metadata and select which entity it applies to. Per PEACH guidelines, prefer Production
                      Source, Document, or Event over Certificate.
                    </p>
                    {otherMetadata.length > 0 && (
                      <div className="space-y-2">
                        {otherMetadata.map((item, idx) => (
                          <div key={idx} className="p-2 border rounded space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setOtherMetadata(otherMetadata.filter((_, i) => i !== idx))}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <Select
                                value={item.target}
                                onValueChange={(value: MetadataTarget) => {
                                  const updated = [...otherMetadata]
                                  updated[idx] = { ...updated[idx], target: value }
                                  setOtherMetadata(updated)
                                }}
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Target" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="productionSource">Production Source</SelectItem>
                                  <SelectItem value="document">Document</SelectItem>
                                  <SelectItem value="event">Event (Issuance)</SelectItem>
                                  <SelectItem value="certificate">Certificate</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={item.label}
                                onChange={e => {
                                  const updated = [...otherMetadata]
                                  updated[idx] = { ...updated[idx], label: e.target.value, key: e.target.value }
                                  setOtherMetadata(updated)
                                }}
                                placeholder="Field name"
                              />
                              <Input
                                value={item.value}
                                onChange={e => {
                                  const updated = [...otherMetadata]
                                  updated[idx] = { ...updated[idx], value: e.target.value }
                                  setOtherMetadata(updated)
                                }}
                                placeholder="Value"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={newMetadataTarget}
                          onValueChange={(value: MetadataTarget) => setNewMetadataTarget(value)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="productionSource">Production Source</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="event">Event (Issuance)</SelectItem>
                            <SelectItem value="certificate">Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Field name"
                          id="other-label"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const labelInput = document.getElementById('other-label') as HTMLInputElement
                              const valueInput = document.getElementById('other-value') as HTMLInputElement
                              if (labelInput?.value.trim() && valueInput?.value.trim()) {
                                setOtherMetadata([
                                  ...otherMetadata,
                                  {
                                    key: labelInput.value.trim(),
                                    label: labelInput.value.trim(),
                                    value: valueInput.value.trim(),
                                    target: newMetadataTarget,
                                  },
                                ])
                                labelInput.value = ''
                                valueInput.value = ''
                                labelInput.focus()
                              }
                            }
                          }}
                        />
                        <Input
                          placeholder="Value"
                          id="other-value"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const labelInput = document.getElementById('other-label') as HTMLInputElement
                              const valueInput = document.getElementById('other-value') as HTMLInputElement
                              if (labelInput?.value.trim() && valueInput?.value.trim()) {
                                setOtherMetadata([
                                  ...otherMetadata,
                                  {
                                    key: labelInput.value.trim(),
                                    label: labelInput.value.trim(),
                                    value: valueInput.value.trim(),
                                    target: newMetadataTarget,
                                  },
                                ])
                                labelInput.value = ''
                                valueInput.value = ''
                                labelInput.focus()
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => router.push(backHref)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create TCAT Certificate'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {selectedDoc && (
        <DocumentEditSheet
          document={selectedDoc as any}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleDocumentUpdate as any}
        />
      )}
    </div>
  )
}
