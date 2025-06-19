
// Initialize Supabase client (if not already done in app.js)
const supabaseUrl = 'https://bgsdnlkhwgbdbdvmhrzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc2RubGtod2diZGJkdm1ocnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjM0MjQsImV4cCI6MjA2NTczOTQyNH0.fCUUUrwn5Gy6J7KIMty3grq2a8GtNIHSqLLue3Q_nVM';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function signUp(email, password, firstName, lastName) {
  try {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    if (error) throw error;
    console.log('User signed up:', user);
    return user;
  } catch (error) {
    console.error('Error signing up:', error.message);
    throw error;
  }
}

async function login(email, password) {
  try {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    console.log('User logged in:', user);
    return user;
  } catch (error) {
    console.error('Error logging in:', error.message);
    throw error;
  }
}

async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('User logged out');
  } catch (error) {
    console.error('Error logging out:', error.message);
    throw error;
  }
}

// Export the functions so they can be used in other files
export { signUp, login, logout };