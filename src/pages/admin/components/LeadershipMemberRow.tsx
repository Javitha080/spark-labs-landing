import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { LeadershipMember } from "./types";

interface LeadershipMemberRowProps {
  member: LeadershipMember;
  onEdit: (member: LeadershipMember) => void;
  onDelete: (id: string) => void;
}

export function LeadershipMemberRow({ member, onEdit, onDelete }: LeadershipMemberRowProps) {
  const getInitials = (name: string) =>
    name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border">
            <AvatarImage src={member.image_url || undefined} alt={member.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{member.name}</p>
            {member.tagline && (
              <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                "{member.tagline}"
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p className="text-sm">{member.role}</p>
          {member.department && (
            <Badge variant="outline" className="text-[10px]">
              {member.department}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {member.email ? (
          <span className="text-sm text-muted-foreground">{member.email}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          {member.linkedin_url && (
            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {member.github_url && (
            <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-center">
        <Badge variant="secondary" className="text-[10px]">
          #{member.display_order}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => onEdit(member)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="destructive" size="sm" className="size-8 p-0" onClick={() => onDelete(member.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
