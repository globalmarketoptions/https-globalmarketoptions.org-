const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vhbxubqfgyxrkekyztay.supabase.co";
const supabaseServiceKey = "sb_secret_DNLOqDiFAIXL-DruPUcapg_zVYcy938"; // Your secret service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, username, full_name, country, currency, gender, phone, password } = req.body;

    const userId = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Use service role key to insert securely, bypassing any RLS restrictions
    const { error: dbError } = await supabase.from('profiles').insert([
      {
        id: userId,
        email: email,
        username: username,
        full_name: full_name,
        display_name: full_name,
        country: country,
        currency: currency,
        gender: gender,
        phone: phone,
        password: password
      }
    ]);

    if (dbError) {
      return res.status(400).json({ error: dbError.message });
    }

    return res.status(200).json({ success: true, message: 'Account created successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration' });
  }
};