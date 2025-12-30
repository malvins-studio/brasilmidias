'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  translateFirebaseError, 
  formatCPF, 
  formatCNPJ,
  formatPhone,
  applyPhoneMask,
  removeNonNumeric 
} from '@/lib/utils';
import { emailSchema, loginSchema, signupSchema, type EmailFormData, type LoginFormData, type SignupFormData } from '@/lib/validations';
import { AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Step = 'email' | 'login' | 'signup';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  
  const { login, signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Form para verificação de email (step 1)
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form para login (step 2)
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Form para cadastro
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      documentType: 'cpf',
      document: '',
      phone: '',
    },
  });

  // Step 1: Verificar email
  const onSubmitEmail = async (data: EmailFormData) => {
    setError('');
    setLoading(true);
    setEmail(data.email);

    try {
      // Chama a API do backend para verificar o email
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao verificar email');
      }

      const result = await response.json();
      const { hasEmail, methods } = result;

      if (!hasEmail || methods.length === 0) {
        // Email não existe ou não tem métodos, vai para cadastro
        signupForm.reset();
        signupForm.setValue('email', data.email);
        signupForm.setValue('documentType', 'cpf');
        setDocumentType('cpf');
        setStep('signup');
      } else {
        // Verifica qual método de login está disponível
        const hasPassword = methods.includes('password');
        const hasGoogle = methods.includes('google.com');

        if (hasPassword) {
          // Tem senha, vai para login
          loginForm.reset();
          loginForm.setValue('email', data.email);
          setStep('login');
        } else if (hasGoogle) {
          // Só tem Google, informa ao usuário
          setError('Este email foi cadastrado com Google. Por favor, use o botão "Continuar com Google" para fazer login.');
          // Mantém no step de email para o usuário usar o botão do Google
        } else {
          // Método desconhecido, vai para cadastro por segurança
          signupForm.reset();
          signupForm.setValue('email', data.email);
          signupForm.setValue('documentType', 'cpf');
          setDocumentType('cpf');
          setStep('signup');
        }
      }
    } catch (err: unknown) {
      console.error('Error checking email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Login
  const onSubmitLogin = async (data: LoginFormData) => {
    setError('');
    setLoading(true);

    try {
      await login(data.email, data.password);
      router.push('/');
    } catch (err: unknown) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Cadastro
  const onSubmitSignup = async (data: SignupFormData) => {
    setError('');
    setLoading(true);

    try {
      const cleanPhone = removeNonNumeric(data.phone);
      const cleanDocument = removeNonNumeric(data.document);
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
      
      await signup(data.email, data.password, {
        name: fullName,
        documentType: data.documentType,
        cpf: data.documentType === 'cpf' ? cleanDocument : undefined,
        cnpj: data.documentType === 'cnpj' ? cleanDocument : undefined,
        phone: cleanPhone,
      });
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

  const handleBackToEmail = () => {
    setStep('email');
    setError('');
    setEmail('');
    loginForm.reset();
    signupForm.reset();
    setDocumentType('cpf');
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Entre ou cadastre-se';
      case 'login':
        return 'Entre na sua conta';
      case 'signup':
        return 'Crie sua conta';
      default:
        return 'midiasbrasil';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email':
        return 'Digite seu email para continuar';
      case 'login':
        return 'Digite sua senha para entrar';
      case 'signup':
        return 'Preencha seus dados para criar sua conta';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">midiasbrasil</CardTitle>
          <CardDescription>
            {getStepTitle()}
          </CardDescription>
          {step !== 'email' && (
            <p className="text-sm text-muted-foreground mt-1">
              {getStepDescription()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...emailForm.register('email')}
                  className={emailForm.formState.errors.email ? 'border-red-500' : ''}
                  autoFocus
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Continuar'}
              </Button>
            </form>
          )}

          {/* Step 2: Login */}
          {step === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                    className={`${loginForm.formState.errors.password ? 'border-red-500' : ''} pr-10`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password ? (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {loginForm.formState.errors.password.message}
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
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Cadastro */}
          {step === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSubmitSignup)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              {/* Primeiro e Último Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Primeiro Nome *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Primeiro nome"
                    {...signupForm.register('firstName')}
                    className={signupForm.formState.errors.firstName ? 'border-red-500' : ''}
                    autoFocus
                  />
                  {signupForm.formState.errors.firstName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Último Nome *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Último nome"
                    {...signupForm.register('lastName')}
                    className={signupForm.formState.errors.lastName ? 'border-red-500' : ''}
                  />
                  {signupForm.formState.errors.lastName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
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
                      onChange={() => {
                        setDocumentType('cpf');
                        signupForm.setValue('documentType', 'cpf');
                        signupForm.setValue('document', '');
                        signupForm.clearErrors('document');
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
                      onChange={() => {
                        setDocumentType('cnpj');
                        signupForm.setValue('documentType', 'cnpj');
                        signupForm.setValue('document', '');
                        signupForm.clearErrors('document');
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
                  {documentType === 'cpf' ? 'CPF' : 'CNPJ'} *
                </Label>
                <Controller
                  name="document"
                  control={signupForm.control}
                  render={({ field }) => (
                    <Input
                      id="document"
                      type="text"
                      placeholder={
                        documentType === 'cpf' 
                          ? '000.000.000-00' 
                          : '00.000.000/0000-00'
                      }
                      maxLength={documentType === 'cpf' ? 14 : 18}
                      value={field.value}
                      onChange={(e) => {
                        const cleanValue = removeNonNumeric(e.target.value);
                        field.onChange(cleanValue);
                      }}
                      onBlur={(e) => {
                        const cleanDoc = removeNonNumeric(e.target.value);
                        if (documentType === 'cpf' && cleanDoc.length === 11) {
                          signupForm.setValue('document', formatCPF(cleanDoc), { shouldValidate: true });
                        } else if (documentType === 'cnpj' && cleanDoc.length === 14) {
                          signupForm.setValue('document', formatCNPJ(cleanDoc), { shouldValidate: true });
                        }
                        field.onBlur();
                      }}
                      className={signupForm.formState.errors.document ? 'border-red-500' : ''}
                    />
                  )}
                />
                {signupForm.formState.errors.document && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupForm.formState.errors.document.message}
                  </p>
                )}
                {!signupForm.formState.errors.document && signupForm.watch('document') && removeNonNumeric(signupForm.watch('document')).length === (documentType === 'cpf' ? 11 : 14) && (
                  <p className="text-xs text-green-600">
                    {documentType === 'cpf' ? 'CPF' : 'CNPJ'} válido
                  </p>
                )}
              </div>
              
              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Controller
                  name="phone"
                  control={signupForm.control}
                  render={({ field }) => (
                    <Input
                      id="phone"
                      type="text"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      value={field.value}
                      onChange={(e) => {
                        const maskedValue = applyPhoneMask(e.target.value);
                        field.onChange(maskedValue);
                      }}
                      onBlur={(e) => {
                        const cleanPhone = removeNonNumeric(e.target.value);
                        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                          signupForm.setValue('phone', formatPhone(cleanPhone), { shouldValidate: true });
                        }
                        field.onBlur();
                      }}
                      className={signupForm.formState.errors.phone ? 'border-red-500' : ''}
                    />
                  )}
                />
                {signupForm.formState.errors.phone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupForm.formState.errors.phone.message}
                  </p>
                )}
                {!signupForm.formState.errors.phone && signupForm.watch('phone') && (removeNonNumeric(signupForm.watch('phone')).length === 10 || removeNonNumeric(signupForm.watch('phone')).length === 11) && (
                  <p className="text-xs text-green-600">
                    Telefone válido
                  </p>
                )}
              </div>
              
              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...signupForm.register('password')}
                    className={`${signupForm.formState.errors.password ? 'border-red-500' : ''} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {signupForm.formState.errors.password ? (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupForm.formState.errors.password.message}
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
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar conta'}
                </Button>
              </div>
            </form>
          )}

          {/* Google Login - sempre disponível */}
          {step === 'email' && (
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
          )}

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
