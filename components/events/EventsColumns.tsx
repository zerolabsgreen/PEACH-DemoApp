"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, PencilLine, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { EventDB } from "@/lib/types/eacertificate"
import { deleteEvent } from "@/lib/services/events"
import { formatDate, formatDateTime, formatDateRange } from "@/lib/date-utils"
import { toast } from "sonner"

export type EventRow = Pick<EventDB, "id" | "type" | "target" | "target_id" | "dates" | "location" | "metadata" | "created_at" | "updated_at">

function formatTargetLabel(target: string, targetId: string, targetLabels: Record<string, string>) {
  const key = `${target}:${targetId}`
  return targetLabels[key] || `${target} • ${targetId}`
}

export const eventColumns = (targetLabels: Record<string, string>, onDelete?: () => void): ColumnDef<EventRow>[] => [
  {
    accessorKey: "type",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Type<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.type}
      </div>
    ),
  },
  {
    accessorKey: "target",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Target<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {formatTargetLabel(row.original.target, row.original.target_id, targetLabels)}
      </div>
    ),
  },
  {
    id: "dates",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Dates<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {formatDateRange(row.original.dates?.start, row.original.dates?.end)}
      </div>
    ),
    sortingFn: (a, b) => {
      const aStart = a.original.dates?.start ? new Date(a.original.dates.start).getTime() : 0
      const bStart = b.original.dates?.start ? new Date(b.original.dates.start).getTime() : 0
      return aStart - bStart
    },
  },
  {
    accessorKey: "location",
    header: () => <div className="text-left">Location</div>,
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.original.location?.country || "—"}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "metadata",
    header: () => <div className="text-left">Metadata</div>,
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.original.metadata && row.original.metadata.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.metadata.slice(0, 2).map((item, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {item.label || item.key}: {item.value}
              </span>
            ))}
            {row.original.metadata.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                +{row.original.metadata.length - 2} more
              </span>
            )}
          </div>
        ) : (
          "—"
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Updated<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-gray-500">
        {formatDateTime(row.original.updated_at)}
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <ActionCell id={row.original.id} onDelete={onDelete} />,
  },
]

function ActionCell({ id, onDelete }: { id: string; onDelete?: () => void }) {
  const router = useRouter()

  const handleDelete = async () => {
    try {
      await deleteEvent(id)
      toast.success('Event deleted successfully')
      onDelete?.() // Call the refresh function from parent
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete event')
    }
  }

  return (
    <div className="flex justify-end" data-no-row-click onClick={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" aria-label="Actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col">
            <Button 
              variant="ghost" 
              className="justify-start h-8 px-2" 
              data-no-row-click 
              onClick={() => router.push(`/events/${id}/edit`)}
            >
              <PencilLine className="mr-2 size-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" 
                  data-no-row-click
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this event.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
