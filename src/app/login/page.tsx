'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  translateFirebaseError, 
  validateCPF, 
  validateCNPJ, 
  formatCPF, 
  formatCNPJ,
  validatePhone,
  formatPhone,
  applyPhoneMask,
  removeNonNumeric 
} from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Campos de CPF/CNPJ (apenas no cadastro)
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  const [document, setDocument] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Estados de validação (mensagens de erro por campo)
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    document?: string;
    phone?: string;
  }>({});
  
  // Estados para controlar quando validar (após o usuário interagir)
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
    name?: boolean;
    document?: boolean;
    phone?: boolean;
  }>({});
  
  const { login, signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Validação de email
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email é obrigatório';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido';
    }
    return undefined;
  };

  // Validação de senha
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Senha é obrigatória';
    }
    if (password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    return undefined;
  };

  // Validação do documento
  const validateDocument = (doc: string, type: 'cpf' | 'cnpj'): string | undefined => {
    const cleanDoc = removeNonNumeric(doc);
    
    if (!cleanDoc) {
      return 'CPF ou CNPJ é obrigatório';
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

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const error = validatePassword(password);
    setErrors(prev => ({ ...prev, password: error }));
  };

  const handleDocumentChange = (value: string) => {
    // Remove caracteres não numéricos
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
    
    // Formata o documento ao sair do campo
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Marca todos os campos como tocados para mostrar erros
    const fieldsToTouch: typeof touched = { email: true, password: true };
    if (isSignUp) {
      fieldsToTouch.name = true;
      fieldsToTouch.document = true;
      fieldsToTouch.phone = true;
    }
    setTouched(fieldsToTouch);
    
    // Valida todos os campos
    const newErrors: typeof errors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    if (isSignUp) {
      if (name.trim().length > 0 && name.trim().length < 3) {
        newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      }
      
      const cleanDocument = removeNonNumeric(document);
      const docError = validateDocument(document, documentType);
      if (docError) newErrors.document = docError;
      
      const phoneError = validatePhoneField(phone);
      if (phoneError) newErrors.phone = phoneError;
    }
    
    setErrors(newErrors);
    
    // Se houver erros, não submete
    if (Object.values(newErrors).some(err => err !== undefined)) {
      return;
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        const cleanDocument = removeNonNumeric(document);
        
        // Chama signup com os dados adicionais
        const cleanPhone = removeNonNumeric(phone);
        await signup(email, password, {
          name: name || undefined,
          documentType,
          cpf: documentType === 'cpf' ? cleanDocument : undefined,
          cnpj: documentType === 'cnpj' ? cleanDocument : undefined,
          phone: cleanPhone || undefined,
        });
      } else {
        await login(email, password);
      }
      router.push('/');
    } catch (err: unknown) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">midiasbrasil</CardTitle>
          <CardDescription>
            {isSignUp ? 'Crie sua conta' : 'Entre na sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                className={touched.email && errors.email ? 'border-red-500' : ''}
                required
              />
              {touched.email && errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
            
            {isSignUp && (
              <>
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
                    required={isSignUp}
                  />
                  {touched.document && errors.document && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.document}
                    </p>
                  )}
                  {!errors.document && document && removeNonNumeric(document).length === (documentType === 'cpf' ? 11 : 14) && (
                    <p className="text-xs text-green-600">
                      {documentType === 'cpf' ? 'CPF' : 'CNPJ'} válido
                    </p>
                  )}
                </div>
                
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
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={handlePasswordBlur}
                className={touched.password && errors.password ? 'border-red-500' : ''}
                required
              />
              {touched.password && errors.password ? (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </div>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                // Limpa campos ao alternar entre login e cadastro
                if (!isSignUp) {
                  setDocument('');
                  setName('');
                  setPhone('');
                  setDocumentType('cpf');
                }
              }}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? 'Já tem uma conta? Entre'
                : 'Não tem uma conta? Criar conta'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Voltar para a página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

