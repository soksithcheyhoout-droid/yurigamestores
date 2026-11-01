// Authentication Store for Cheydev TopUp
// Manages session persistence, registered accounts, MySQL sync, demo logins, and live reactive events

const AUTH_USER_KEY = 'cheydev_auth_user_v1';
const REGISTERED_USERS_KEY = 'cheydev_registered_users_v1';

// Seed demo users
const SEED_USERS = [
  {
    id: 'usr_001',
    name: 'Chey Gamer',
    email: 'gamer@cheydev.com',
    phone: '+855 12 888 999',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    role: 'Gold VIP Member',
    joined: '2024-03-15',
    password: 'password123',
    balance: 50.00
  },
  {
    id: 'usr_002',
    name: 'Dara Pro Gamer',
    email: 'dara@cheydev.com',
    phone: '+855 96 777 666',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'Platinum Member',
    joined: '2024-05-10',
    password: 'password123',
    balance: 25.00
  }
];

let memoryUsers = [...SEED_USERS];
let memoryCurrentUser = null;

export function getRegisteredUsers() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {}
  return memoryUsers;
}

export function saveRegisteredUsers(users) {
  memoryUsers = users;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    }
  } catch (e) {}
}

export function getStoredUser() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {}
  return memoryCurrentUser;
}

export function setStoredUser(user) {
  memoryCurrentUser = user;
  try {
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cheydev_auth_changed', { detail: user }));
  }
}

// Helper to inspect email/identifier, validate Gmail format, and catch fake emails
export function inspectEmailOrIdentifier(id) {
  const clean = (id || '').trim().toLowerCase();

  // If phone number
  if (/^(\+?[0-9\s-]{8,18})$/.test(clean)) {
    return { type: 'phone', valid: true, clean };
  }

  // Check if input is an explicit fake keyword or pattern
  if (clean === 'fake' || clean.startsWith('fake@') || clean.includes('fakegmail') || clean.includes('fakeemail')) {
    return { 
      type: 'email', 
      isGmail: clean.includes('gmail'), 
      valid: false, 
      error: 'Gmail not found. Fake or placeholder Gmail addresses cannot be used.' 
    };
  }

  if (clean.includes('@')) {
    const parts = clean.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { type: 'email', valid: false, error: 'Invalid email address format.' };
    }
    const [username, domain] = parts;

    // Malformed or incomplete Gmail domain
    if (domain === 'gmail' || domain.startsWith('gmai.') || domain.startsWith('gmial.')) {
      return { 
        type: 'email', 
        isGmail: true, 
        valid: false, 
        error: 'Gmail not found. Incomplete domain (did you mean @gmail.com?)' 
      };
    }

    if (domain === 'gmail.com') {
      // Google requires 6 to 30 characters
      if (username.length < 6) {
        return { 
          type: 'email', 
          isGmail: true, 
          valid: false, 
          error: 'Gmail not found. Google requires Gmail usernames to be at least 6 characters.' 
        };
      }
      if (!/^[a-z0-9.]+$/.test(username)) {
        return { 
          type: 'email', 
          isGmail: true, 
          valid: false, 
          error: 'Gmail not found. Contains forbidden characters for a Gmail address.' 
        };
      }
      if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return { 
          type: 'email', 
          isGmail: true, 
          valid: false, 
          error: 'Gmail not found. Periods cannot be consecutive or at the start/end.' 
        };
      }
      const fakeNames = ['fake', 'fakemail', 'fakeuser', 'fakegmail', 'test', 'temp', 'dummy', 'nobody', 'sample', 'asdfgh', '123456', 'unknown'];
      if (fakeNames.some(f => username.replace(/\./g, '') === f || username.replace(/\./g, '').startsWith('fake'))) {
        return { 
          type: 'email', 
          isGmail: true, 
          valid: false, 
          error: 'Gmail not found. Fake or placeholder Gmail addresses cannot be used.' 
        };
      }
      return { type: 'email', isGmail: true, valid: true, clean };
    }

    // Disposable/fake email domains
    const disposable = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'fake.com', 'trashmail.com'];
    if (disposable.includes(domain)) {
      return { type: 'email', valid: false, error: 'Fake email domain detected. Please use a real Gmail address.' };
    }

    return { type: 'email', isGmail: false, valid: true, clean };
  }

  // Incomplete string containing 'fake' or 'gmail'
  if (clean.includes('fake') || clean.includes('gmail')) {
    return { 
      type: 'email', 
      isGmail: true, 
      valid: false, 
      error: 'Gmail not found. Please enter a valid registered Gmail address.' 
    };
  }

  return { type: 'unknown', valid: true, clean };
}

// Authenticate user via MySQL API with offline fallback
export async function loginUser(emailOrPhone, password) {
  const cleanId = (emailOrPhone || '').trim().toLowerCase();
  const cleanPw = (password || '').trim();

  if (!cleanId) {
    return { success: false, error: 'Please enter your email or phone number.' };
  }
  if (!cleanPw) {
    return { success: false, error: 'Please enter your password.' };
  }

  // Check format and fake Gmail patterns
  const check = inspectEmailOrIdentifier(cleanId);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  // 1. Attempt login via MySQL API
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: cleanId, password: cleanPw })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setStoredUser(data.user);
      return { success: true, user: data.user, source: 'mysql' };
    } else {
      return { 
        success: false, 
        error: data.error || (check.isGmail ? 'Gmail not found. Please check your email or click Register below!' : 'Account not found. Please register first.') 
      };
    }
  } catch (netErr) {
    console.log('[authStore] MySQL API offline, attempting local fallback:', netErr.message);

    // 2. Fallback to local store ONLY when server is completely offline
    const allUsers = getRegisteredUsers();
    const user = allUsers.find(u => 
      (u.email.toLowerCase() === cleanId || (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, ''))) &&
      (u.password === cleanPw || (cleanId === 'gamer@cheydev.com' && cleanPw === 'password123'))
    );

    if (user) {
      const { password: _, ...sessionUser } = user;
      setStoredUser(sessionUser);
      return { success: true, user: sessionUser, source: 'local' };
    }

    if (check.isGmail || cleanId.includes('@gmail.com') || cleanId.includes('gmail')) {
      return { 
        success: false, 
        error: 'Gmail not found. Please check your email or click Register below!' 
      };
    }
    if (cleanId.includes('@')) {
      return { 
        success: false, 
        error: 'Email not found. Please check your email or click Register below!' 
      };
    }

    return { 
      success: false, 
      error: 'Account not found or invalid password. If you don’t have an account, please click Register below!' 
    };
  }
}

// Register user via MySQL API with offline fallback
export async function registerUser({ name, email, phone, password }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanName) {
    return { success: false, error: 'Please enter your full name or gamer tag.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  // Inspect email format and detect fake Gmail
  const check = inspectEmailOrIdentifier(cleanEmail);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  // 1. Attempt register via MySQL API
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPassword
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setStoredUser(data.user);
      return { success: true, user: data.user, source: 'mysql' };
    } else if (data.error) {
      return { success: false, error: data.error };
    }
  } catch (netErr) {
    console.log('[authStore] MySQL API offline, attempting local fallback:', netErr.message);
  }

  // 2. Fallback to local store
  const allUsers = getRegisteredUsers();
  const existing = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { 
      success: false, 
      error: 'An account with this email already exists. Please sign in instead!' 
    };
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone || '+855 00 000 000',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
    role: 'VIP Member',
    joined: new Date().toISOString().split('T')[0],
    password: cleanPassword
  };

  const updatedUsers = [newUser, ...allUsers];
  saveRegisteredUsers(updatedUsers);

  const { password: _, ...sessionUser } = newUser;
  setStoredUser(sessionUser);
  return { success: true, user: sessionUser, source: 'local' };
}

export function quickDemoLogin() {
  const defaultUser = SEED_USERS[0];
  const { password: _, ...sessionUser } = defaultUser;
  setStoredUser(sessionUser);
  return sessionUser;
}

export async function loginWithGoogle({ credential, profile, mode = 'login' }) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, profile, mode })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setStoredUser(data.user);
      return { success: true, user: data.user, isNew: data.isNew };
    } else {
      return { 
        success: false, 
        error: data.error || (mode === 'login' ? 'Gmail not found. No account is registered with this Google account. Please click Create Account below to register!' : 'Failed to register with Google') 
      };
    }
  } catch (err) {
    return { success: false, error: 'Network error connecting to Google authentication service' };
  }
}

export function logoutUser() {
  setStoredUser(null);
}
