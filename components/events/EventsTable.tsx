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
import DatePickerFilter from "@/components/ui/date-picker-filter"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { eventColumns, EventRow } from "./EventsColumns"
import { useRouter } from "next/navigation"
import { countries } from "countries-list"
import { format } from "date-fns"
import { parseDateInput } from "@/lib/date-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { EventTarget } from "@/lib/types/eacertificate"

interface Props {
  data: EventRow[]
  targetLabels: Record<string, string>
  onDelete?: () => void
}

export function EventsTable({ data, targetLabels, onDelete }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [targetFilter, setTargetFilter] = useState("")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const selectedCountryName = country ? ((countries as any)[country]?.name ?? country) : ""
    
    return data.filter((event: any) => {
      const matchesQuery = q ? 
        [event.type, event.description].some((s) => (s ?? "").toLowerCase().includes(q)) : 
        true
      
      const matchesType = typeFilter ? 
        event.type.toLowerCase().includes(typeFilter.toLowerCase()) : 
        true
      
      const matchesTarget = targetFilter ? 
        event.target === targetFilter : 
        true
      
      const matchesStartDate = startDateFilter ? (() => {
        if (!event.dates?.start) return false
        const eventStart = new Date(event.dates.start)
        const filterStart = new Date(startDateFilter)
        return eventStart >= filterStart
      })() : true
      
      const matchesEndDate = endDateFilter ? (() => {
        if (!event.dates?.start) return false
        const eventStart = new Date(event.dates.start)
        const filterEnd = new Date(endDateFilter)
        return eventStart <= filterEnd
      })() : true
      
      const matchesCountry = country ? (() => {
        if (!event.location?.country) return false
        const eventCountry = String(event.location.country).toLowerCase()
        return eventCountry === String(country).toLowerCase() || 
               (selectedCountryName && eventCountry === selectedCountryName.toLowerCase())
      })() : true
      
      return matchesQuery && matchesType && matchesTarget && matchesStartDate && matchesEndDate && matchesCountry
    })
  }, [data, query, typeFilter, targetFilter, startDateFilter, endDateFilter, country])

  // Get unique types for type filter suggestions
  const types = useMemo(() => {
    const typeSet = new Set(data.map(e => e.type).filter(Boolean))
    return Array.from(typeSet).sort()
  }, [data])

  // Get unique targets for target filter
  const targets = useMemo(() => {
    const targetSet = new Set(data.map(e => e.target).filter(Boolean))
    return Array.from(targetSet).sort()
  }, [data])

  const table = useReactTable({
    data: filtered,
    columns: eventColumns(targetLabels, onDelete),
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
          <label className="text-xs text-gray-600">Type</label>
          <Input 
            placeholder="Filter by type..." 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)} 
            className="w-[200px] bg-white" 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Target</label>
          <Select
            value={targetFilter || 'all'}
            onValueChange={(value) => setTargetFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {targets.map((target) => (
                <SelectItem key={target} value={target}>{target}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Start Date</label>
          <DatePickerFilter
            value={startDateFilter ? parseDateInput(startDateFilter) || undefined : undefined}
            onChange={(date) => setStartDateFilter(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="Start date"
            className="w-[150px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">End Date</label>
          <DatePickerFilter
            value={endDateFilter ? parseDateInput(endDateFilter) || undefined : undefined}
            onChange={(date) => setEndDateFilter(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="End date"
            className="w-[150px]"
          />
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
                    router.push(`/events/${row.original.id}`)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={eventColumns(targetLabels, onDelete).length} className="h-24 text-center">No results.</TableCell>
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
