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
    const userId = 'user_' + Math.random().toString(36).substring(2, 15);

    const supabaseUrl = 'https://vhbxubqfgyxrkekyztay.supabase.co';
    const supabaseKey = 'sb_publishable_328Qbegmks1uHjZlAEm14w_63T8NK4f';

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: userId,
        email,
        username,
        full_name,
        display_name: full_name,
        country,
        currency,
        gender,
        phone,
        password
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(400).json({ error: errText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}