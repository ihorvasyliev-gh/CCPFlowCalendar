-- ============================================
-- CCP Event Calendar - Supabase Database Setup
-- ============================================
-- Этот файл содержит полную схему базы данных для календаря событий
-- Выполните его в Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. РАСШИРЕНИЯ (EXTENSIONS)
-- ============================================

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Включаем расширение для работы с массивами (уже включено по умолчанию)

-- ============================================
-- 2. ТАБЛИЦЫ (TABLES)
-- ============================================

-- Таблица пользователей
-- Примечание: Supabase Auth уже создает таблицу auth.users
-- Эта таблица расширяет информацию о пользователях
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица событий
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  poster_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  category TEXT CHECK (category IN ('meeting', 'workshop', 'social', 'training', 'community', 'celebration', 'other')),
  tags TEXT[] DEFAULT '{}',
  recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_interval INTEGER,
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  recurrence_occurrences INTEGER,
  recurrence_days_of_week INTEGER[],
  rsvp_enabled BOOLEAN DEFAULT false,
  max_attendees INTEGER,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица вложений (постеры и файлы)
CREATE TABLE IF NOT EXISTS public.event_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'pdf', 'document', 'other')),
  size BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Таблица комментариев к событиям
CREATE TABLE IF NOT EXISTS public.event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории изменений событий
CREATE TABLE IF NOT EXISTS public.event_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица RSVP (записи на события)
CREATE TABLE IF NOT EXISTS public.rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================
-- 3. ИНДЕКСЫ (INDEXES) для производительности
-- ============================================

-- Индексы для таблицы events
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);

-- Индексы для таблицы event_attachments
CREATE INDEX IF NOT EXISTS idx_attachments_event ON public.event_attachments(event_id);

-- Индексы для таблицы event_comments
CREATE INDEX IF NOT EXISTS idx_comments_event ON public.event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.event_comments(created_at);

-- Индексы для таблицы event_history
CREATE INDEX IF NOT EXISTS idx_history_event ON public.event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON public.event_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON public.event_history(timestamp);

-- Индексы для таблицы rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON public.rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON public.rsvps(status);

-- ============================================
-- 4. ТРИГГЕРЫ (TRIGGERS) для автоматического обновления
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для таблицы users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггер для таблицы events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггер для таблицы rsvps
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ users
-- ============================================

-- Все пользователи могут видеть всех пользователей
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Администраторы могут создавать пользователей
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ events
-- ============================================

-- Все авторизованные пользователи могут видеть опубликованные события
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    status = 'published' OR
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Только создатель или админ могут создавать события
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Только создатель или админ могут обновлять события
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Только создатель или админ могут удалять события
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ event_attachments
-- ============================================

-- Все могут видеть вложения опубликованных событий
CREATE POLICY "Attachments are viewable for published events"
  ON public.event_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        status = 'published' OR
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Только создатель события или админ могут добавлять вложения
CREATE POLICY "Users can insert attachments to own events"
  ON public.event_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Только создатель события или админ могут удалять вложения
CREATE POLICY "Users can delete attachments from own events"
  ON public.event_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ event_comments
-- ============================================

-- Все могут видеть комментарии к опубликованным событиям
CREATE POLICY "Comments are viewable for published events"
  ON public.event_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND status = 'published'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Все авторизованные пользователи могут добавлять комментарии
CREATE POLICY "Authenticated users can insert comments"
  ON public.event_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
    )
  );

-- Пользователи могут удалять только свои комментарии, админы - любые
CREATE POLICY "Users can delete own comments"
  ON public.event_comments FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ event_history
-- ============================================

-- Все могут видеть историю опубликованных событий
CREATE POLICY "History is viewable for published events"
  ON public.event_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        status = 'published' OR
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- История создается автоматически через триггеры (только для админов и создателей)
CREATE POLICY "History can be inserted by system"
  ON public.event_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ rsvps
-- ============================================

-- Все могут видеть RSVP для опубликованных событий
CREATE POLICY "RSVPs are viewable for published events"
  ON public.rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND status = 'published'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Пользователи могут создавать RSVP для себя
CREATE POLICY "Users can create own RSVP"
  ON public.rsvps FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND rsvp_enabled = true
    )
  );

-- Пользователи могут обновлять только свой RSVP
CREATE POLICY "Users can update own RSVP"
  ON public.rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи могут удалять только свой RSVP
CREATE POLICY "Users can delete own RSVP"
  ON public.rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. ФУНКЦИИ (FUNCTIONS) для удобства работы
-- ============================================

-- Функция для получения событий с вложениями и комментариями
CREATE OR REPLACE FUNCTION public.get_event_with_details(event_uuid UUID)
RETURNS TABLE (
  event JSONB,
  attachments JSONB,
  comments JSONB,
  rsvps JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(e.*)::JSONB as event,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(a.*))
       FROM public.event_attachments a
       WHERE a.event_id = event_uuid),
      '[]'::JSONB
    ) as attachments,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(c.*) ORDER BY c.created_at)
       FROM public.event_comments c
       WHERE c.event_id = event_uuid),
      '[]'::JSONB
    ) as comments,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(r.*))
       FROM public.rsvps r
       WHERE r.event_id = event_uuid),
      '[]'::JSONB
    ) as rsvps
  FROM public.events e
  WHERE e.id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматического создания записи истории при создании события
CREATE OR REPLACE FUNCTION public.create_event_history_entry()
RETURNS TRIGGER AS $$
DECLARE
  current_user_name TEXT;
BEGIN
  -- Получаем имя пользователя
  SELECT full_name INTO current_user_name
  FROM public.users
  WHERE id = NEW.creator_id;

  -- Создаем запись в истории
  INSERT INTO public.event_history (event_id, user_id, user_name, action)
  VALUES (NEW.id, NEW.creator_id, COALESCE(current_user_name, 'Unknown'), 'created');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания истории при создании события
CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_history_entry();

-- ============================================
-- 7. СИНХРОНИЗАЦИЯ С AUTH.USERS
-- ============================================

-- Функция для автоматического создания записи в public.users при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания пользователя
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. ТЕСТОВЫЕ ДАННЫЕ (опционально)
-- ============================================

-- Раскомментируйте для создания тестовых данных
/*
-- Создание тестового администратора (нужно создать через Supabase Auth сначала)
-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@ccp.com',
--   'CCP Administrator',
--   'admin'
-- );

-- Создание тестового сотрудника
-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   'staff@ccp.com',
--   'Jane Doe',
--   'staff'
-- );
*/

-- ============================================
-- ГОТОВО!
-- ============================================
-- База данных настроена. Теперь вы можете:
-- 1. Создать пользователей через Supabase Auth
-- 2. Использовать API для работы с событиями
-- 3. Настроить переменные окружения в приложении
-- ============================================
