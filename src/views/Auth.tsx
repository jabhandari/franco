import React from 'react';
import { BookOpen, RotateCcw, Flame, Check, Circle } from 'lucide-react';
import { apiGet, apiPost, getErrorMessage, startGoogleSignIn } from '../api/client';
import { Box, Text, Field, TextInput, Button, ErrorMessage } from '../components/ui';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'check-email' | 'unverified';
type AuthScreenProps = {mode:AuthMode;onModeChange:(mode:AuthMode)=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;loading:boolean;error:string;onPasswordReset:()=>void};
const linkToken = new URLSearchParams(window.location.search).get('token');
if (linkToken && ['/verify-email','/reset-password'].includes(window.location.pathname)) window.history.replaceState({},'',window.location.pathname);

export function AuthScreen({mode,onModeChange,onSubmit,loading,error,onPasswordReset}:AuthScreenProps) {
  const signup=mode==='signup';
  const [email,setEmail]=React.useState('');
  const [password,setPassword]=React.useState('');
  const [confirm,setConfirm]=React.useState('');
  const [localError,setLocalError]=React.useState('');
  const [notice,setNotice]=React.useState('');
  const [working,setWorking]=React.useState(false);
  const [googleLoading,setGoogleLoading]=React.useState(false);
  const rules=[{label:'At least 8 characters',met:password.length>=8},{label:'One uppercase letter',met:/[A-Z]/.test(password)},{label:'One number',met:/\d/.test(password)}];
  const switchMode=(next:AuthMode)=>{setLocalError('');setNotice('');onModeChange(next);};
  React.useEffect(()=>{
    if(mode!=='verify') return;
    if(!linkToken) {setLocalError('This verification link is invalid or expired.');return;}
    let active=true;
    setWorking(true);
    apiPost<{message:string}>('/api/auth/verify-email',{token:linkToken})
      .then(result=>{if(active) setNotice(result.message);})
      .catch(failure=>{if(active) setLocalError(getErrorMessage(failure));})
      .finally(()=>{if(active) setWorking(false);});
    return ()=>{active=false;};
  },[mode]);
  function submit(event:React.FormEvent<HTMLFormElement>) {
    setLocalError('');
    if(signup && (!rules.every(rule=>rule.met) || password!==confirm)) {
      event.preventDefault();setLocalError(password!==confirm ? 'Your passwords do not match.' : 'Choose a password that meets all three rules.');return;
    }
    onSubmit(event);
  }
  async function secondarySubmit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setLocalError('');setNotice('');
    if(mode==='reset' && password!==confirm) {setLocalError('Your passwords do not match.');return;}
    setWorking(true);
    try {
      if(mode==='forgot' || mode==='unverified' || mode==='check-email') {
        const path=mode==='forgot'?'/api/auth/forgot-password':'/api/auth/resend-verification';
        const result=await apiPost<{message:string}>(path,{email});setNotice(result.message);
      } else if(mode==='reset') {
        const result=await apiPost<{message:string}>('/api/auth/reset-password',{token:linkToken,password});onPasswordReset();setNotice(result.message);
      }
    } catch(failure) {setLocalError(getErrorMessage(failure));}
    finally {setWorking(false);}
  }
  async function google() {
    setLocalError('');setGoogleLoading(true);
    try {
      const status=await apiGet<{available:boolean}>('/api/auth/google/status');
      if(status.available) startGoogleSignIn();
      else setLocalError('Google sign-in is not available yet. Please use email and password.');
    } catch {setLocalError('Google sign-in is not available yet. Please use email and password.');}
    finally {setGoogleLoading(false);}
  }
  const title:Record<AuthMode,string>={login:'Welcome back',signup:'Create your account',forgot:'Reset your password',reset:'Choose a new password',verify:'Verify your email','check-email':'Check your email',unverified:'Verify your email to continue'};
  return <Box as="main" className="auth-direction-b">
    <Box className="auth-b-card">
      <Box as="aside" className="auth-b-rail">
        <Box className="auth-b-brand"><Text as="span">fr</Text><Box><Text as="strong">Franco</Text><Text as="small">French learning platform</Text></Box></Box>
        <Text as="h1">Your French, kept in one place.</Text>
        <Box as="ul" className="auth-b-values"><Box as="li"><BookOpen size={18} aria-hidden="true"/><Text>Your progress saved</Text></Box><Box as="li"><RotateCcw size={18} aria-hidden="true"/><Text>Pick up where you left off</Text></Box><Box as="li"><Flame size={18} aria-hidden="true"/><Text>Your streak and scores kept</Text></Box></Box>
        <Box className="auth-b-saved"><Text as="small">Your learning space</Text><Text as="strong">Lessons · progress · practice</Text><Text>All saved to your account.</Text></Box>
      </Box>
      <Box as="section" className="auth-b-form">
        {(mode==='login'||signup) && <Box className="auth-b-segments" role="group" aria-label="Account mode"><Box as="button" type="button" disabled={loading} aria-pressed={!signup} onClick={()=>switchMode('login')}>Log in</Box><Box as="button" type="button" disabled={loading} aria-pressed={signup} onClick={()=>switchMode('signup')}>Create account</Box></Box>}
        <Text as="h2">{title[mode]}</Text>
        <Text className="auth-b-subtitle">{signup?'Save your level, your lessons and your progress.':mode==='login'?'Pick up where you left off.':mode==='verify'?'Confirming your email address.':mode==='reset'?'Enter a new password for your account.':'We will email you a secure link if the address is eligible.'}</Text>
        {(mode==='login'||signup) && <><Box as="button" type="button" className="auth-b-google" disabled={loading || googleLoading} onClick={google}><Text as="span" aria-hidden="true">G</Text>{googleLoading ? 'Connecting…' : 'Continue with Google'}</Box><Box className="auth-b-divider">or continue with email</Box></>}
        {(mode==='login'||signup) && <Box as="form" onSubmit={submit}>
          {signup && <Box className="auth-b-name-row"><Field label="First name" name="first_name" autoComplete="given-name" required/><Field label="Last name" name="last_name" autoComplete="family-name" required/></Box>}
          <Field label="Email"><TextInput name="email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required/></Field>
          <Field label="Password"><TextInput name="password" type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder={signup ? 'Choose a password' : 'Your password'} autoComplete={signup ? 'new-password' : 'current-password'} required/></Field>
          {signup ? <><Box as="ul" className="auth-b-checklist" aria-label="Password requirements">{rules.map(rule=><Box as="li" key={rule.label} className={rule.met ? 'met' : ''}>{rule.met ? <Check size={12} aria-hidden="true"/> : <Circle size={10} aria-hidden="true"/>}<Text as="span">{rule.label}{rule.met ? ' · met' : ''}</Text></Box>)}</Box><Field label="Confirm password"><TextInput name="confirm_password" type="password" value={confirm} onChange={event=>setConfirm(event.target.value)} placeholder="Type it again" autoComplete="new-password" required/></Field>{confirm && <Text className={`auth-b-confirm${password===confirm ? ' matched' : ''}`} role="status">{password===confirm ? 'Passwords match' : 'Passwords do not match yet'}</Text>}</> : <Box as="button" type="button" className="auth-b-forgot" onClick={()=>switchMode('forgot')}>Forgot password?</Box>}
          {(localError || (!notice && error)) && <ErrorMessage message={localError || error}/>}
          <Button variant="primary" wide type="submit" disabled={loading}>{loading ? 'Connecting…' : signup ? 'Create account' : 'Log in'}</Button>
        </Box>}
        {(mode==='forgot'||mode==='unverified'||mode==='check-email'||mode==='reset') && <Box as="form" onSubmit={secondarySubmit}>
          {mode!=='reset' && <Field label="Email"><TextInput type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required/></Field>}
          {mode==='reset' && <><Field label="New password"><TextInput type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" minLength={8} required/></Field><Field label="Confirm new password"><TextInput type="password" value={confirm} onChange={event=>setConfirm(event.target.value)} autoComplete="new-password" minLength={8} required/></Field></>}
          {notice && <Box role="status" className="auth-b-help">{notice}</Box>}
          {(localError || (!notice && error)) && <ErrorMessage message={localError || error}/>}
          <Button variant="primary" wide type="submit" disabled={working || (mode==='reset' && !linkToken)}>{working?'Please wait…':mode==='reset'?'Reset password':mode==='forgot'?'Send reset link':'Resend verification email'}</Button>
        </Box>}
        {mode==='verify' && <Box role="status" className="auth-b-help">{working?'Verifying…':notice || localError}</Box>}
        {mode!=='login' && <Box as="button" type="button" className="auth-b-back" onClick={()=>switchMode('login')}>Back to login</Box>}
      </Box>
    </Box>
  </Box>;
}
