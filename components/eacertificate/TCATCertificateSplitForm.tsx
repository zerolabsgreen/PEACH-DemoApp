"use client"

import React, { useMemo, useState } from 'react'
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
import { listOrganizationsWithRole, getOrganization } from '@/lib/services/organizations'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LocationField from '@/components/ui/location-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DatePicker from '@/components/ui/date-picker'
import LinksField from '@/components/ui/links-field'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import AmountsField from '@/components/eacertificate/AmountsField'
import EmissionsField from '@/components/eacertificate/EmissionsField'
import OrganizationRoleField from '@/components/eacertificate/OrganizationRoleField'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { FileType, MetadataItem, EACType, Amount, EmissionsData, OrganizationRole } from '@/lib/types/eacertificate'
import { EAC_TYPE_NAMES, EventTarget, EACType as EACTypeEnum } from '@/lib/types/eacertificate'

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

export default function TCATCertificateSplitForm({ backHref }: { backHref: string }) {
  const router = useRouter()

  // Left side documents (proof of retirement)
  const [docs, setDocs] = useState<UploadedDocument[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const selectedDoc = useMemo(() => (selectedDocId ? docs.find(d => d.id === selectedDocId) || null : docs[0] || null), [docs, selectedDocId])
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Verification report document (point O)
  const [verificationReportDoc, setVerificationReportDoc] = useState<UploadedDocument | null>(null)
  
  // Other relevant information (point P)
  type OtherInfoType = 'label' | 'rating' | 'other' | ''
  const [otherInfoType, setOtherInfoType] = useState<OtherInfoType>('')
  const [labels, setLabels] = useState<string[]>([]) // Array of label values
  const [rating, setRating] = useState<{
    orgId: string
    orgName?: string
    value: string
    date?: Date
    externalID?: string
  } | null>(null)
  const [otherMetadata, setOtherMetadata] = useState<Array<{ key: string; label: string; value: string }>>([]) // Array of metadata items

  // Right side form state
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState('') // A -> ProductionSource.name
  const [projectDescription, setProjectDescription] = useState('') // E -> ProductionSource.description
  const [location, setLocation] = useState<any>({ country: '', city: '', state: '', address: '', postalCode: '' }) // H
  const [psExternalId, setPsExternalId] = useState<string>('') // B -> ProductionSource.ExternalID.id
  const [registryOrgId, setRegistryOrgId] = useState<string>('') // C -> ProductionSource.organizations with role=Registry
  const [links, setLinks] = useState<string[]>([]) // D -> external link to retirement doc (optional)
  const [certType, setCertType] = useState<EACType>('REC' as EACType)
  const [amounts, setAmounts] = useState<Amount[]>([]) // F1 -> Amounts
  const [emissions, setEmissions] = useState<EmissionsData[]>([]) // I -> Emissions Mitigation Data
  const [vintageStart, setVintageStart] = useState<Date | undefined>() // G -> Event(type Production).dates
  const [vintageEnd, setVintageEnd] = useState<Date | undefined>()
  const [commercialOperationYear, setCommercialOperationYear] = useState<string>('') // J -> ProductionSource.Events(type ACTIVATION)
  const [fuelTechnology, setFuelTechnology] = useState<string>('') // Fuel and technology types -> ProductionSource.technology + EACertificate.productionTech
  const [organizations, setOrganizations] = useState<OrganizationRole[]>([
    { orgId: '', role: 'SELLER', orgName: undefined } // Default: one organization with SELLER role
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
      fileType: 'Certificate' as FileType,
      fileExtension: file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF',
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      metadata: [],
      organizations: [],
    }))
    setDocs(prev => [...prev, ...newDocuments])
  }

  const handleDocumentUpdate = (documentId: string, updates: Partial<UploadedDocument & { metadata: MetadataItem[] }>) => {
    setDocs(prev => prev.map(d => {
      if (d.id !== documentId) return d
      const next = { ...d }
      if (updates.title !== undefined) next.title = updates.title
      if (updates.description !== undefined) next.description = updates.description
      if ((updates as any).fileType !== undefined) next.fileType = (updates as any).fileType
      if ((updates as any).fileExtension !== undefined) next.fileExtension = (updates as any).fileExtension as any
      if ((updates as any).organizations !== undefined) next.organizations = (updates as any).organizations as any
      if ((updates as any).metadata) {
        next.metadata = (updates as any).metadata.map((m: any) => ({ key: m.key, label: m.label, value: m.value || '' }))
      }
      return next
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return toast.error('Project name is required')
    if (!psExternalId.trim()) return toast.error('Project / unit ID is required')
    // Registry is optional
    if (!vintageStart) return toast.error('Vintage start date is required')
    if (amounts.length === 0) return toast.error('Quantity is required')

    setSaving(true)
    try {
      // 1) Create Production Source
      const ps = await createProductionSource({
        name: projectName,
        description: projectDescription || undefined,
        location,
        technology: fuelTechnology.trim() || 'TCAT', // Use provided technology or default to TCAT
        links: links.length ? links : undefined,
        documents: [],
        externalIDs: [{ id: psExternalId.trim() }],
        organizations: registryOrgId ? [{ orgId: registryOrgId, role: 'Registry' }] : undefined,
      })

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
            organizations: [{ orgId: ps.id, role: 'owner', orgName: projectName }],
          })
          uploadedDocIds.push(uploadedDoc.id)
        }
        if (uploadedDocIds.length > 0) {
          await supabase
            .from('production_sources')
            .update({ documents: uploadedDocIds })
            .eq('id', ps.id)
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
        await supabase
          .from('eacertificates')
          .update({ documents: uploadedDocIds })
          .eq('id', cert.id)
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

      // 5) Create ACTIVATION Event for Production Source (Commercial Operation Year)
      const yearStr = commercialOperationYear.trim()
      const yearNum = yearStr ? parseInt(yearStr, 10) : null
      const isValidYear = yearNum && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 10
      
      const activationYear = isValidYear ? yearStr : 'N/A'
      const activationDate = isValidYear 
        ? new Date(yearNum, 0, 1) // January 1st of the year
        : new Date(2000, 0, 1) // Placeholder date when N/A (year 2000 as safe default)
      
      await createEvent({
        target: EventTarget.PSOURCE,
        targetId: ps.id,
        type: 'ACTIVATION',
        description: activationYear,
        dates: {
          start: activationDate,
        },
      })

      // 6) Create ISSUANCE Event for Certificate with Organizations (Entity name)
      // Filter out organizations without orgId (incomplete entries)
      const validOrganizations = organizations.filter(org => org.orgId && org.orgId.trim() !== '')
      if (validOrganizations.length > 0) {
        await createEvent({
          target: EventTarget.EAC,
          targetId: cert.id,
          type: 'ISSUANCE', // Use ISSUANCE by default (not a specific redemption)
          organizations: validOrganizations,
          dates: {
            start: new Date(), // Use current date for issuance
          },
        })
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
              fileType: 'AUDIT' as FileType, // Using AUDIT as closest match, or we could add VERIFICATION type
              title: verificationReportDoc.title,
              description: verificationReportDoc.description,
              metadata: verificationReportDoc.metadata,
              organizations: [{ orgId: verificationBodyOrgId, role: 'Verifier', orgName: verificationOrg.name }],
            })
            verificationDocIds.push(uploadedDoc.id)
          }
          
          const verificationEvent = await createEvent({
            target: EventTarget.EAC,
            targetId: cert.id,
            type: 'MRVERIFICATION',
            organizations: [{ orgId: verificationBodyOrgId, role: 'Verifier', orgName: verificationOrg.name }],
            documents: verificationDocIds.length > 0 ? verificationDocIds.map(id => ({
              id,
              url: '',
              fileType: 'AUDIT' as FileType,
              title: verificationReportDoc!.title,
              description: verificationReportDoc!.description,
              metadata: verificationReportDoc!.metadata,
              organizations: [{ orgId: verificationBodyOrgId, role: 'Verifier', orgName: verificationOrg.name }],
            })) : undefined,
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
              description: labelValue, // Using description field for label value
              dates: {
                start: new Date(),
              },
            })
          )
        )
      }

      // 9) Create MRVRATING Event for Rating (only one per certificate)
      if (rating && rating.orgId && rating.value) {
        await createEvent({
          target: EventTarget.EAC,
          targetId: cert.id,
          type: 'MRVRATING',
          organizations: [
            { orgId: rating.orgId, role: 'RATINGAGENCY', orgName: rating.orgName },
            ...(rating.externalID ? [{ orgId: rating.externalID, role: 'EXTERNALID' }] : []),
          ],
          notes: rating.value, // Using notes field for rating value
          dates: {
            start: rating.date || new Date(),
          },
        })
      }

      // 10) Add other metadata to certificate's first document
      if (otherMetadata.length > 0) {
        const supabase = createClientComponentClient()
        // Get certificate's documents
        const { data: certData } = await supabase
          .from('eacertificates')
          .select('documents')
          .eq('id', cert.id)
          .single()
        
        // Use uploaded docs from this form or certificate's existing docs
        const docIdsToUpdate = uploadedDocIds.length > 0 ? uploadedDocIds : (certData?.documents || [])
        
        if (docIdsToUpdate.length > 0) {
          // Get first document and update its metadata
          const { data: docData } = await supabase
            .from('documents')
            .select('metadata')
            .eq('doc_id', docIdsToUpdate[0])
            .single()
          
          const existingMetadata = (docData?.metadata as MetadataItem[]) || []
          const updatedMetadata = [...existingMetadata, ...otherMetadata.map(item => ({
            key: item.key,
            label: item.label,
            value: item.value,
          }))]
          
          await supabase
            .from('documents')
            .update({ metadata: updatedMetadata })
            .eq('doc_id', docIdsToUpdate[0])
        } else {
          // If no documents exist, add metadata to certificate metadata field (if available)
          // For now, we'll store it in the first uploaded document when available
          console.warn('No documents available to attach other metadata to')
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
                          input.onchange = (e) => {
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
                      {docs.map((doc) => (
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
                    onValueChange={(v) => {
                      setCertType(v as EACType)
                      ensureDefaultAmountUnit(v as EACType)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EAC_TYPE_NAMES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* A. Project name */}
                <FormFieldWrapper label="Project name" required>
                  <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" required />
                </FormFieldWrapper>

                {/* B. Project / unit ID */}
                <FormFieldWrapper label="Project / unit ID" required>
                  <Input
                    value={psExternalId}
                    onChange={e => setPsExternalId(e.target.value)}
                    placeholder="e.g., UNIT-12345"
                    required
                  />
                </FormFieldWrapper>

                {/* C. Registry (Organization with role Registry) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registry</label>
                  <Select value={registryOrgId || 'none'} onValueChange={v => setRegistryOrgId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select registry organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Minimal approach: use organizations table raw list */}
                      <RegistryOptions />
                    </SelectContent>
                  </Select>
                </div>

                {/* D. Proof of retirement (links) */}
                <LinksField
                  value={links}
                  onChange={setLinks}
                  label="Proof of retirement links"
                  description="Add links to retirement proof. To upload files, use the uploader on the left — they will be treated as proof of retirement."
                />

                {/* E. Project / facility description */}
                <FormFieldWrapper label="Project / facility description">
                  <Textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)} rows={3} placeholder="Short description" />
                </FormFieldWrapper>

                {/* F1. Quantity */}
                <div>
                  <AmountsField
                    value={amounts}
                    onChange={setAmounts}
                    label="Quantity"
                    description="Primary quantity for this certificate"
                  />
                </div>

                {/* G. Vintage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormFieldWrapper label="Vintage start" required>
                    <DatePicker value={vintageStart} onChange={setVintageStart} placeholder="Select start date" />
                  </FormFieldWrapper>
                  <FormFieldWrapper label="Vintage end (optional)">
                    <DatePicker value={vintageEnd} onChange={setVintageEnd} placeholder="Select end date" />
                  </FormFieldWrapper>
                </div>

                

                {/* H. Location */}
                <FormFieldWrapper label="Location">
                  <LocationField value={location} onChange={setLocation} />
                </FormFieldWrapper>

                {/* I. Emissions Mitigation Data - Hide for Carbon Credits */}
                {(certType !== EACTypeEnum.CC && certType !== EACTypeEnum.CR) && (
                  <EmissionsField
                    value={emissions}
                    onChange={handleEmissionsChange}
                    label="Emissions Mitigation Data"
                    description={emissionsExplainerByType[certType]}
                  />
                )}

                {/* J. Project or facility commercial operation year */}
                <FormFieldWrapper label="Project or facility commercial operation year">
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    placeholder="e.g. 2020"
                    value={commercialOperationYear}
                    onChange={(e) => {
                      const year = e.target.value
                      // Only allow valid year format (4 digits)
                      if (year === '' || /^\d{0,4}$/.test(year)) {
                        setCommercialOperationYear(year)
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use "N/A" if not available
                  </p>
                </FormFieldWrapper>

                {/* Fuel and Technology Types */}
                <FormFieldWrapper label="Project or facility fuel and technology types">
                  <Input
                    value={fuelTechnology}
                    onChange={(e) => setFuelTechnology(e.target.value)}
                    placeholder="e.g. Solar, Wind, Hydro, Biomass, Natural Gas, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for both Production Source technology and Certificate production technology
                  </p>
                </FormFieldWrapper>


                {/* Entity name - Organizations */}
                <div>
                  <OrganizationRoleField
                    value={organizations}
                    onChange={setOrganizations}
                    label="Entity name"
                    description="Information about the seller and other organizations associated with this certificate. Organizations will be stored in an ISSUANCE event."
                    sharedDocuments={docs}
                    selectedDocumentId={selectedDocId}
                  />
                </div>

                {/* Verification body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification body</label>
                  <Select 
                    value={verificationBodyOrgId || 'none'} 
                    onValueChange={(v) => setVerificationBodyOrgId(v === 'none' ? '' : v)}
                    disabled={isLoadingOrgs}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingOrgs ? 'Loading organizations...' : 'Select verification body'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableOrgs.map(org => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    The selected organization will be automatically added to the Entity name list with "Verifier" role. An MRVERIFICATION event will be created behind the scenes.
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
                          onFilesAccepted={(files) => {
                            if (files.length > 0) {
                              const file = files[0]
                              setVerificationReportDoc({
                                id: crypto.randomUUID(),
                                file,
                                fileType: 'AUDIT' as FileType,
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
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Other relevant information</label>
                    <Select value={otherInfoType} onValueChange={(v) => setOtherInfoType(v as OtherInfoType)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add information..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="label">Label</SelectItem>
                        <SelectItem value="rating" disabled={rating !== null}>Rating</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Labels */}
                  {labels.length > 0 && (
                    <div className="space-y-2">
                      {labels.map((label, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                          <Input
                            value={label}
                            onChange={(e) => {
                              const updated = [...labels]
                              updated[idx] = e.target.value
                              setLabels(updated)
                            }}
                            placeholder="Label value (e.g., Green-E)"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setLabels(labels.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Label UI */}
                  {otherInfoType === 'label' && (
                    <div className="p-4 border rounded space-y-2">
                      <Input
                        placeholder="Enter label value (e.g., Green-E)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            setLabels([...labels, e.currentTarget.value.trim()])
                            e.currentTarget.value = ''
                            setOtherInfoType('')
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const input = document.querySelector('input[placeholder*="label value"]') as HTMLInputElement
                            if (input?.value.trim()) {
                              setLabels([...labels, input.value.trim()])
                              input.value = ''
                              setOtherInfoType('')
                            }
                          }}
                        >
                          Add Label
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setOtherInfoType('')}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rating */}
                  {rating && (
                    <div className="p-4 border rounded space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Rating</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRating(null)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormFieldWrapper label="Rating agency" required>
                          <Select
                            value={rating.orgId || 'none'}
                            onValueChange={(v) => {
                              const org = availableOrgs.find(o => o.id === v)
                              setRating(prev => prev ? { ...prev, orgId: v, orgName: org?.name } : null)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOrgs.map(org => (
                                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Rating value" required>
                          <Input
                            value={rating.value}
                            onChange={(e) => setRating(prev => prev ? { ...prev, value: e.target.value } : null)}
                            placeholder="e.g., A+, AAA"
                          />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Rating date">
                          <DatePicker
                            value={rating.date}
                            onChange={(date) => setRating(prev => prev ? { ...prev, date } : null)}
                            placeholder="Select date"
                          />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="External ID (optional)">
                          <Input
                            value={rating.externalID || ''}
                            onChange={(e) => setRating(prev => prev ? { ...prev, externalID: e.target.value } : null)}
                            placeholder="Organization external ID"
                          />
                        </FormFieldWrapper>
                      </div>
                    </div>
                  )}

                  {/* Add Rating UI */}
                  {otherInfoType === 'rating' && !rating && (
                    <div className="p-4 border rounded">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setRating({ orgId: '', value: '' })}
                      >
                        Add Rating
                      </Button>
                    </div>
                  )}

                  {/* Other Metadata */}
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
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={item.label}
                              onChange={(e) => {
                                const updated = [...otherMetadata]
                                updated[idx] = { ...updated[idx], label: e.target.value, key: e.target.value }
                                setOtherMetadata(updated)
                              }}
                              placeholder="Label/Key"
                            />
                            <Input
                              value={item.value}
                              onChange={(e) => {
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

                  {/* Add Other UI */}
                  {otherInfoType === 'other' && (
                    <div className="p-4 border rounded space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Label/Key" id="other-label" />
                        <Input placeholder="Value" id="other-value" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const labelInput = document.getElementById('other-label') as HTMLInputElement
                            const valueInput = document.getElementById('other-value') as HTMLInputElement
                            if (labelInput?.value.trim() && valueInput?.value.trim()) {
                              setOtherMetadata([
                                ...otherMetadata,
                                {
                                  key: labelInput.value.trim(),
                                  label: labelInput.value.trim(),
                                  value: valueInput.value.trim(),
                                }
                              ])
                              labelInput.value = ''
                              valueInput.value = ''
                              setOtherInfoType('')
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setOtherInfoType('')}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => router.push(backHref)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create TCAT Certificate'}</Button>
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

// Inline async registry options loader component
function RegistryOptions() {
  const [items, setItems] = React.useState<Array<{ id: string; name: string }>>([])
  React.useEffect(() => {
    const load = async () => {
      const supabase = createClientComponentClient()
      const { data, error } = await supabase.from('organizations').select('id, name').order('name', { ascending: true })
      if (!error && data) setItems(data as any)
    }
    load()
  }, [])
  return (
    <>
      <SelectItem value="none">Select…</SelectItem>
      {items.map(i => (
        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
      ))}
    </>
  )
}


