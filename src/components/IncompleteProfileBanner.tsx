'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IncompleteProfileBanner() {
  const { userRole, loading } = useUserRole();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading && userRole) {
      // Verifica se o cadastro está incompleto
      // Um cadastro completo precisa ter: name, (cpf ou cnpj), phone
      const hasName = !!userRole.name && userRole.name.trim().length > 0;
      const hasDocument = !!(userRole.cpf || userRole.cnpj);
      const hasPhone = !!userRole.phone && userRole.phone.trim().length > 0;
      
      const isComplete = hasName && hasDocument && hasPhone;
      
      // Mostra a barra se o cadastro estiver incompleto
      setShow(!isComplete);
    }
  }, [userRole, loading]);

  if (!show) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Seu cadastro está incompleto
            </p>
            <p className="text-xs text-yellow-700">
              Complete seu perfil para continuar usando a plataforma
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              router.push('/profile');
              setShow(false);
            }}
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            Completar Cadastro
          </Button>
          <button
            onClick={() => setShow(false)}
            className="text-yellow-600 hover:text-yellow-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

