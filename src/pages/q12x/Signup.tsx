import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';

const Q12xSignup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      showError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
      showError("La création du compte a échoué. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('merchant_accounts').insert({
      user_id: signUpData.user.id,
      name: name,
    });

    if (insertError) {
      showError(`Erreur lors de la création du profil marchand : ${insertError.message}`);
    } else {
      showSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      navigate('/login');
    }
    
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4 relative"
      style={{ backgroundImage: "url('/q12x-background.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-md bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 space-y-6 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-mono">Q12x</h1>
          <p className="text-gray-300">Créez votre compte marchand.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du commerce</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400" />
          </div>
          <div>
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400" />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-gray-700/50 border-gray-600 text-white" />
          </div>
          <div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Création...' : "S'inscrire"}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-300">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Q12xSignup;