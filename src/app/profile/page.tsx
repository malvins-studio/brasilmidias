'use client';

/**
 * Página de Perfil do Usuário
 * 
 * Permite ao usuário atualizar:
 * - Nome
 * - CPF/CNPJ
 * - Senha
 * 
 * Email não pode ser alterado (gerenciado pelo Firebase Auth)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  validateCPF, 
  validateCNPJ, 
  formatCPF, 
  formatCNPJ,
  validatePhone,
  formatPhone,
  applyPhoneMask,
  removeNonNumeric,
  translateFirebaseError 
} from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserPassword, updateUserData } = useAuth();
  const { userRole, loading: roleLoading, refetch } = useUserRole();
  const router = useRouter();

  // Estados do formulário
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de validação (mensagens de erro por campo)
  const [errors, setErrors] = useState<{
    name?: string;
    document?: string;
    phone?: string;
  }>({});
  
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Estados de feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Estados para controlar quando validar (após o usuário interagir)
  const [touched, setTouched] = useState<{
    name?: boolean;
    document?: boolean;
    phone?: boolean;
    currentPassword?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});

  // Carrega dados do usuário
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (userRole) {
      setName(userRole.name || '');
      
      if (userRole.documentType) {
        setDocumentType(userRole.documentType);
      }
      
      if (userRole.cpf) {
        setDocument(formatCPF(userRole.cpf));
        setDocumentType('cpf');
      } else if (userRole.cnpj) {
        setDocument(formatCNPJ(userRole.cnpj));
        setDocumentType('cnpj');
      }
      
      if (userRole.phone) {
        setPhone(formatPhone(userRole.phone));
      }
    }
  }, [user, userRole, authLoading, router]);

  // Validação do documento
  const validateDocument = (doc: string, type: 'cpf' | 'cnpj'): string | undefined => {
    const cleanDoc = removeNonNumeric(doc);
    
    if (!cleanDoc) {
      return undefined; // Documento é opcional
    }
    
    if (type === 'cpf') {
      if (cleanDoc.length !== 11) {
        return 'CPF deve ter 11 dígitos';
      }
      if (!validateCPF(cleanDoc)) {
        return 'CPF inválido';
      }
    } else {
      if (cleanDoc.length !== 14) {
        return 'CNPJ deve ter 14 dígitos';
      }
      if (!validateCNPJ(cleanDoc)) {
        return 'CNPJ inválido';
      }
    }
    
    return undefined;
  };

  const handleDocumentChange = (value: string) => {
    const cleanValue = removeNonNumeric(value);
    setDocument(cleanValue);
    
    // Valida em tempo real se o campo foi tocado
    if (touched.document) {
      const error = validateDocument(cleanValue, documentType);
      setErrors(prev => ({ ...prev, document: error }));
    }
  };

  const handleDocumentBlur = () => {
    setTouched(prev => ({ ...prev, document: true }));
    
    const cleanDoc = removeNonNumeric(document);
    if (documentType === 'cpf' && cleanDoc.length === 11) {
      setDocument(formatCPF(cleanDoc));
    } else if (documentType === 'cnpj' && cleanDoc.length === 14) {
      setDocument(formatCNPJ(cleanDoc));
    }
    
    // Valida ao sair do campo
    const error = validateDocument(document, documentType);
    setErrors(prev => ({ ...prev, document: error }));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    
    // Valida em tempo real se o campo foi tocado
    if (touched.name) {
      if (value.trim().length > 0 && value.trim().length < 3) {
        setErrors(prev => ({ ...prev, name: 'Nome deve ter pelo menos 3 caracteres' }));
      } else {
        setErrors(prev => ({ ...prev, name: undefined }));
      }
    }
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    
    if (name.trim().length > 0 && name.trim().length < 3) {
      setErrors(prev => ({ ...prev, name: 'Nome deve ter pelo menos 3 caracteres' }));
    } else {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  // Validação de telefone
  const validatePhoneField = (phoneValue: string): string | undefined => {
    if (!phoneValue) {
      return undefined; // Telefone é opcional
    }
    const cleanPhone = removeNonNumeric(phoneValue);
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return 'Telefone deve ter 10 ou 11 dígitos (com DDD)';
    }
    if (!validatePhone(cleanPhone)) {
      return 'Telefone inválido';
    }
    return undefined;
  };

  const handlePhoneChange = (value: string) => {
    // Aplica máscara em tempo real
    const maskedValue = applyPhoneMask(value);
    setPhone(maskedValue);
    
    // Valida em tempo real se o campo foi tocado
    if (touched.phone) {
      const cleanValue = removeNonNumeric(maskedValue);
      const error = validatePhoneField(cleanValue);
      setErrors(prev => ({ ...prev, phone: error }));
    }
  };

  const handlePhoneBlur = () => {
    setTouched(prev => ({ ...prev, phone: true }));
    
    // Formata o telefone ao sair do campo (garante formatação correta)
    const cleanPhone = removeNonNumeric(phone);
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      setPhone(formatPhone(cleanPhone));
    }
    
    // Valida ao sair do campo
    const cleanPhoneForValidation = removeNonNumeric(phone);
    const error = validatePhoneField(cleanPhoneForValidation);
    setErrors(prev => ({ ...prev, phone: error }));
  };

  // Validação de senha
  const validatePassword = (password: string, field: 'newPassword' | 'confirmPassword'): string | undefined => {
    if (field === 'newPassword') {
      if (!password) {
        return 'Nova senha é obrigatória';
      }
      if (password.length < 6) {
        return 'A senha deve ter pelo menos 6 caracteres';
      }
      if (password === currentPassword) {
        return 'A nova senha deve ser diferente da senha atual';
      }
    } else {
      if (!password) {
        return 'Confirmação de senha é obrigatória';
      }
      if (password !== newPassword) {
        return 'As senhas não coincidem';
      }
    }
    return undefined;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Marca todos os campos como tocados para mostrar erros
    setTouched({ name: true, document: true, phone: true });
    
    // Valida todos os campos
    const newErrors: typeof errors = {};
    
    if (name.trim().length > 0 && name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    const cleanDocument = removeNonNumeric(document);
    if (cleanDocument) {
      const docError = validateDocument(document, documentType);
      if (docError) {
        newErrors.document = docError;
      }
    }
    
    const phoneError = validatePhoneField(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }
    
    setErrors(newErrors);
    
    // Se houver erros, não submete
    if (Object.values(newErrors).some(err => err !== undefined)) {
      return;
    }
    
    setLoading(true);

    try {

      // Atualiza dados do usuário
      const cleanPhone = removeNonNumeric(phone);
      await updateUserData({
        name: name || undefined,
        documentType: cleanDocument ? documentType : undefined,
        cpf: documentType === 'cpf' && cleanDocument ? cleanDocument : undefined,
        cnpj: documentType === 'cnpj' && cleanDocument ? cleanDocument : undefined,
        phone: cleanPhone || undefined,
      });

      // Atualiza dados locais
      await refetch();

      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Marca todos os campos como tocados
    setTouched(prev => ({ 
      ...prev, 
      currentPassword: true, 
      newPassword: true, 
      confirmPassword: true 
    }));
    
    // Valida todos os campos
    const newPasswordErrors: typeof passwordErrors = {};
    
    if (!currentPassword) {
      newPasswordErrors.currentPassword = 'Senha atual é obrigatória';
    }
    
    const newPasswordError = validatePassword(newPassword, 'newPassword');
    if (newPasswordError) {
      newPasswordErrors.newPassword = newPasswordError;
    }
    
    const confirmPasswordError = validatePassword(confirmPassword, 'confirmPassword');
    if (confirmPasswordError) {
      newPasswordErrors.confirmPassword = confirmPasswordError;
    }
    
    setPasswordErrors(newPasswordErrors);
    
    // Se houver erros, não submete
    if (Object.values(newPasswordErrors).some(err => err !== undefined)) {
      return;
    }
    
    setLoading(true);

    try {

      // Atualiza senha
      await updateUserPassword(currentPassword, newPassword);

      // Limpa campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setPasswordSuccess('Senha atualizada com sucesso!');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: unknown) {
      setPasswordError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Atualize suas informações pessoais e senha
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Formulário de Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>
                Atualize seu nome e documento (CPF/CNPJ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Email (somente leitura) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={handleNameBlur}
                    className={touched.name && errors.name ? 'border-red-500' : ''}
                  />
                  {touched.name && errors.name && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Tipo de Documento */}
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="documentType"
                        value="cpf"
                        checked={documentType === 'cpf'}
                        onChange={(e) => {
                          setDocumentType('cpf');
                          setDocument('');
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">CPF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="documentType"
                        value="cnpj"
                        checked={documentType === 'cnpj'}
                        onChange={(e) => {
                          setDocumentType('cnpj');
                          setDocument('');
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">CNPJ</span>
                    </label>
                  </div>
                </div>

                {/* CPF/CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="document">
                    {documentType === 'cpf' ? 'CPF' : 'CNPJ'}
                  </Label>
                  <Input
                    id="document"
                    type="text"
                    placeholder={
                      documentType === 'cpf' 
                        ? '000.000.000-00' 
                        : '00.000.000/0000-00'
                    }
                    value={document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    onBlur={handleDocumentBlur}
                    maxLength={documentType === 'cpf' ? 14 : 18}
                    className={touched.document && errors.document ? 'border-red-500' : ''}
                  />
                  {touched.document && errors.document && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.document}
                    </p>
                  )}
                  {!errors.document && document && (
                    <p className="text-xs text-muted-foreground">
                      {documentType === 'cpf' ? 'CPF' : 'CNPJ'} válido
                    </p>
                  )}
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={handlePhoneBlur}
                    maxLength={15}
                    className={touched.phone && errors.phone ? 'border-red-500' : ''}
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.phone}
                    </p>
                  )}
                  {!errors.phone && phone && (removeNonNumeric(phone).length === 10 || removeNonNumeric(phone).length === 11) && (
                    <p className="text-xs text-green-600">
                      Telefone válido
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Formulário de Alteração de Senha */}
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Digite sua senha atual e a nova senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (touched.currentPassword) {
                        setPasswordErrors(prev => ({ 
                          ...prev, 
                          currentPassword: e.target.value ? undefined : 'Senha atual é obrigatória' 
                        }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, currentPassword: true }));
                      setPasswordErrors(prev => ({ 
                        ...prev, 
                        currentPassword: currentPassword ? undefined : 'Senha atual é obrigatória' 
                      }));
                    }}
                    className={touched.currentPassword && passwordErrors.currentPassword ? 'border-red-500' : ''}
                  />
                  {touched.currentPassword && passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (touched.newPassword) {
                        const error = validatePassword(e.target.value, 'newPassword');
                        setPasswordErrors(prev => ({ ...prev, newPassword: error }));
                      }
                      // Valida confirmação também se já foi tocada
                      if (touched.confirmPassword) {
                        const confirmError = validatePassword(confirmPassword, 'confirmPassword');
                        setPasswordErrors(prev => ({ ...prev, confirmPassword: confirmError }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, newPassword: true }));
                      const error = validatePassword(newPassword, 'newPassword');
                      setPasswordErrors(prev => ({ ...prev, newPassword: error }));
                      // Revalida confirmação
                      if (touched.confirmPassword) {
                        const confirmError = validatePassword(confirmPassword, 'confirmPassword');
                        setPasswordErrors(prev => ({ ...prev, confirmPassword: confirmError }));
                      }
                    }}
                    className={touched.newPassword && passwordErrors.newPassword ? 'border-red-500' : ''}
                  />
                  {touched.newPassword && passwordErrors.newPassword ? (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordErrors.newPassword}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 6 caracteres
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (touched.confirmPassword) {
                        const error = validatePassword(e.target.value, 'confirmPassword');
                        setPasswordErrors(prev => ({ ...prev, confirmPassword: error }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, confirmPassword: true }));
                      const error = validatePassword(confirmPassword, 'confirmPassword');
                      setPasswordErrors(prev => ({ ...prev, confirmPassword: error }));
                    }}
                    className={touched.confirmPassword && passwordErrors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {touched.confirmPassword && passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {passwordSuccess}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Atualizando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

