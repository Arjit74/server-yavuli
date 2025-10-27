const supabase = require('../config/supabase');

// Sign up a new user with Supabase Auth
const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: userData.name,
                role: userData.role || 'user'
            }
        }
    });

    if (error) throw error;
    return data;
};

// Sign in a user
const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

// Get current user session
const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
};

// Get current user
const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Sign out
const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

module.exports = {
    signUp,
    signIn,
    getSession,
    getUser,
    signOut
};
