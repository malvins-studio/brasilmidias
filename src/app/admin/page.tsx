'use client';

/**
 * Página de Administração (Super Admin)
 * 
 * Permite ao SUPER ADMIN:
 * - Gerenciar companies (criar, editar, listar)
 * - Atrelar usuários a companies
 * - Ver todos os usuários e suas companies
 * 
 * IMPORTANTE: Apenas usuários com isSuperAdmin = true podem acessar
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Company, User } from '@/types';
import { Building2, Users, Plus, Save, X } from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Estados
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<(User & { company?: Company })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para formulário de company
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    logo: '',
  });

  // Estados para atrelar usuário a company
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  /**
   * Verifica se o usuário é super admin e redireciona se não for
   */
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isSuperAdmin) {
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, roleLoading, isSuperAdmin, router]);

  /**
   * Busca companies e usuários
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Busca companies
      const companiesQuery = query(
        collection(db, 'companies'),
        orderBy('createdAt', 'desc')
      );
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData: Company[] = [];
      companiesSnapshot.forEach((doc) => {
        companiesData.push({
          id: doc.id,
          ...doc.data(),
        } as Company);
      });
      setCompanies(companiesData);

      // Busca usuários
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: (User & { company?: Company })[] = [];

      for (const docSnap of usersSnapshot.docs) {
        const userData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as User;

        // Busca informações da company se o usuário tiver companyId
        let company: Company | undefined;
        if (userData.companyId) {
          const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
          if (companyDoc.exists()) {
            company = {
              id: companyDoc.id,
              ...companyDoc.data(),
            } as Company;
          }
        }

        // Cria objeto com userData e company
        usersData.push({
          ...userData,
          company,
        });
      }

      setUsers(usersData);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao buscar dados');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva ou atualiza uma company
   */
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyFormData.name.trim()) {
      setError('Nome da company é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingCompany) {
        // Atualiza company existente
        await updateDoc(doc(db, 'companies', editingCompany.id), {
          name: companyFormData.name.trim(),
          logo: companyFormData.logo.trim() || undefined,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Cria nova company
        await setDoc(doc(collection(db, 'companies')), {
          name: companyFormData.name.trim(),
          logo: companyFormData.logo.trim() || undefined,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Limpa formulário e recarrega dados
      setCompanyFormData({ name: '', logo: '' });
      setEditingCompany(null);
      setShowCompanyForm(false);
      await fetchData();
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao salvar company');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atrela um usuário a uma company
   */
  const handleAttachUserToCompany = async () => {
    if (!selectedUserId || !selectedCompanyId) {
      setError('Selecione um usuário e uma company');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await updateDoc(doc(db, 'users', selectedUserId), {
        companyId: selectedCompanyId,
        updatedAt: Timestamp.now(),
      });

      // Limpa seleções e recarrega dados
      setSelectedUserId('');
      setSelectedCompanyId('');
      await fetchData();
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao atrelar usuário à company');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove usuário de uma company
   */
  const handleRemoveUserFromCompany = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário da company?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await updateDoc(doc(db, 'users', userId), {
        companyId: null,
        updatedAt: Timestamp.now(),
      });

      await fetchData();
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao remover usuário da company');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia edição de company
   */
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyFormData({
      name: company.name,
      logo: company.logo || '',
    });
    setShowCompanyForm(true);
  };

  /**
   * Cancela edição/criação
   */
  const handleCancelForm = () => {
    setShowCompanyForm(false);
    setEditingCompany(null);
    setCompanyFormData({ name: '', logo: '' });
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel de Administração</h1>
          <p className="text-muted-foreground">
            Gerencie companies e usuários (Apenas Super Admin)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies">
              <Building2 className="h-4 w-4 mr-2" />
              Companies ({companies.length})
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab de Companies */}
          <TabsContent value="companies">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setShowCompanyForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Company
              </Button>
            </div>

            {showCompanyForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {editingCompany ? 'Editar Company' : 'Nova Company'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCompany} className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Nome da Company *</Label>
                      <Input
                        id="companyName"
                        value={companyFormData.name}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyLogo">URL do Logo</Label>
                      <Input
                        id="companyLogo"
                        value={companyFormData.logo}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, logo: e.target.value })
                        }
                        placeholder="https://exemplo.com/logo.png"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelForm}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        {company.logo && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Logo: {company.logo}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleEditCompany(company)}
                      >
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab de Usuários */}
          <TabsContent value="users">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Atrelar Usuário a Company</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="selectUser">Usuário</Label>
                    <select
                      id="selectUser"
                      className="w-full p-2 border rounded-md"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Selecione um usuário</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="selectCompany">Company</Label>
                    <select
                      id="selectCompany"
                      className="w-full p-2 border rounded-md"
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                      <option value="">Selecione uma company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAttachUserToCompany}
                      disabled={!selectedUserId || !selectedCompanyId || loading}
                      className="w-full"
                    >
                      Atrelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {users.map((userData) => (
                <Card key={userData.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{userData.email}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          <p>Role: {userData.role}</p>
                          <p>
                            Company:{' '}
                            {userData.company
                              ? userData.company.name
                              : 'Nenhuma'}
                          </p>
                          {userData.isSuperAdmin && (
                            <p className="text-blue-600 font-medium">Super Admin</p>
                          )}
                        </div>
                      </div>
                      {userData.companyId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveUserFromCompany(userData.id)}
                        >
                          Remover da Company
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

