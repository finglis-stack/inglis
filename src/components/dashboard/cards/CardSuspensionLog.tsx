import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Ban, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  cardId: string;
  className?: string;
  showUnblock?: boolean;
  status?: string;
}

const CardSuspensionLog = ({ cardId, className, showUnblock, status }: Props) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('card_suspensions')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });
    if (error) {
      showError(error.message);
      return;
    }
    setLogs(data || []);
  };

  useEffect(() => { fetchLogs(); }, [cardId]);

  const handleUnblock = async () => {
    const { data, error } = await supabase.functions.invoke('suspend-card', {
      body: { action: 'unblock', card_id: cardId }
    });
    if (error) {
      showError(error.message);
      return;
    }
    if (data?.success) {
      showSuccess('Carte débloquée.');
      fetchLogs();
    }
  };

  return (
    <div className={className}>
      {status === 'blocked' && (
        <Alert variant="destructive" className="mb-4">
          <Ban className="h-4 w-4" />
          <AlertTitle>Carte bloquée</AlertTitle>
          <AlertDescription>Cette carte est actuellement désactivée. Le titulaire ne peut pas effectuer d’opérations.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Journal de suspensions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Rapporteur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? logs.map((log) => (
                <TableRow
                  key={log.id}
                  onClick={() => { setSelectedLog(log); setOpen(true); }}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>{new Date(log.created_at).toLocaleString('fr-CA')}</TableCell>
                  <TableCell className="capitalize">{log.action}</TableCell>
                  <TableCell className="capitalize">{log.reason || '—'}</TableCell>
                  <TableCell>{log.reporter_email || '—'}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Aucun journal</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {showUnblock && status === 'blocked' && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleUnblock}>
                <Unlock className="mr-2 h-4 w-4" />
                Débloquer la carte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rapport de suspension</DialogTitle>
            <DialogDescription>Détails du rapport</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">{selectedLog ? new Date(selectedLog.created_at).toLocaleString('fr-CA') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Action</p>
                <p className="text-sm capitalize">{selectedLog?.action || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Raison</p>
                <p className="text-sm capitalize">{selectedLog?.reason || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rapporteur</p>
                <p className="text-sm">{selectedLog?.reporter_email || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <ScrollArea className="h-40 rounded border p-2">
                <p className="text-sm whitespace-pre-wrap">{selectedLog?.description || '—'}</p>
              </ScrollArea>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardSuspensionLog;