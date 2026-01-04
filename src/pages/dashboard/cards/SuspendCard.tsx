import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card as UiCard, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Ban, RotateCcw, ShieldAlert } from 'lucide-react';

const SuspendCard = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [card, setCard] = useState<any>(null);
  const [reason, setReason] = useState<string>('lost');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reissue, setReissue] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!cardId) return;
      const { data, error } = await supabase
        .from('cards')
        .select('id, status, user_initials, issuer_id, random_letters, unique_identifier, check_digit, expires_at, card_program_id')
        .eq('id', cardId)
        .single();
      if (error) {
        showError(error.message);
        return;
      }
      setCard(data);
      const { data: { user } } = await supabase.auth.getUser();
      setReporterEmail(user?.email || '');
    };
    load();
  }, [cardId]);

  const handleSubmit = async () => {
    if (!cardId) return;
    if (!description || description.trim().length < 10) {
      showError('Veuillez décrire la situation (au moins 10 caractères).');
      return;
    }
    setSubmitting(true);
    try {
      const action = (reason === 'lost' || reason === 'stolen') && reissue ? 'reissue' : 'block';
      const { data, error } = await supabase.functions.invoke('suspend-card', {
        body: {
          action,
          card_id: cardId,
          reason,
          description,
          reporter_email: reporterEmail,
        }
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        if (action === 'reissue') {
          showSuccess('Nouveaux numéros de carte attribués avec succès.');
        } else {
          showSuccess('Carte bloquée avec succès.');
        }
        navigate('/dashboard/cards');
      } else {
        throw new Error(data?.error || 'Action échouée');
      }
    } catch (e: any) {
      showError(e.message || 'Erreur lors de la soumission du rapport.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!card) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/cards" className="text-sm text-muted-foreground hover:text-primary flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des cartes
        </Link>
        <UiCard><CardContent>Chargement...</CardContent></UiCard>
      </div>
    );
  }

  const currentNumber = `${card.user_initials} ${card.issuer_id} ${card.random_letters} ${card.unique_identifier} ${card.check_digit}`;

  const isLostOrStolen = reason === 'lost' || reason === 'stolen';

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/dashboard/cards" className="text-sm text-muted-foreground hover:text-primary flex items-center">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des cartes
      </Link>

      <UiCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Rapport de suspension
          </CardTitle>
          <CardDescription>
            Remplissez ce formulaire pour bloquer la carte ou, s’il s’agit d’une perte/vol, réémettre de nouveaux numéros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Carte actuelle</Label>
            <div className="flex items-center justify-between bg-muted p-3 rounded">
              <span className="font-mono">{currentNumber}</span>
              <Badge variant={card.status === 'active' ? 'default' : 'destructive'}>{card.status}</Badge>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Raison</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Choisir une raison" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lost">Carte perdue</SelectItem>
                <SelectItem value="stolen">Carte volée</SelectItem>
                <SelectItem value="fraud">Fraude soupçonnée</SelectItem>
                <SelectItem value="user_request">Demande utilisateur</SelectItem>
                <SelectItem value="other">Autre motif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLostOrStolen && (
            <Alert>
              <AlertTitle>Nouveaux numéros recommandés</AlertTitle>
              <AlertDescription>
                Pour une carte perdue/volée, la meilleure pratique est de réémettre un nouveau numéro. Cela conserve le BIN et applique Luhn alphanumérique.
              </AlertDescription>
            </Alert>
          )}

          {isLostOrStolen && (
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded">
              <div>
                <p className="text-sm font-medium">Réémettre de nouveaux numéros maintenant</p>
                <p className="text-xs text-muted-foreground">Nous regénérerons le numéro en respectant le BIN et la validation Luhn.</p>
              </div>
              <Button variant={reissue ? 'default' : 'outline'} onClick={() => setReissue(!reissue)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {reissue ? 'Réémettre activé' : 'Réémettre désactivé'}
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Rapport (description)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Expliquez la situation. Qui, quand, circonstances..." rows={5} />
          </div>

          <div className="grid gap-2">
            <Label>Courriel du rapporteur</Label>
            <Input type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="email@exemple.com" />
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Button variant="ghost" asChild><Link to="/dashboard/cards">Annuler</Link></Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {isLostOrStolen && reissue ? <RotateCcw className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4" />}
              {submitting ? 'Traitement...' : (isLostOrStolen && reissue ? 'Réémettre' : 'Bloquer')}
            </Button>
          </div>
        </CardContent>
      </UiCard>
    </div>
  );
};

export default SuspendCard;