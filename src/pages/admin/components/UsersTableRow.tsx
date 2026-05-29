import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Circle, Edit, Trash2 } from "lucide-react";
import { UserWithRole } from "./types";

interface UsersTableRowProps {
  user: UserWithRole;
  onEdit: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
}

export function UsersTableRow({ user, onEdit, onDelete }: UsersTableRowProps) {
  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
            <AvatarFallback>
              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.full_name || <span className="text-muted-foreground">Not set</span>}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {user.role || "No Role"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Circle className={`size-2 ${user.is_active ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} />
          <span className="text-sm">{user.is_active ? 'Online' : 'Offline'}</span>
        </div>
      </TableCell>
      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(user)}
            title="Edit user"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(user)}
            title="Delete user"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
