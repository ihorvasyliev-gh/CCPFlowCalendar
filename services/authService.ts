import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

// Преобразуем данные пользователя из Supabase в наш формат
const mapSupabaseUserToUser = (supabaseUser: any): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    fullName: supabaseUser.full_name || supabaseUser.email,
    role: (supabaseUser.role as UserRole) || UserRole.STAFF
  };
};

// Регистрация нового пользователя
export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole = UserRole.STAFF
): Promise<User> => {
  // Регистрация БЕЗ подтверждения почты
  // ВАЖНО: Подтверждение email должно быть отключено в Supabase Dashboard:
  // Authentication → Settings → Email Auth → Confirm email (OFF)
  // Это позволяет пользователям сразу входить после регистрации
  // Если Confirm email = OFF, signUp() автоматически вернет session
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      },
      emailRedirectTo: undefined // Не отправляем email для подтверждения
    }
  });

  if (authError) {
    throw new Error(authError.message || 'Failed to sign up');
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Если подтверждение email отключено в Dashboard, authData.session будет создана автоматически
  // Если включено - сессии не будет, но пользователь все равно будет создан

  // Получаем профиль пользователя из public.users
  // Триггер должен был создать запись автоматически, но подождем немного
  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    // Если профиль еще не создан, создаем вручную
    const { data: newUserData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        role: role
      })
      .select()
      .single();

    if (insertError || !newUserData) {
      throw new Error(insertError?.message || 'Failed to create user profile');
    }

    return mapSupabaseUserToUser(newUserData);
  }

  return mapSupabaseUserToUser(userData);
};

// Вход пользователя
export const login = async (email: string, password: string): Promise<User> => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    // Улучшенная обработка ошибок с более понятными сообщениями
    let errorMessage = authError.message || 'Invalid email or password';
    
    // Парсим специфичные ошибки Supabase
    if (authError.status === 400) {
      if (authError.message?.includes('Invalid login credentials') || 
          authError.message?.includes('Email not confirmed')) {
        errorMessage = 'Invalid email or password. Please check your credentials or confirm your email.';
      } else if (authError.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before signing in. Check your inbox for a confirmation email.';
      } else if (authError.message?.includes('User not found')) {
        errorMessage = 'User not found. Please sign up first or contact your administrator.';
      } else {
        errorMessage = `Authentication failed: ${authError.message}. Please check your credentials or contact support.`;
      }
    } else if (authError.status === 429) {
      errorMessage = 'Too many login attempts. Please wait a moment and try again.';
    }
    
    throw new Error(errorMessage);
  }

  if (!authData.user) {
    throw new Error('Failed to sign in. Please try again.');
  }

  // Проверяем, подтвержден ли email (если требуется)
  if (authData.user.email_confirmed_at === null) {
    throw new Error('Please confirm your email address before signing in. Check your inbox for a confirmation email.');
  }

  // Получаем профиль пользователя из public.users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User profile not found. Please contact administrator.');
  }

  return mapSupabaseUserToUser(userData);
};

// Выход пользователя
export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Failed to logout');
  }
};

// Получить текущего пользователя
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !userData) {
    return null;
  }

  return mapSupabaseUserToUser(userData);
};

// Получить текущую сессию
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
