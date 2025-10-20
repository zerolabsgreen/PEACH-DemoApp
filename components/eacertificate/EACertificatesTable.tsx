"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createEACertificateColumns, EACertificateRow } from "./EACertificatesColumns"
import Link from "next/link"
import { EACType, EAC_TYPE_NAMES } from "@/lib/types/eacertificate"
import { listProductionSources } from "@/lib/services/production-sources"
import { formatProductionSourceLabel } from "@/lib/utils/production-source-utils"
import { useRouter } from "next/navigation"
import { countries } from "countries-list"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button as UIButton } from "@/components/ui/button"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { exportToCSV, generateCSVFilename } from "@/lib/utils/csv-export"
import { Download } from "lucide-react"

interface Props {
  data: EACertificateRow[]
  onDelete?: () => void
}

export function EACertificatesTable({ data, onDelete }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [prodSourceFilter, setProdSourceFilter] = useState<string>("")
  const [query, setQuery] = useState<string>("")
  const [prodSources, setProdSources] = useState<{ id: string; name: string | null }[]>([])
  const router = useRouter()
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const srcs = await listProductionSources()
        setProdSources(srcs.map(s => ({ id: s.id, name: s.name })))
      } catch {}
    }
    load()
  }, [])

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((c) => {
      const cert: any = c as any
      const psId = cert.productionSourceId ?? cert.production_source_id
      if (country) {
        // Best-effort match: check production source country from a cached map if available
        const map = (window as any)?.__ps_country_map as Record<string, string> | undefined
        if (map && psId && map[psId] && map[psId] !== country) return false
      }
      if (typeFilter && c.type !== (typeFilter as any)) return false
      if (prodSourceFilter && psId !== prodSourceFilter) return false
      if (!q) return true
      const haystack: string[] = []
      haystack.push(EAC_TYPE_NAMES[c.type])
      if (c.amounts && Array.isArray(c.amounts)) {
        for (const a of c.amounts) {
          if (a.unit) haystack.push(String(a.unit))
          if (a.conversionNotes) haystack.push(String(a.conversionNotes))
        }
      }
      // Exclude IDs intentionally
      return haystack.some((s) => (s ?? "").toLowerCase().includes(q))
    })
  }, [data, typeFilter, prodSourceFilter, query])

  const handleExportCSV = async () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateCSVFilename('eacertificates', {
        type: typeFilter,
        productionSource: prodSourceFilter,
        country,
        search: query
      });
      
      await exportToCSV(filteredData, filename, 'eacertificates');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const table = useReactTable({
    data: filteredData,
    columns: createEACertificateColumns(onDelete),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-end flex-wrap gap-4 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Search</label>
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-[240px] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Type</label>
          <Select
            value={typeFilter || 'all'}
            onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-9 w-[220px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.values(EACType).map((t) => (
                <SelectItem key={t} value={t}>{EAC_TYPE_NAMES[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Production Source</label>
          <Select
            value={prodSourceFilter || 'all'}
            onValueChange={(value) => setProdSourceFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-9 w-[260px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {prodSources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{formatProductionSourceLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Country</label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <UIButton variant="outline" role="combobox" aria-expanded={countryOpen} className="w-[220px] justify-between">
                {country ? (countries as any)[country]?.name ?? country : "All"}
                <ChevronsUpDown className="opacity-50" />
              </UIButton>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Filter country..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="" onSelect={() => { setCountry(""); setCountryOpen(false) }}>All</CommandItem>
                    {Object.entries(countries).map(([code, meta]: any) => (
                      <CommandItem key={code} value={code} onSelect={(value) => { setCountry(value); setCountryOpen(false) }}>
                        {meta.name}
                        <Check className={cn("ml-auto", country === code ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Export</label>
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || filteredData.length === 0}
            className="h-9 px-3"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => {
                    router.push(`/eacertificates/${row.original.id}`)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={createEACertificateColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <div className="text-sm">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}


