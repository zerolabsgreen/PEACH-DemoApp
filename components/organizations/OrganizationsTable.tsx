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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createOrganizationColumns, OrganizationRow } from "./OrganizationsColumns"
import { useRouter } from "next/navigation"
import { countries } from "countries-list"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { exportToCSV, generateCSVFilename } from "@/lib/utils/csv-export"
import { Download } from "lucide-react"

interface Props {
  data: OrganizationRow[]
  onDelete?: () => void
}

export function OrganizationsTable({ data, onDelete }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [query, setQuery] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const selectedCountryName = country ? ((countries as any)[country]?.name ?? country) : ""
    return data.filter((o: any) => {
      const matchesQuery = q ? [o.name].some((s) => (s ?? "").toLowerCase().includes(q)) : true
      const orgCountries: string[] = Array.isArray(o.location) ? o.location.map((l: any) => (l?.country ?? "")).filter(Boolean) : []
      const matchesCountry = country
        ? orgCountries.some((c) => {
            const lc = String(c).toLowerCase()
            return lc === String(country).toLowerCase() || (selectedCountryName && lc === selectedCountryName.toLowerCase())
          })
        : true
      return matchesQuery && matchesCountry
    })
  }, [data, query, country])

  const handleExportCSV = async () => {
    if (filtered.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateCSVFilename('organizations', {
        country,
        search: query
      });
      
      await exportToCSV(filtered, filename, 'organizations');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const table = useReactTable({
    data: filtered,
    columns: createOrganizationColumns(onDelete),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  })

  return (
    <div className="w-full">
      <div className="flex items-end gap-4 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Search</label>
          <Input placeholder="Search organizations..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-[280px] bg-white" />
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
                        // Use label as the searchable value so typing country names works
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
                    router.push(`/organizations/${row.original.id}`)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={createOrganizationColumns().length} className="h-24 text-center">No results.</TableCell>
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


