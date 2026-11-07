import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhbxubqfgyxrkekyztay.supabase.co';
const supabaseKey = 'sb_publishable_328Qbegmks1uHjZlAEm14w_63T8NK4f';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, username, full_name, country, currency, gender, phone, password } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = 'user_' + Math.random().toString(36).substring(2, 15);

    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email,
          username,
          full_name: full_name || username,
          display_name: full_name || username,
          country: country || 'Not Specified',
          currency: currency || 'USD',
          gender: gender || 'Other',
          phone: phone || '',
          password
        }
      ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, userId });
  } catch (err) {
    return res.status(500).json({ error: `Supabase SDK Error: ${err.message}` });
  }
}