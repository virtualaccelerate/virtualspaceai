REVOKE SELECT ON public.courses FROM anon, authenticated;
GRANT SELECT (id, title, title_ru, description, description_ru, cover_url, price, currency, level, duration, lessons_count, finik_payment_url, position, published, created_at, updated_at)
  ON public.courses TO anon, authenticated;