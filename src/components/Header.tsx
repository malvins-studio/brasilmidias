'use client';

/**
 * Componente Header
 * 
 * Exibe o header da aplicação com navegação baseada no role do usuário:
 * - Clientes: veem apenas "Meu Dashboard" (reservas)
 * - Owners: veem "Meu Dashboard" e "Dashboard Owner" (gerenciamento de mídias)
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout } = useAuth();
  const { userRole, company, isOwner, isSuperAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Obtém o nome do usuário (name do Firestore ou email)
  const userName = userRole?.name || user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  
  // Obtém o texto do role em português
  const getRoleText = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isOwner) return 'Owner';
    return 'Cliente';
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          midiasbrasil
        </Link>

        <div className="flex items-center gap-4">
          {/* Botão Proprietário - aparece para todos */}
          <Button
            onClick={() => router.push('/owner/onboarding')}
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-0 h-auto py-2 px-4"
          >
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold leading-tight">Proprietário?</span>
            </div>
            <span className="text-xs text-muted-foreground font-normal leading-tight">Crie suas mídias</span>
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                  <Avatar>
                    <AvatarFallback>
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{userName}</span>
                    {!roleLoading && (
                      <span className="text-xs text-muted-foreground">
                        {getRoleText()}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Informações do usuário */}
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{userName}</span>
                    {!roleLoading && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {getRoleText()}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                
                {/* Nome da company (se tiver) */}
                {company && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-normal">
                          Empresa
                        </span>
                        <span className="text-sm font-medium">
                          {company.name}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                  </>
                )}

                <DropdownMenuSeparator />

                {/* Perfil - disponível para todos os usuários */}
                <DropdownMenuItem asChild>
                  <Link href="/profile">Meu Perfil</Link>
                </DropdownMenuItem>
                
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
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={logout}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/login" className="w-full">
                    Entrar ou Se cadastrar
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

