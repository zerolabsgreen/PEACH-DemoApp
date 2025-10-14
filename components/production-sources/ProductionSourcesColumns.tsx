"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, PencilLine, PlusCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ProductionSource } from "@/lib/services/production-sources"
import { deleteProductionSource } from "@/lib/services/production-sources"
import { formatDate } from "@/lib/date-utils"
import { toast } from "sonner"
import { formatProductionSourceLabel } from "@/lib/utils/production-source-utils"

export type ProductionSourceRow = Pick<ProductionSource, "id" | "name" | "technology" | "description" | "created_at">

export const createProductionSourceColumns = (onDelete?: () => void): ColumnDef<ProductionSourceRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {formatProductionSourceLabel(row.original)}
      </div>
    ),
  },
  {
    accessorKey: "technology",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Technology<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.original.technology}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: () => <div className="text-left">Description</div>,
    cell: ({ row }) => (
      <div className="text-sm text-gray-500 max-w-xs truncate">
        {row.original.description || '—'}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Created<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{formatDate(row.original.created_at)}</div>,
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
      await deleteProductionSource(id)
      toast.success('Production source deleted successfully')
      onDelete?.() // Call the refresh function from parent
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete production source')
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
              onClick={() => router.push(`/production-sources/${id}/edit`)}
            >
              <PencilLine className="mr-2 size-4" /> Edit
            </Button>
            <Button 
              variant="ghost" 
              className="justify-start h-8 px-2" 
              data-no-row-click 
              onClick={() => router.push(`/events/new?target=ProductionSource&targetId=${id}`)}
            >
              <PlusCircle className="mr-2 size-4" /> Add event
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
                  <AlertDialogTitle>Delete production source?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this production source.
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
