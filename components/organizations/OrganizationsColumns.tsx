"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, PencilLine, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Organization } from "@/lib/services/organizations"
import { deleteOrganization } from "@/lib/services/organizations"
import { formatDate } from "@/lib/date-utils"

export type OrganizationRow = Pick<Organization, "id" | "name" | "created_at">

export const createOrganizationColumns = (onDelete?: () => void): ColumnDef<OrganizationRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name<ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
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
      await deleteOrganization(id)
      onDelete?.() // Call the refresh function from parent
    } catch (e) {
      console.error(e)
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
            <Button variant="ghost" className="justify-start h-8 px-2" data-no-row-click onClick={() => router.push(`/organizations/${id}/edit`)}>
              <PencilLine className="mr-2 size-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" data-no-row-click>
                  <Trash2 className="mr-2 size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete organization?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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


