"use client";
import { FormEvent, useState } from 'react'; import { supabase } from '@/lib/supabaseClient'; import Image from 'next/image';
export default function AuthPage(){ const [mode,setMode]=useState<'login'|'signup'|'forgot'>('login'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState<string|null>(null);
  const onLogin=async(e:FormEvent)=>{e.preventDefault(); setMessage(null); const {error}=await supabase.auth.signInWithPassword({ email, password }); if(error) setMessage(error.message); else location.href='/app'; };
  const onSignup=async(e:FormEvent)=>{e.preventDefault(); setMessage(null); const {error}=await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: location.origin + '/auth/reset' } }); if(error) setMessage(error.message); else setMessage('Check your email to confirm your account, then log in.'); };
  const onForgot=async(e:FormEvent)=>{e.preventDefault(); setMessage(null); const {error}=await supabase.auth.resetPasswordForEmail(email,{ redirectTo: location.origin + '/auth/reset' }); if(error) setMessage(error.message); else setMessage('If the email exists, a reset link has been sent.'); };
  return (<div className='max-w-md mx-auto card mt-16'>
    <div className='flex items-center gap-3 mb-3'><Image src='/logo.png' alt='Logo' width={40} height={40} className='rounded'/><h1 className='text-xl font-semibold'>Welcome back</h1></div>
    {message && <p className='text-white/80 mb-3'>{message}</p>}
    {mode==='login' && (<form onSubmit={onLogin} className='space-y-3'>
      <label className='block'><span className='label'>Email</span><input className='input mt-1' type='email' value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label className='block'><span className='label'>Password</span><input className='input mt-1' type='password' value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      <button className='btn w-full' type='submit'>Log in</button>
      <div className='text-sm text-white/70 mt-2 flex justify-between'><button type='button' onClick={()=>setMode('signup')}>Create account</button><button type='button' onClick={()=>setMode('forgot')}>Forgot password?</button></div>
    </form>)}
    {mode==='signup' && (<form onSubmit={onSignup} className='space-y-3'>
      <label className='block'><span className='label'>Email</span><input className='input mt-1' type='email' value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label className='block'><span className='label'>Password</span><input className='input mt-1' type='password' value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      <button className='btn w-full' type='submit'>Sign up</button>
      <div className='text-sm text-white/70 mt-2'><button type='button' onClick={()=>setMode('login')}>Back to log in</button></div>
    </form>)}
    {mode==='forgot' && (<form onSubmit={onForgot} className='space-y-3'>
      <label className='block'><span className='label'>Email</span><input className='input mt-1' type='email' value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <button className='btn w-full' type='submit'>Send reset link</button>
      <div className='text-sm text-white/70 mt-2'><button type='button' onClick={()=>setMode('login')}>Back to log in</button></div>
    </form>)}
  </div>);
}
