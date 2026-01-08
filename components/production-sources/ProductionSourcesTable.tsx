"use client"

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
import { createProductionSourceColumns, ProductionSourceRow } from "./ProductionSourcesColumns"
import { useRouter } from "next/navigation"
import { countries } from "countries-list"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { exportToCSV, generateCSVFilename } from "@/lib/utils/csv-export"
import { Download } from "lucide-react"

interface Props {
  data: ProductionSourceRow[]
  sourcesWithLocation?: Array<{ id: string; location: any | null }>
  onDelete?: () => void
}

export function ProductionSourcesTable({ data, sourcesWithLocation = [], onDelete }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [query, setQuery] = useState("")
  const [technologyFilter, setTechnologyFilter] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const selectedCountryName = country ? ((countries as any)[country]?.name ?? country) : ""
    
    return data.filter((source: any) => {
      // Handle technology as array for search
      const technologyText = Array.isArray(source.technology) ? source.technology.join(' ') : (source.technology ?? '')
      const matchesQuery = q ?
        [source.name, technologyText, source.description].some((s) => (s ?? "").toLowerCase().includes(q)) :
        true

      // Handle technology as array for filter
      const matchesTechnology = technologyFilter ?
        (Array.isArray(source.technology) ? source.technology.includes(technologyFilter) : source.technology === technologyFilter) :
        true
      
      // Country filtering using location data
      const matchesCountry = country ? (() => {
        const sourceWithLocation = sourcesWithLocation.find(s => s.id === source.id)
        if (!sourceWithLocation?.location) return false
        
        // Location is a single object, not an array
        const loc = sourceWithLocation.location
        if (!loc?.country) return false
        
        const locCountry = String(loc.country).toLowerCase()
        return locCountry === String(country).toLowerCase() || 
               (selectedCountryName && locCountry === selectedCountryName.toLowerCase())
      })() : true
      
      return matchesQuery && matchesTechnology && matchesCountry
    })
  }, [data, query, technologyFilter, country, sourcesWithLocation])

  const handleExportCSV = async () => {
    if (filtered.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateCSVFilename('production-sources', {
        technology: technologyFilter,
        country,
        search: query
      });
      
      await exportToCSV(filtered as any[], filename, 'production-sources');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Get unique technologies for filter dropdown (technology is now an array)
  const technologies = useMemo(() => {
    const techs = new Set(
      data.flatMap(s => Array.isArray(s.technology) ? s.technology : [s.technology]).filter(Boolean)
    )
    return Array.from(techs).sort()
  }, [data])

  const table = useReactTable({
    data: filtered,
    columns: createProductionSourceColumns(onDelete),
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
      <div className="flex items-end gap-4 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Search</label>
          <Input 
            placeholder="Search production sources..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="w-[280px] bg-white" 
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Technology</label>
          <Select
            value={technologyFilter || 'all'}
            onValueChange={(value) => setTechnologyFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {technologies.map((tech) => (
                <SelectItem key={tech} value={tech}>{tech}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Country</label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-[220px] justify-between">
                {country ? (countries as any)[country]?.name ?? country : "All"}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Filter country..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="All" onSelect={() => { setCountry(""); setCountryOpen(false) }}>All</CommandItem>
                    {Object.entries(countries).map(([code, meta]: any) => (
                      <CommandItem
                        key={code}
                        value={meta.name}
                        onSelect={() => { setCountry(code); setCountryOpen(false) }}
                      >
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
            disabled={isExporting || filtered.length === 0}
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
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('a, button, [role="button"], [data-no-row-click], .no-row-click')) {
                      e.preventDefault()
                      e.stopPropagation()
                      return
                    }
                    router.push(`/production-sources/${row.original.id}`)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={createProductionSourceColumns().length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} total</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <div className="text-sm">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  )
}
