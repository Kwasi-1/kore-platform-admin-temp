import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { usePlatformAuthStore } from '@/store/platformAuthStore';
import { platformLogin } from '@/api/auth';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = usePlatformAuthStore((state) => state.login);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string().required('Password is required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(false);
      setErrorMsg(null);
      setIsLoading(true);
      try {
        const response = await platformLogin(values.email, values.password);
        login(response.token, response.refreshToken, response.adminUser);
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Login failed:', err);
        setErrorMsg('Invalid credentials');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            id="email"
            type="email"
            placeholder="admin@headlesspos.com"
            {...formik.getFieldProps('email')}
            className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-zinc-800 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm ${
              formik.touched.email && formik.errors.email ? 'border-red-500/50' : 'border-zinc-700/60'
            }`}
          />
        </div>
        {formik.touched.email && formik.errors.email ? (
          <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>{formik.errors.email}</span>
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            {...formik.getFieldProps('password')}
            className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-zinc-800 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm ${
              formik.touched.password && formik.errors.password ? 'border-red-500/50' : 'border-zinc-700/60'
            }`}
          />
        </div>
        {formik.touched.password && formik.errors.password ? (
          <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>{formik.errors.password}</span>
          </div>
        ) : null}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all mt-4 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign In</span>
        )}
      </Button>
    </form>
  );
}
