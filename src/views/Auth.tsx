import React from 'react';
import { ArrowRight, BookOpen, Check, Circle, Gamepad2, Sparkles } from 'lucide-react';
import { apiGet, apiPost, getErrorMessage, startGoogleSignIn } from '../api/client';
import { Box, Text, Field, TextInput, Button, ErrorMessage, SuccessMessage, ProductTour, WelcomeHighlights, TypewriterText } from '../components/ui';
import type { AuthMode } from '../types';

type AuthScreenProps = {mode:AuthMode;onModeChange:(mode:AuthMode)=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;loading:boolean;error:string;onPasswordReset:()=>void};
const linkToken = new URLSearchParams(window.location.search).get('token');
if (linkToken && ['/verify-email','/reset-password'].includes(window.location.pathname)) window.history.replaceState({},'',window.location.pathname);

export function AuthScreen({mode,onModeChange,onSubmit,loading,error,onPasswordReset}:AuthScreenProps) {
  const signup=mode==='signup';
  const marketing=mode==='login'||signup;
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
    setLocalError('');setNotice('');
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
        const result=await apiPost<{message:string}>('/api/auth/reset-password',{token:linkToken,password});
        setPassword('');setConfirm('');setNotice(result.message);onPasswordReset();
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
  return <Box as="main" className={`${marketing ? 'auth-direction-b auth-landing' : 'auth-direction-b'} auth-enter`}>
    {marketing && <Box as="header" className="auth-landing-header">
      <Box className="auth-b-brand"><Text as="span">fr</Text><Box><Text as="strong">Franco</Text><Text as="small">French, made a little brighter</Text></Box></Box>
      <Box as="nav" className="auth-landing-nav" aria-label="Welcome page"><Box as="a" href="#discover">Explore Franco</Box><Box as="a" href="#how-it-works">How it works</Box></Box>
      <Box as="button" type="button" className="auth-landing-header-cta" onClick={()=>{switchMode(signup ? 'login' : 'signup');document.getElementById('auth-form')?.scrollIntoView();}}>{signup ? 'Log in' : 'Get started'} <ArrowRight size={16} aria-hidden="true" /></Box>
    </Box>}
    <Box className="auth-b-card">
      <Box as="aside" className="auth-b-rail">
        {marketing ? <>
          <Text className="auth-hero-kicker">FRENCH THAT GOES PLACES <Text as="span">✳</Text></Text>
          <Text as="h1" className="auth-hero-title">A little French can take you <TypewriterText text="a long way..." className="auth-hero-title-tail" startDelayMs={650} charMs={115} /></Text>
          <Text className="auth-hero-lede">A lively place to learn, practice and play — one small win at a time.</Text>
          <Box className="auth-hero-pills" aria-label="Ways to learn"><Text as="span"><BookOpen size={15} aria-hidden="true"/> Learn</Text><Text as="span"><Sparkles size={15} aria-hidden="true"/> Practice</Text><Text as="span"><Gamepad2 size={15} aria-hidden="true"/> Play</Text></Box>
          <ProductTour />
        </> : <><Box className="auth-b-brand"><Text as="span">fr</Text><Box><Text as="strong">Franco</Text><Text as="small">French learning platform</Text></Box></Box><Box className="auth-b-simple"><Text as="h1">Your French, kept in one place.</Text><Text>One step closer to your next lesson.</Text></Box></>}
      </Box>
      <Box as="section" className="auth-b-form" id="auth-form">
        {(mode==='login'||signup) && <Box className="auth-b-segments" role="group" aria-label="Account mode"><Box as="button" type="button" disabled={loading} aria-pressed={!signup} onClick={()=>switchMode('login')}>Log in</Box><Box as="button" type="button" disabled={loading} aria-pressed={signup} onClick={()=>switchMode('signup')}>Create account</Box></Box>}
        <Text as="h2">{mode==='verify' && notice ? 'Email verified' : title[mode]}</Text>
        <Text className="auth-b-subtitle">{signup?'Save your level, your lessons and your progress.':mode==='login'?'Pick up where you left off.':mode==='verify' ? notice ? 'Your address is confirmed. You can now log in.' : working ? 'Confirming your email address.' : localError ? 'We could not confirm your email address.' : 'Confirming your email address.':mode==='reset'?'Enter a new password for your account.':'We will email you a secure link if the address is eligible.'}</Text>
        {mode==='login' && notice && <SuccessMessage message={notice}/>}
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
          {mode==='reset' && localError.includes('invalid or expired') && <Box as="button" type="button" className="auth-b-back" onClick={()=>switchMode('forgot')}>Request a new reset link</Box>}
          <Button variant="primary" wide type="submit" disabled={working || (mode==='reset' && !linkToken)}>{working?'Please wait…':mode==='reset'?'Reset password':mode==='forgot'?'Send reset link':'Resend verification email'}</Button>
        </Box>}
        {mode==='verify' && notice && <SuccessMessage message={notice}/>}
        {mode==='verify' && working && <Box role="status" className="auth-b-help">Verifying…</Box>}
        {mode==='verify' && localError && <ErrorMessage message={localError}/>}
        {mode!=='login' && <Box as="button" type="button" className="auth-b-back" onClick={()=>switchMode('login')}>Back to login</Box>}
      </Box>
    </Box>
    {marketing && <><WelcomeHighlights />
      <Box as="section" className="auth-landing-closer" id="how-it-works">
        <Box><Text className="welcome-section-kicker">YOUR NEXT CHAPTER STARTS HERE</Text><Text as="h2">Start small. Keep going. Enjoy the journey.</Text><Text>Make room for a little French today. Franco will help you find the next step.</Text></Box>
        <Box as="button" type="button" onClick={()=>{switchMode('signup');document.getElementById('auth-form')?.scrollIntoView();}}>Create your account <ArrowRight size={18} aria-hidden="true" /></Box>
      </Box>
      <Box as="footer" className="auth-landing-footer"><Text>Franco · French learning, one day at a time.</Text></Box>
    </>}
  </Box>;
}
