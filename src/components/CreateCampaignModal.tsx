'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCampaign } from '@/contexts/CampaignContext';
import { Loader2, AlertCircle } from 'lucide-react';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const { createCampaign, activeCampaign } = useCampaign();
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica se já existe uma campanha ativa
    if (activeCampaign) {
      setError('Você já possui uma campanha ativa. Por favor, exclua a campanha atual antes de criar uma nova.');
      return;
    }
    
    if (!campaignName.trim()) {
      setError('Nome da campanha é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await createCampaign(campaignName.trim());
      
      setCampaignName('');
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar campanha';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCampaignName('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Dê um nome para sua campanha. Você poderá adicionar mídias depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Nome da Campanha *</Label>
              <Input
                id="campaignName"
                type="text"
                placeholder="Ex: Campanha Verão 2025"
                value={campaignName}
                onChange={(e) => {
                  setCampaignName(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Campanha'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

