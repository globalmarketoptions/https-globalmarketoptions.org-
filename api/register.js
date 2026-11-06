export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, username, full_name, country, currency, gender, phone, password } = req.body;

  try {
    const response = await fetch('https://vhbxubqfgyxrkekyztay.supabase.co/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_328Qbegmks1uHjZlAEm14w_63T8Nk4f',
        'Authorization': 'Bearer sb_publishable_328Qbegmks1uHjZlAEm14w_63T8Nk4f',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: 'user_' + Math.random().toString(36).substring(2, 10),
        email,
        username,
        full_name,
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