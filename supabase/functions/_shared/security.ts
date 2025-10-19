// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Helper function to create a Supabase Admin client
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// Function to authenticate an API key and return the associated institution ID
export const authenticateApiKey = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer sk_live_')) {
    throw new Error('Missing or invalid API key.');
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const keyParts = apiKey.split('_');
  if (keyParts.length !== 3 || keyParts[0] !== 'sk' || keyParts[1] !== 'live') {
      throw new Error('Invalid API key format.');
  }
  
  const keyPrefix = `sk_live_${keyParts[2].substring(0, 8)}`;
  const keySecret = apiKey;

  // Hash the secret part of the key to compare with the stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(keySecret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const supabaseAdmin = getSupabaseAdmin();

  const { data: apiKeyData, error } = await supabaseAdmin
    .from('api_keys')
    .select('institution_id')
    .eq('key_prefix', keyPrefix)
    .eq('hashed_key', hashedKey)
    .single();

  if (error || !apiKeyData) {
    throw new Error('Authentication failed: API key not found or invalid.');
  }

  // Update last used timestamp (optional, but good for auditing)
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix);

  return apiKeyData.institution_id;
};