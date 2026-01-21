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
  // Регистрация без подтверждения почты
  // ВАЖНО: Отключите подтверждение email в Supabase Dashboard:
  // Authentication → Settings → Email Auth → Confirm email (OFF)
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
    throw new Error(authError.message || 'Invalid email or password');
  }

  if (!authData.user) {
    throw new Error('Failed to sign in');
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
