import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula o preço total baseado no tipo de preço e período selecionado
 * @param pricePerDay Preço por dia
 * @param pricePerWeek Preço por semana (opcional)
 * @param pricePerMonth Preço por mês (opcional)
 * @param priceType Tipo de preço: 'day', 'week' ou 'month'
 * @param startDate Data de início
 * @param endDate Data de fim
 * @returns Preço total calculado
 */
export function calculatePrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date,
  priceType: 'day' | 'week' | 'month' = 'day',
  pricePerWeek?: number,
  pricePerMonth?: number
): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Se for por dia, calcula normalmente
  if (priceType === 'day') {
    return pricePerDay * diffDays;
  }
  
  // Se for por semana
  if (priceType === 'week' && pricePerWeek) {
    const weeks = Math.ceil(diffDays / 7);
    return pricePerWeek * weeks;
  }
  
  // Se for por mês
  if (priceType === 'month' && pricePerMonth) {
    // Calcula meses completos + dias restantes
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let months = 0;
    let currentDate = new Date(start);
    
    while (currentDate < end) {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      if (nextMonth <= end) {
        months++;
        currentDate = nextMonth;
      } else {
        break;
      }
    }
    
    // Se sobraram dias, calcula proporcionalmente ou usa preço por dia
    const remainingDays = Math.ceil((end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (remainingDays > 0) {
      // Se sobraram mais de 7 dias, adiciona mais um mês, senão calcula por dia
      if (remainingDays >= 7) {
        months++;
      } else {
        return (pricePerMonth * months) + (pricePerDay * remainingDays);
      }
    }
    
    return pricePerMonth * months;
  }
  
  // Fallback: calcula por dia se o tipo não for suportado ou valores não estiverem disponíveis
  return pricePerDay * diffDays;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Remove caracteres não numéricos de uma string
 */
export function removeNonNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida CPF
 * @param cpf CPF sem formatação (apenas números)
 * @returns true se o CPF é válido
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = removeNonNumeric(cpf);
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

/**
 * Valida CNPJ
 * @param cnpj CNPJ sem formatação (apenas números)
 * @returns true se o CNPJ é válido
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = removeNonNumeric(cnpj);
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Formata CPF (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = removeNonNumeric(cpf);
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = removeNonNumeric(cnpj);
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Valida telefone brasileiro
 * Aceita formatos: (00) 00000-0000 ou (00) 0000-0000
 * @param phone Telefone sem formatação (apenas números)
 * @returns true se o telefone é válido
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = removeNonNumeric(phone);
  
  // Telefone deve ter 10 ou 11 dígitos (com DDD)
  // 10 dígitos: (00) 0000-0000 (telefone fixo)
  // 11 dígitos: (00) 00000-0000 (celular)
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
    return false;
  }
  
  // DDD deve estar entre 11 e 99
  const ddd = parseInt(cleanPhone.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  
  return true;
}

/**
 * Aplica máscara de telefone brasileiro em tempo real
 * Adapta automaticamente para celular (11 dígitos) ou fixo (10 dígitos)
 * @param phone Telefone sendo digitado
 * @returns Telefone com máscara aplicada
 */
export function applyPhoneMask(phone: string): string {
  const cleanPhone = removeNonNumeric(phone);
  
  // Limita a 11 dígitos (máximo para celular)
  const limitedPhone = cleanPhone.slice(0, 11);
  
  if (limitedPhone.length <= 2) {
    // Apenas DDD: (00
    return limitedPhone.length > 0 ? `(${limitedPhone}` : '';
  } else if (limitedPhone.length <= 6) {
    // DDD + início do número: (00) 0000
    return limitedPhone.replace(/(\d{2})(\d+)/, '($1) $2');
  } else if (limitedPhone.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return limitedPhone.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  } else {
    // Celular: (00) 00000-0000
    return limitedPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
}

/**
 * Formata telefone brasileiro (00) 00000-0000 ou (00) 0000-0000
 * Usado para formatação final após validação
 */
export function formatPhone(phone: string): string {
  const cleanPhone = removeNonNumeric(phone);
  
  if (cleanPhone.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    // Celular: (00) 00000-0000
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return cleanPhone;
}

/**
 * Traduz códigos de erro do Firebase Auth para português
 * @param error Erro do Firebase ou objeto com código/mensagem
 * @returns Mensagem de erro em português
 */
export function translateFirebaseError(error: unknown): string {
  // Se já for uma string, retorna como está
  if (typeof error === 'string') {
    return error;
  }

  // Tenta extrair o código do erro
  const firebaseError = error as { code?: string; message?: string };
  const errorCode = firebaseError?.code || '';
  const errorMessage = firebaseError?.message || '';

  // Mapeamento de códigos de erro do Firebase Auth para português
  const errorMessages: Record<string, string> = {
    // Erros de autenticação
    'auth/invalid-credential': 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
    'auth/wrong-password': 'Senha incorreta. Tente novamente.',
    'auth/user-not-found': 'Usuário não encontrado. Verifique o email ou crie uma nova conta.',
    'auth/email-already-in-use': 'Este email já está em uso. Tente fazer login ou use outro email.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
    'auth/invalid-email': 'Email inválido. Verifique o formato do email.',
    'auth/operation-not-allowed': 'Operação não permitida. Entre em contato com o suporte.',
    'auth/user-disabled': 'Esta conta foi desabilitada. Entre em contato com o suporte.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet e tente novamente.',
    'auth/popup-closed-by-user': 'Login cancelado. Tente novamente.',
    'auth/cancelled-popup-request': 'Login cancelado. Tente novamente.',
    'auth/popup-blocked': 'Popup bloqueado. Permita popups para este site e tente novamente.',
    'auth/account-exists-with-different-credential': 'Já existe uma conta com este email usando outro método de login.',
    'auth/requires-recent-login': 'Por segurança, faça login novamente antes de realizar esta ação.',
    'auth/invalid-verification-code': 'Código de verificação inválido.',
    'auth/invalid-verification-id': 'ID de verificação inválido.',
    'auth/missing-email': 'Email é obrigatório.',
    'auth/missing-password': 'Senha é obrigatória.',
    'auth/invalid-action-code': 'Código de ação inválido ou expirado.',
    'auth/expired-action-code': 'Código de ação expirado. Solicite um novo.',
  };

  // Retorna mensagem traduzida se encontrar o código
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Se não encontrar o código, tenta usar a mensagem original
  if (errorMessage) {
    return errorMessage;
  }

  // Fallback genérico
  return 'Ocorreu um erro. Tente novamente.';
}
