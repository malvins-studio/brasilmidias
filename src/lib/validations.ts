import { z } from 'zod';
import { validateCPF, validateCNPJ, validatePhone, removeNonNumeric } from './utils';

// Schema para login
export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória').min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

// Schema para cadastro
export const signupSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória').min(6, 'A senha deve ter pelo menos 6 caracteres'),
  firstName: z.string().min(1, 'Primeiro nome é obrigatório').min(2, 'Primeiro nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(1, 'Último nome é obrigatório').min(2, 'Último nome deve ter pelo menos 2 caracteres'),
  documentType: z.enum(['cpf', 'cnpj']),
  document: z.string().min(1, 'CPF ou CNPJ é obrigatório').refine(
    (val) => {
      const cleanDoc = removeNonNumeric(val);
      return cleanDoc.length > 0;
    },
    { message: 'CPF ou CNPJ é obrigatório' }
  ),
  phone: z.string().min(1, 'Telefone é obrigatório').refine(
    (val) => {
      const cleanPhone = removeNonNumeric(val);
      if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
        return false;
      }
      return validatePhone(cleanPhone);
    },
    { message: 'Telefone inválido. Deve ter 10 ou 11 dígitos (com DDD)' }
  ),
}).refine(
  (data) => {
    const cleanDoc = removeNonNumeric(data.document);
    
    if (data.documentType === 'cpf') {
      if (cleanDoc.length !== 11) {
        return false;
      }
      return validateCPF(cleanDoc);
    } else {
      if (cleanDoc.length !== 14) {
        return false;
      }
      return validateCNPJ(cleanDoc);
    }
  },
  {
    message: 'Documento inválido',
    path: ['document'], // Isso faz o erro aparecer no campo document
  }
);

// Schema para atualização de perfil
export const profileSchema = z.object({
  firstName: z.string().min(1, 'Primeiro nome é obrigatório').min(2, 'Primeiro nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(1, 'Último nome é obrigatório').min(2, 'Último nome deve ter pelo menos 2 caracteres'),
  documentType: z.enum(['cpf', 'cnpj']),
  document: z.string().min(1, 'CPF ou CNPJ é obrigatório').refine(
    (val) => {
      const cleanDoc = removeNonNumeric(val);
      return cleanDoc.length > 0;
    },
    { message: 'CPF ou CNPJ é obrigatório' }
  ),
  phone: z.string().min(1, 'Telefone é obrigatório').refine(
    (val) => {
      const cleanPhone = removeNonNumeric(val);
      if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
        return false;
      }
      return validatePhone(cleanPhone);
    },
    { message: 'Telefone inválido. Deve ter 10 ou 11 dígitos (com DDD)' }
  ),
}).refine(
  (data) => {
    const cleanDoc = removeNonNumeric(data.document);
    
    if (data.documentType === 'cpf') {
      if (cleanDoc.length !== 11) {
        return false;
      }
      return validateCPF(cleanDoc);
    } else {
      if (cleanDoc.length !== 14) {
        return false;
      }
      return validateCNPJ(cleanDoc);
    }
  },
  {
    message: 'Documento inválido',
    path: ['document'], // Isso faz o erro aparecer no campo document
  }
);

// Schema para alteração de senha
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(1, 'Nova senha é obrigatória').min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'A nova senha deve ser diferente da senha atual',
  path: ['newPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
