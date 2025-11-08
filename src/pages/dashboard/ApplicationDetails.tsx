import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, CreditCard, FileText, DollarSign, Briefcase, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/utils/toast';

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('onboarding_applications')
        .select(`
          *,
          profiles(*),
          card_programs(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        showError("Demande non trouvée.");
        navigate('/dashboard/applications');
      } else {
        setApplication(data);
      }
      setLoading(false);
    };
    fetchApplication();
  }, [id, navigate]);

  const handleStatusChange = async (newStatus: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('onboarding_applications')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;

      // If approved, also update the profile status
      if (newStatus === 'approved') {
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', application.profile_id);
      }

      showSuccess(`Demande ${newStatus === 'approved' ? 'approuvée' : 'rejetée'}.`);
      setApplication({ ...application, status: newStatus });
    } catch (err) {
      showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (!application) return null;

  const profile = application.profiles;
  const program = application.card_programs;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/applications" className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste des demandes
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Demande d'Intégration</h1>
          <p className="text-muted-foreground">Soumise le {new Date(application.created_at).toLocaleString('fr-CA')}</p>
        </div>
        {application.status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => handleStatusChange('rejected')} disabled={processing}>
              <X className="mr-2 h-4 w-4" /> Rejeter
            </Button>
            <Button onClick={() => handleStatusChange('approved')} disabled={processing}>
              <Check className="mr-2 h-4 w-4" /> Approuver
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Informations Personnelles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Nom</p><p>{profile.full_name}</p></div>
              <div><p className="text-sm text-muted-foreground">Date de naissance</p><p>{new Date(profile.dob).toLocaleDateString('fr-CA')}</p></div>
              <div><p className="text-sm text-muted-foreground">Email</p><p>{profile.email}</p></div>
              <div><p className="text-sm text-muted-foreground">Téléphone</p><p>{profile.phone}</p></div>
              <div className="col-span-2"><p className="text-sm text-muted-foreground">Adresse</p><p>{`${profile.address.street}, ${profile.address.city}, ${profile.address.province} ${profile.address.postalCode}`}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Informations Financières</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Statut d'emploi</p><p>{application.employment_status}</p></div>
              <div><p className="text-sm text-muted-foreground">Employeur</p><p>{application.employer || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground">Revenu annuel</p><p>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(application.annual_income)}</p></div>
              <div><p className="text-sm text-muted-foreground">Revenu T4</p><p>{application.t4_income ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(application.t4_income) : 'N/A'}</p></div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Produit Demandé</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{program.program_name}</p>
              <p className="text-sm text-muted-foreground capitalize">{program.card_type}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Vérification de Crédit</CardTitle></CardHeader>
            <CardContent>
              <p>Statut: <Badge>{application.credit_bureau_verification_status}</Badge></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;