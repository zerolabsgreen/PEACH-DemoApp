"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, PencilLine, PlusCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EACertificate, EAC_TYPE_NAMES } from "@/lib/types/eacertificate"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { deleteEACertificate } from "@/lib/services/eacertificates"
import { formatDate } from "@/lib/date-utils"
import { toast } from "sonner"

export type EACertificateRow = Pick<
  EACertificate,
  "id" | "type" | "amounts" | "created_at" | "updated_at" | "productionSourceId"
>

function formatPrimaryAmount(amounts: EACertificateRow["amounts"]) {
  if (!amounts || amounts.length === 0) return "—"
  const primary = amounts.find(a => a.isPrimary) || amounts[0]
  const value = typeof primary.amount === "number" ? primary.amount : Number(primary.amount)
  return `${value} ${primary.unit}`
}

export const createEACertificateColumns = (onDelete?: () => void): ColumnDef<EACertificateRow>[] => [
  {
    accessorKey: "type",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Type<ArrowUpDown className="ml-2 size-4" /></Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{EAC_TYPE_NAMES[row.original.type]}</span>
        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{row.original.type}</span>
      </div>
    ),
    sortingFn: (a, b) => EAC_TYPE_NAMES[a.original.type].localeCompare(EAC_TYPE_NAMES[b.original.type]),
  },
  {
    id: "amount",
    header: () => <div className="text-left">Amount</div>,
    cell: ({ row }) => (
      <div className="text-left">{formatPrimaryAmount(row.original.amounts)}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Created<ArrowUpDown className="ml-2 size-4" /></Button>
    ),
    cell: ({ row }) => <div>{formatDate(row.original.created_at)}</div>,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Updated<ArrowUpDown className="ml-2 size-4" /></Button>
    ),
    cell: ({ row }) => <div>{formatDate(row.original.updated_at)}</div>,
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
      await deleteEACertificate(id)
      toast.success('EA Certificate deleted successfully')
      onDelete?.() // Call the refresh function from parent
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete EA Certificate')
    }
  }

  return (
    <div className="flex justify-end" data-no-row-click onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            aria-label="Actions"
            data-no-row-click
            onClick={(e) => { e.stopPropagation() }}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              className="justify-start h-8 px-2"
              data-no-row-click
              onClick={(e) => { e.stopPropagation(); router.push(`/eacertificates/${id}/edit`) }}
            >
              <PencilLine className="mr-2 size-4" /> Edit
            </Button>
            <Button
              variant="ghost"
              className="justify-start h-8 px-2"
              data-no-row-click
              onClick={(e) => { e.stopPropagation(); router.push(`/events/new?target=EAC&targetId=${id}`) }}
            >
              <PlusCircle className="mr-2 size-4" /> Add event
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-no-row-click
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this certificate.
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


