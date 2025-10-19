import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Copy, Check, Trash2, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
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

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const closeDialog = () => {
    setNewKey(null);
    setIsCopied(false);
  };

  const tsExample = `
const apiKey = 'sk_live_...';
const apiUrl = 'https://bsmclnbeywqosuhijhae.supabase.co/functions/v1/api-v1-transactions';

const transactionData = {
  card_number: {
    initials: 'LT',
    issuer_id: '000000',
    random_letters: 'QZ',
    unique_identifier: '0000000',
    check_digit: 7
  },
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

  const phpExample = `
<?php
$apiKey = 'sk_live_...';
$apiUrl = 'https://bsmclnbeywqosuhijhae.supabase.co/functions/v1/api-v1-transactions';

$transactionData = [
    'card_number' => [
        'initials' => 'LT',
        'issuer_id' => '000000',
        'random_letters' => 'QZ',
        'unique_identifier' => '0000000',
        'check_digit' => 7
    ],
    'amount' => 42.50,
    'description' => 'Achat chez Le Commerçant Inc.',
    'capture_delay_hours' => 0
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($transactionData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

print_r(json_decode($response, true));
?>
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
          <CardDescription>{t('settings.apiUsageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ts">
            <TabsList>
              <TabsTrigger value="ts">TypeScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
            </TabsList>
            <TabsContent value="ts">
              <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto"><code>{tsExample}</code></pre>
            </TabsContent>
            <TabsContent value="php">
              <pre className="bg-gray-900 text-white p-4 rounded-md text-sm overflow-x-auto"><code>{phpExample}</code></pre>
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
            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={copyToClipboard}>
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