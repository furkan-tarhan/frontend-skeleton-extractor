import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loginUser, ApiError } from '@/lib/api';
import { setToken } from '@/lib/token';
import { useSteamPopupLogin } from '@/hooks/useSteamPopupLogin';

const schema = z.object({
  email: z.string().email('Geçerli bir email gir'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type FormValues = z.infer<typeof schema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const steamError = searchParams.get('error');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (res) => {
      setToken(res.token);
      queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate(from);
    },
  });

  const steamLogin = useSteamPopupLogin(() => navigate(from));

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-2xl font-bold text-primary">Giriş Yap</h1>

      <Card className="mt-8">
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div>
            <Input placeholder="Email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <Input placeholder="Şifre" type="password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-sm text-danger">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Giriş başarısız oldu.'}
            </p>
          )}
          {steamError && !mutation.isError && <p className="text-sm text-danger">Steam girişi başarısız oldu.</p>}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-subtle" />
          <span className="text-xs text-muted">veya</span>
          <div className="h-px flex-1 bg-subtle" />
        </div>

        <Button variant="secondary" className="w-full" onClick={() => steamLogin()}>
          Steam ile Giriş Yap
        </Button>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        Hesabın yok mu?{' '}
        <Link to="/register" className="text-primary hover:text-accent-hover">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
