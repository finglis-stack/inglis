import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewCard } from '@/context/NewCardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step1SelectUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateCard } = useNewCard();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showError(t('dashboard.users.searchError'));
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, legal_name, type, email, phone')
      .or(`full_name.ilike.%${searchQuery}%,legal_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

    if (error) {
      showError(`Erreur: ${error.message}`);
      setResults([]);
    } else {
      setResults(data);
    }
    setLoading(false);
  };

  const handleSelect = (profileId: string) => {
    setSelectedUserId(profileId);
  };

  const handleNext = () => {
    if (selectedUserId) {
      updateCard({ profileId: selectedUserId });
      navigate('/dashboard/cards/new/step-2');
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          placeholder={t('dashboard.users.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? t('dashboard.users.searchingButton') : t('dashboard.users.searchButton')}
        </Button>
      </form>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.users.colName')}</TableHead>
              <TableHead>{t('dashboard.users.colType')}</TableHead>
              <TableHead className="text-right">{t('dashboard.users.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center">{t('dashboard.users.loading')}</TableCell></TableRow>
            ) : results.length > 0 ? (
              results.map((profile) => (
                <TableRow key={profile.id} className={selectedUserId === profile.id ? 'bg-muted' : ''}>
                  <TableCell>{profile.type === 'personal' ? profile.full_name : profile.legal_name}</TableCell>
                  <TableCell>{profile.type === 'personal' ? t('dashboard.users.typePersonal') : t('dashboard.users.typeCorporate')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant={selectedUserId === profile.id ? 'default' : 'outline'} size="sm" onClick={() => handleSelect(profile.id)}>
                      {selectedUserId === profile.id ? t('dashboard.newCard.selected') : t('dashboard.newCard.select')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={3} className="text-center">{t('dashboard.users.noResults')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={handleNext} disabled={!selectedUserId}>{t('dashboard.sharedSteps.next')}</Button>
      </div>
    </div>
  );
};

export default Step1SelectUser;