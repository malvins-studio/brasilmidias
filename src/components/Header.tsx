'use client';

/**
 * Componente Header
 * 
 * Exibe o header da aplicação com navegação baseada no role do usuário:
 * - Clientes: veem apenas "Meu Dashboard" (reservas)
 * - Owners: veem "Meu Dashboard" e "Dashboard Owner" (gerenciamento de mídias)
 */

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout } = useAuth();
  const { isOwner, isSuperAdmin, loading: roleLoading } = useUserRole();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          midiasbrasil
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Dashboard de reservas - disponível para todos os usuários */}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Meu Dashboard</Link>
                </DropdownMenuItem>
                {/* Dashboard do owner - apenas para owners */}
                {!roleLoading && isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href="/owner/dashboard">Dashboard Owner</Link>
                  </DropdownMenuItem>
                )}
                {/* Painel de administração - apenas para super admins */}
                {!roleLoading && isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Administração</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

