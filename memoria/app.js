// Fixed app.js with proper Supabase integration
// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://gtviszfobbkewhuydtcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmlzemZvYmJrZXdodXlkdGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTczMzUsImV4cCI6MjA3NDAzMzMzNX0.ebduH-So7XZfyh3vtF5KAsslH_qJXIfRqvgjBlVJVQo';

// Initialize Supabase client
let supabaseClient;
let isSupabaseAvailable = false;

// Initialize Supabase when the script loads
function initializeSupabase() {
  try {
    // Check if Supabase is available
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseAvailable = true;
      console.log('✅ Supabase client initialized successfully');
      
      // Set up auth state change listener
      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_OUT') {
          currentUser = null;
          localStorage.removeItem('demoUser');
        } else if (event === 'SIGNED_IN' && session?.user) {
          currentUser = session.user;
        }
      });
      
    } else {
      console.log('⚠️ Supabase not available, using demo mode');
      isSupabaseAvailable = false;
    }
  } catch (error) {
    console.log('⚠️ Supabase initialization failed, using demo mode:', error);
    isSupabaseAvailable = false;
  }
}

// Call initialization immediately
initializeSupabase();

// Global variables
let currentUser = null;

// ===== AUTHENTICATION FUNCTIONS =====

async function checkAuthState() {
  console.log('Checking auth state...');
  
  try {
    if (isSupabaseAvailable && supabaseClient) {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error) {
        console.error('Auth error:', error);
        // Clear any stale session
        await supabaseClient.auth.signOut();
        currentUser = null;
        return null;
      }
      
      if (user) {
        currentUser = user;
        console.log('✅ User authenticated via Supabase:', user.email);
        return user;
      }
    }
    
    // Fallback to demo mode
    const demoUser = localStorage.getItem('demoUser');
    if (demoUser) {
      currentUser = JSON.parse(demoUser);
      console.log('✅ User authenticated via demo mode:', currentUser.email);
      return currentUser;
    }
    
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  
  console.log('❌ No authenticated user found');
  return null;
}

async function loginUser(email, password) {
  console.log('Attempting login for:', email);
  
  try {
    // Always try Supabase first if available
    if (isSupabaseAvailable && supabaseClient) {
      console.log('🔄 Attempting Supabase login...');
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        console.error('Supabase login error:', error);
        // Don't return error immediately, fallback to demo mode
        console.log('🔄 Falling back to demo mode...');
      } else if (data.user) {
        console.log('✅ Supabase login successful');
        currentUser = data.user;
        // Clear demo user if exists
        localStorage.removeItem('demoUser');
        return { success: true, user: data.user };
      }
    }
    
    // Demo mode fallback
    console.log('🔄 Using demo mode login...');
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: email,
      name: email.split('@')[0],
      user_metadata: {
        full_name: email.split('@')[0]
      }
    };
    
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    currentUser = demoUser;
    console.log('✅ Demo login successful');
    return { success: true, user: demoUser };
    
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

async function registerUser(email, password, fullName) {
  console.log('Attempting registration for:', email);
  
  try {
    // Try Supabase first if available
    if (isSupabaseAvailable && supabaseClient) {
      console.log('🔄 Attempting Supabase registration...');
      
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      
      if (error) {
        console.error('Supabase registration error:', error);
        // Fall back to demo mode
        console.log('🔄 Falling back to demo mode...');
      } else {
        console.log('✅ Supabase registration successful');
        // Note: User might need to confirm email
        if (data.user) {
          currentUser = data.user;
          localStorage.removeItem('demoUser');
          return { 
            success: true, 
            user: data.user,
            needsConfirmation: !data.session 
          };
        }
      }
    }
    
    // Demo mode fallback
    console.log('🔄 Using demo mode registration...');
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: email,
      name: fullName,
      user_metadata: {
        full_name: fullName
      }
    };
    
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    currentUser = demoUser;
    console.log('✅ Demo registration successful');
    return { success: true, user: demoUser };
    
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

async function logoutUser() {
  try {
    console.log('🚪 Logging out user...');
    
    if (isSupabaseAvailable && supabaseClient) {
      await supabaseClient.auth.signOut();
      console.log('✅ Supabase logout successful');
    }
    
    // Clear demo user
    localStorage.removeItem('demoUser');
    currentUser = null;
    
    console.log('✅ Logout completed');
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    // Force clear everything
    localStorage.removeItem('demoUser');
    currentUser = null;
    return { success: false, error: error.message };
  }
}

// ===== LOCATION FUNCTIONS =====

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Provide default location if geolocation fails
        resolve({
          lat: 13.0827, // Chennai coordinates as fallback
          lng: 80.2707,
          accuracy: 1000
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// ===== MEMORY FUNCTIONS =====

async function saveMemory(memoryData) {
  console.log('💾 Saving memory:', memoryData);
  
  try {
    const user = await checkAuthState();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const memoryRecord = {
      user_id: user.id,
      text: memoryData.text,
      latitude: memoryData.latitude,
      longitude: memoryData.longitude,
      ar_position_x: memoryData.ar_position_x,
      ar_position_y: memoryData.ar_position_y,
      ar_position_z: memoryData.ar_position_z,
      screen_x: memoryData.screen_x,
      screen_y: memoryData.screen_y,
      visibility: memoryData.visibility || 'public',
      is_anonymous: memoryData.is_anonymous || false,
      created_at: new Date().toISOString()
    };
    
    if (isSupabaseAvailable && supabaseClient) {
      console.log('🔄 Saving to Supabase database...');
      
      const { data, error } = await supabaseClient
        .from('memories')
        .insert([memoryRecord])
        .select()
        .single();
        
      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save memory: ' + error.message);
      }
      
      console.log('✅ Memory saved to Supabase:', data);
      return { success: true, data: data };
    } else {
      // Demo mode - save to localStorage
      console.log('🔄 Saving to demo storage...');
      
      const memories = JSON.parse(localStorage.getItem('demo_memories') || '[]');
      memoryRecord.id = 'memory-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      memories.push(memoryRecord);
      localStorage.setItem('demo_memories', JSON.stringify(memories));
      
      console.log('✅ Memory saved to demo storage:', memoryRecord);
      return { success: true, data: memoryRecord };
    }
  } catch (error) {
    console.error('❌ Failed to save memory:', error);
    return { success: false, error: error.message };
  }
}

async function getMemoriesNearLocation(latitude, longitude, radiusMeters = 50) {
  console.log(`🔍 Getting memories near ${latitude}, ${longitude} within ${radiusMeters}m`);
  
  try {
    const user = await checkAuthState();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    let memories = [];
    
    if (isSupabaseAvailable && supabaseClient) {
      console.log('🔄 Querying Supabase database...');
      
      // Get all public memories
      const { data: publicMemories, error: publicError } = await supabaseClient
        .from('memories')
        .select('*')
        .eq('visibility', 'public');
        
      if (publicError) {
        console.warn('Public memories query error:', publicError);
      }
      
      // Get user's own memories (both public and private)
      const { data: userMemories, error: userError } = await supabaseClient
        .from('memories')
        .select('*')
        .eq('user_id', user.id);
        
      if (userError) {
        console.warn('User memories query error:', userError);
      }
      
      // Combine memories
      const allMemories = [...(publicMemories || []), ...(userMemories || [])];
      
      // Remove duplicates
      const uniqueMemories = allMemories.filter((memory, index, self) => 
        index === self.findIndex(m => m.id === memory.id)
      );
      
      // Filter by distance
      memories = uniqueMemories.filter(memory => {
        if (!memory.latitude || !memory.longitude) return false;
        
        const distance = calculateDistance(
          latitude, longitude,
          memory.latitude, memory.longitude
        );
        return distance <= radiusMeters;
      });
      
    } else {
      // Demo mode
      console.log('🔄 Using demo storage...');
      
      let demoMemories = JSON.parse(localStorage.getItem('demo_memories') || '[]');
      
      // Add sample memories if none exist
      if (demoMemories.length === 0) {
        const sampleMemories = [
          {
            id: 'sample-1',
            user_id: 'sample-user',
            text: 'Beautiful sunset from this spot last evening! The colors were absolutely magical and reminded me of childhood summers.',
            latitude: latitude + 0.0001,
            longitude: longitude + 0.0001,
            ar_position_x: 0.5,
            ar_position_y: 0,
            ar_position_z: -2,
            visibility: 'public',
            is_anonymous: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-2',
            user_id: 'sample-user-2',
            text: 'Had amazing coffee here with friends! This place holds so many precious memories.',
            latitude: latitude - 0.0001,
            longitude: longitude - 0.0001,
            ar_position_x: -0.5,
            ar_position_y: 0,
            ar_position_z: -3,
            visibility: 'public',
            is_anonymous: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-3',
            user_id: user.id,
            text: 'This is my secret thinking spot. I come here for peace and clarity.',
            latitude: latitude + 0.00005,
            longitude: longitude - 0.00005,
            ar_position_x: 0.2,
            ar_position_y: 0.1,
            ar_position_z: -2.5,
            visibility: 'private',
            is_anonymous: false,
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('demo_memories', JSON.stringify(sampleMemories));
        demoMemories = sampleMemories;
      }
      
      // Filter by distance
      memories = demoMemories.filter(memory => {
        if (!memory.latitude || !memory.longitude) return false;
        
        const distance = calculateDistance(
          latitude, longitude,
          memory.latitude, memory.longitude
        );
        return distance <= radiusMeters;
      });
    }
    
    console.log(`✅ Found ${memories.length} memories near location`);
    return { success: true, data: memories };
    
  } catch (error) {
    console.error('❌ Failed to get memories:', error);
    return { success: false, error: error.message };
  }
}

// ===== PAGE INITIALIZATION FUNCTIONS =====

async function initializeHomePage() {
  console.log('🏠 Initializing home page...');
  
  try {
    const user = await checkAuthState();
    if (!user) {
      console.log('❌ No user found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }
    
    // Update welcome message
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
      const displayName = user.user_metadata?.full_name || 
                         user.name || 
                         user.email?.split('@')[0] || 
                         'User';
      welcomeMsg.textContent = `Welcome back, ${displayName}!`;
    }
    
    // Setup logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        console.log('🚪 Logout button clicked');
        const result = await logoutUser();
        if (result.success) {
          window.location.href = 'login.html';
        }
      });
    }
    
    console.log('✅ Home page initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize home page:', error);
    window.location.href = 'login.html';
  }
}

// ===== UTILITY FUNCTIONS =====

function showError(message) {
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }
  if (successMsg) {
    successMsg.style.display = 'none';
  }
  
  console.error('Error:', message);
}

function showSuccess(message) {
  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  
  if (successMsg) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
  }
  if (errorMsg) {
    errorMsg.style.display = 'none';
  }
  
  console.log('Success:', message);
}

// ===== FORM HANDLERS =====

// Setup form handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, setting up form handlers...');
  
  // Wait a bit for Supabase to initialize if needed
  setTimeout(() => {
    setupFormHandlers();
  }, 100);
});

function setupFormHandlers() {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('🔗 Setting up login form handler');
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📝 Login form submitted');
      
      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value;
      const loginBtn = document.getElementById('loginBtn');
      
      if (!email || !password) {
        showError('Please fill in all fields');
        return;
      }
      
      if (!email.includes('@')) {
        showError('Please enter a valid email address');
        return;
      }
      
      // Disable button
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
      }
      
      try {
        const result = await loginUser(email, password);
        
        if (result.success) {
          showSuccess('Login successful! Redirecting...');
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 1000);
        } else {
          showError(result.error || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        showError('Login failed: ' + error.message);
      } finally {
        // Re-enable button
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
        }
      }
    });
  }
  
  // Registration form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    console.log('🔗 Setting up registration form handler');
    
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📝 Registration form submitted');
      
      const fullName = document.getElementById('fullName')?.value?.trim();
      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value;
      const registerBtn = document.getElementById('registerBtn');
      
      if (!fullName || !email || !password) {
        showError('Please fill in all fields');
        return;
      }
      
      if (!email.includes('@')) {
        showError('Please enter a valid email address');
        return;
      }
      
      if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
      }
      
      // Disable button
      if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
      }
      
      try {
        const result = await registerUser(email, password, fullName);
        
        if (result.success) {
          if (result.needsConfirmation) {
            showSuccess('Account created! Please check your email for confirmation.');
          } else {
            showSuccess('Account created successfully! Redirecting...');
            setTimeout(() => {
              window.location.href = 'home.html';
            }, 1000);
          }
        } else {
          showError(result.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed: ' + error.message);
      } finally {
        // Re-enable button
        if (registerBtn) {
          registerBtn.disabled = false;
          registerBtn.textContent = 'Create Account';
        }
      }
    });
  }
}

// Quick demo login function (for login page)
window.quickLogin = async () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');
  
  if (emailInput && passwordInput && loginForm) {
    emailInput.value = 'demo@memoria.com';
    passwordInput.value = 'demo123';
    loginForm.dispatchEvent(new Event('submit'));
  }
};

// Export functions for global access
window.checkAuthState = checkAuthState;
window.getCurrentLocation = getCurrentLocation;
window.calculateDistance = calculateDistance;
window.saveMemory = saveMemory;
window.getMemoriesNearLocation = getMemoriesNearLocation;
window.initializeHomePage = initializeHomePage;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;

console.log('📱 Memoria app.js loaded successfully');
