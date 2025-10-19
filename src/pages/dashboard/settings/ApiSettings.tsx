import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Copy, Check, Trash2, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const ApiSettings = () => {
  const { t } = useTranslation('dashboard');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('api_keys').select('id, key_prefix, created_at, last_used_at');
    if (error) {
      showError(error.message);
    } else {
      setKeys(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key');
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }
      setNewKey(data.apiKey);
      fetchKeys(); // Refresh the list
    } catch (err) {
      showError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const closeDialog = () => {
    setNewKey(null);
    setIsCopied(false);
  };

  const htmlExample = `
<!-- 1. Créez un conteneur pour le formulaire -->
<div id="inglis-dominium-form"></div>

<!-- 2. Créez un champ caché pour stocker le jeton -->
<input type="hidden" id="card-token" name="card_token" />

<!-- 3. Intégrez l'iframe -->
<script>
  const iframe = document.createElement('iframe');
  iframe.src = 'https://www.inglisdominion.ca/hosted-form';
  iframe.style.width = '100%';
  iframe.style.height = '250px';
  iframe.style.border = 'none';
  document.getElementById('inglis-dominium-form').appendChild(iframe);
</script>
  `;

  const jsExample = `
// 4. Écoutez les messages de l'iframe pour recevoir le jeton
window.addEventListener('message', (event) => {
  // Sécurité : Vérifiez toujours l'origine
  if (event.origin !== 'https://www.inglisdominion.ca') {
    return;
  }

  const data = event.data;

  if (data.type === 'inglis-dominium-token' && data.token) {
    console.log('Token reçu:', data.token);
    
    // Stockez le jeton dans votre champ caché
    document.getElementById('card-token').value = data.token;

    // Vous pouvez maintenant soumettre votre formulaire à votre propre backend
    // votreFormulaire.submit();

  } else if (data.type === 'inglis-dominium-error') {
    console.error('Erreur du formulaire:', data.error);
    // Affichez une erreur à l'utilisateur
  }
});
  `;

  const tsExample = `
// Sur votre serveur backend
const apiKey = 'sk_live_...';
const apiUrl = 'https://api.inglisdominion.ca/api-v1-transactions';

// Le jeton reçu de votre frontend
const cardTokenFromClient = 'tok_...';

const transactionData = {
  card_token: cardTokenFromClient,
  amount: 42.50,
  description: 'Achat chez Le Commerçant Inc.',
  capture_delay_hours: 0
};

fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(transactionData)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
  `;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('settings.apiKeys')}</h1>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('settings.apiKeysList')}</CardTitle>
            <CardDescription>{t('settings.apiKeysListDesc')}</CardDescription>
          </div>
          <Button onClick={handleGenerateKey} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {t('settings.generateKey')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.keyPrefix')}</TableHead>
                <TableHead>{t('settings.createdAt')}</TableHead>
                <TableHead>{t('settings.lastUsed')}</TableHead>
                <TableHead className="text-right">{t('settings.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">{t('users.loading')}</TableCell></TableRow>
              ) : keys.length > 0 ? (
                keys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono">{key.key_prefix}...</TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Jamais'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">{t('settings.noKeys')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.apiUsageTitle')}</CardTitle>
          <CardDescription>{t('settings.apiUsageDescSecure')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="frontend">
            <TabsList>
              <TabsTrigger value="frontend">{t('settings.frontendIntegrationTitle')}</TabsTrigger>
              <TabsTrigger value="backend">{t('settings.backendIntegrationTitle')}</TabsTrigger>
            </TabsList>
            <TabsContent value="frontend" className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.frontendIntegrationDesc')}</p>
              <h4 className="font-semibold">{t('settings.frontendHtmlExample')}</h4>
              <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto"><code>{htmlExample}</code></pre>
              <h4 className="font-semibold">{t('settings.frontendJsExample')}</h4>
              <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto"><code>{jsExample}</code></pre>
            </TabsContent>
            <TabsContent value="backend" className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.backendIntegrationDesc')}</p>
              <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto"><code>{tsExample}</code></pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!newKey} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.newKeyGenerated')}</DialogTitle>
            <DialogDescription>{t('settings.newKeyDesc')}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input value={newKey || ''} readOnly />
            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => copyToClipboard(newKey || '')}>
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={closeDialog}>{t('settings.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiSettings;