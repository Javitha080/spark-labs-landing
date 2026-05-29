import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { TeamMember } from "./types";

interface TeamMemberRowProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDelete: (id: string) => void;
}

export function TeamMemberRow({ member, onEdit, onDelete }: TeamMemberRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium max-w-[150px] truncate">{member.name}</TableCell>
      <TableCell className="max-w-[150px] truncate">{member.role}</TableCell>
      <TableCell className="hidden md:table-cell max-w-[200px] truncate">{member.email || "-"}</TableCell>
      <TableCell className="hidden lg:table-cell">{member.display_order}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => onEdit(member)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => onDelete(member.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
