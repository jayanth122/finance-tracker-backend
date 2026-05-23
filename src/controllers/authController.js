const supabase = require('../config/supabase');

const formatAuthResponse = (data, message) => ({
  message,
  token: data.session?.access_token || null,
  user: data.user,
});

exports.signup = async (req, res) => {
  const { email, password, full_name, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const metadata = {};
  if (full_name) metadata.full_name = full_name;
  if (username) metadata.username = username;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  const message = data.session
    ? 'Signup successful.'
    : 'Signup successful. Confirm your email before logging in.';

  res.status(201).json(formatAuthResponse(data, message));
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json(formatAuthResponse(data, 'Login successful.'));
};
