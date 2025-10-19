import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Cette page est conçue pour être utilisée dans un iframe.
const HostedPaymentForm = () => {
  const [cardData, setCardData] = useState({
    initials: '',
    issuer_id: '',
    random_letters: '',
    unique_identifier: '',
    check_digit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCardData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbWNsbmJleXdxb3N1aGlqaGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzEzNTEsImV4cCI6MjA3NDY0NzM1MX0.zISz01Dxi46WtrdOKwFcxxHy7ypLJeD95HH4gDW4Ob8';
      const tokenizeUrl = 'https://bsmclnbeywqosuhijhae.supabase.co/functions/v1/api-v1-tokenize-card';

      const response = await fetch(tokenizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ card_number: cardData })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur de tokenisation.');
      }

      // Envoyer le token à la page parente (le site du marchand)
      window.parent.postMessage({
        type: 'inglis-dominium-token',
        token: result.token
      }, '*'); // Pour la production, il est recommandé de spécifier l'origine du marchand

    } catch (err) {
      setError(err.message);
      // Envoyer l'erreur à la page parente
      window.parent.postMessage({
        type: 'inglis-dominium-error',
        error: err.message
      }, '*');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-transparent">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-1">
            <Label htmlFor="initials">Init.</Label>
            <Input id="initials" value={cardData.initials} onChange={handleChange} maxLength={2} required />
          </div>
          <div className="col-span-2">
            <Label htmlFor="issuer_id">Émetteur</Label>
            <Input id="issuer_id" value={cardData.issuer_id} onChange={handleChange} maxLength={6} required />
          </div>
          <div className="col-span-1">
            <Label htmlFor="random_letters">Rand.</Label>
            <Input id="random_letters" value={cardData.random_letters} onChange={handleChange} maxLength={2} required />
          </div>
           <div className="col-span-1">
            <Label htmlFor="check_digit">Ctrl.</Label>
            <Input id="check_digit" value={cardData.check_digit} onChange={handleChange} maxLength={1} required />
          </div>
        </div>
        <div>
          <Label htmlFor="unique_identifier">Identifiant Unique</Label>
          <Input id="unique_identifier" value={cardData.unique_identifier} onChange={handleChange} maxLength={7} required />
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Valider la carte
        </Button>
      </form>
    </div>
  );
};

export default HostedPaymentForm;