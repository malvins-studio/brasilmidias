"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/contexts/CampaignContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Calendar, ShoppingCart, Loader2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CampaignCard() {
  const {
    activeCampaign,
    campaignMedias,
    getCampaignTotalPrice,
    loading,
    deleteCampaign,
  } = useCampaign();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeCampaign) {
    return null;
  }

  const mediasCount = campaignMedias.filter(
    (cm) => cm.campaignId === activeCampaign.id
  ).length;
  const totalPrice = getCampaignTotalPrice(activeCampaign.id);
  const hasMedias = mediasCount > 0;

  const handleGoToPayment = () => {
    // Redireciona para uma página de checkout da campanha
    router.push(`/campaigns/${activeCampaign.id}/checkout`);
  };

  const handleDelete = async () => {
    if (!activeCampaign) return;

    try {
      setDeleting(true);
      await deleteCampaign(activeCampaign.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      alert("Erro ao excluir campanha. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="max-w-sm gap-0 py-3">
        <CardHeader className="px-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold leading-tight">
              {activeCampaign.name}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {activeCampaign.status !== "draft" && (
                <Badge variant="outline" className="text-xs">
                  {activeCampaign.status === "pending_payment" &&
                    "Aguardando Pagamento"}
                  {activeCampaign.status === "paid" && "Paga"}
                  {activeCampaign.status === "completed" && "Concluída"}
                  {activeCampaign.status === "cancelled" && "Cancelada"}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-1 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(activeCampaign.createdAt.toDate(), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Mídias:</span>
            <span className="font-semibold">{mediasCount}</span>
          </div>

          {hasMedias && (
            <>
              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <span className="font-medium">Total:</span>
                <span className="font-bold">{formatCurrency(totalPrice)}</span>
              </div>

              <Button
                onClick={handleGoToPayment}
                className="w-full text-xs h-8"
                size="sm"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Ir para Pagamento
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha &quot;
              {activeCampaign.name}&quot;? Esta ação não pode ser desfeita e
              todas as mídias associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
