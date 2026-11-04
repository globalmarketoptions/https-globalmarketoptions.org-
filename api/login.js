const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vhbxubqfgyxrkekyztay.supabase.co";
const supabaseServiceKey = "sb_secret_DNLOqDiFAIXL-DruPUcapg_zVYcy938";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const { data: user, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('password', password)
      .single();

    if (dbError || !user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during login' });
  }
};