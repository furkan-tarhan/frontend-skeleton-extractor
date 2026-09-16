import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { registerUser, ApiError } from '@/lib/api';

const schema = z.object({
  username: z.string().min(3, 'En az 3 karakter').max(30, 'En fazla 30 karakter'),
  email: z.string().email('Geçerli bir email gir'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type FormValues = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    },
  });

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-2xl font-bold text-primary">Kayıt Ol</h1>

      <Card className="mt-8">
        {done ? (
          <p className="text-center text-sm text-primary">
            Hesabın oluşturuldu — giriş sayfasına yönlendiriliyorsun…
          </p>
        ) : (
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div>
              <Input placeholder="Kullanıcı adı" {...register('username')} />
              {errors.username && <p className="mt-1 text-xs text-danger">{errors.username.message}</p>}
            </div>
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
                {mutation.error instanceof ApiError ? mutation.error.message : 'Kayıt başarısız oldu.'}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor…' : 'Kayıt Ol'}
            </Button>
          </form>
        )}
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        Zaten hesabın var mı?{' '}
        <Link to="/login" className="text-primary hover:text-accent-hover">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
