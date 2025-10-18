import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Users = () => {
  const { t } = useTranslation('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showError(t('users.searchError'));
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(
        `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,legal_name.ilike.%${searchQuery}%,operating_name.ilike.%${searchQuery}%`
      );

    if (error) {
      showError(`Erreur lors de la recherche : ${error.message}`);
      setResults([]);
    } else {
      setResults(data);
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('users.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/users/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('users.addUser')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.searchUser')}</CardTitle>
          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <Input
              placeholder={t('users.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? t('users.searchingButton') : t('users.searchButton')}
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {hasSearched && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.colName')}</TableHead>
                  <TableHead>{t('users.colType')}</TableHead>
                  <TableHead>{t('users.colContact')}</TableHead>
                  <TableHead>{t('users.colCreationDate')}</TableHead>
                  <TableHead>{t('users.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">{t('users.loading')}</TableCell>
                  </TableRow>
                ) : results.length > 0 ? (
                  results.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.type === 'personal' ? profile.full_name : profile.legal_name}
                      </TableCell>
                      <TableCell>{profile.type === 'personal' ? t('users.typePersonal') : t('users.typeCorporate')}</TableCell>
                      <TableCell>{profile.email || profile.phone || 'N/A'}</TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="icon">
                          <a href={`/dashboard/users/profile/${profile.id}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">{t('users.noResults')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;