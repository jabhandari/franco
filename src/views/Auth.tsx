import React from 'react';
import { BookOpen, RotateCcw, Flame, Check, Circle } from 'lucide-react';
import { apiGet, startGoogleSignIn } from '../api/client';
import { Box, Text, Field, TextInput, Button, ErrorMessage } from '../components/ui';

type AuthScreenProps = {mode:'login'|'signup';onModeChange:(mode:'login'|'signup')=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;loading:boolean;error:string};
export function AuthScreen({mode,onModeChange,onSubmit,loading,error}:AuthScreenProps) {
  const signup=mode==='signup';
  const [email,setEmail]=React.useState('');
  const [password,setPassword]=React.useState('');
  const [confirm,setConfirm]=React.useState('');
  const [localError,setLocalError]=React.useState('');
  const [passwordHelp,setPasswordHelp]=React.useState(false);
  const [googleLoading,setGoogleLoading]=React.useState(false);
  const rules=[{label:'At least 8 characters',met:password.length>=8},{label:'One uppercase letter',met:/[A-Z]/.test(password)},{label:'One number',met:/\d/.test(password)}];
  function changeMode(next:'login'|'signup') {setLocalError('');setPasswordHelp(false);onModeChange(next);}
  function submit(event:React.FormEvent<HTMLFormElement>) {
    setLocalError('');
    if(signup && (!rules.every(rule=>rule.met) || password!==confirm)) {
      event.preventDefault();setLocalError(password!==confirm ? 'Your passwords do not match.' : 'Choose a password that meets all three rules.');return;
    }
    onSubmit(event);
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
  return <Box as="main" className="auth-direction-b">
    <Box className="auth-b-card">
      <Box as="aside" className="auth-b-rail">
        <Box className="auth-b-brand"><Text as="span">fr</Text><Box><Text as="strong">Franco</Text><Text as="small">French learning platform</Text></Box></Box>
        <Text as="h1">Your French, kept in one place.</Text>
        <Box as="ul" className="auth-b-values"><Box as="li"><BookOpen size={18} aria-hidden="true"/><Text>Your progress saved</Text></Box><Box as="li"><RotateCcw size={18} aria-hidden="true"/><Text>Pick up where you left off</Text></Box><Box as="li"><Flame size={18} aria-hidden="true"/><Text>Your streak and scores kept</Text></Box></Box>
        <Box className="auth-b-saved"><Text as="small">Your learning space</Text><Text as="strong">Lessons · progress · practice</Text><Text>All saved to your account.</Text></Box>
      </Box>
      <Box as="section" className="auth-b-form">
        <Box className="auth-b-segments" role="group" aria-label="Account mode"><Box as="button" type="button" disabled={loading} aria-pressed={!signup} onClick={()=>changeMode('login')}>Log in</Box><Box as="button" type="button" disabled={loading} aria-pressed={signup} onClick={()=>changeMode('signup')}>Create account</Box></Box>
        <Text as="h2">{signup ? 'Create your account' : 'Welcome back'}</Text><Text className="auth-b-subtitle">{signup ? 'Save your level, your lessons and your progress.' : 'Pick up where you left off.'}</Text>
        <Box as="button" type="button" className="auth-b-google" disabled={loading || googleLoading} onClick={google}><Text as="span" aria-hidden="true">G</Text>{googleLoading ? 'Connecting…' : 'Continue with Google'}</Box>
        <Box className="auth-b-divider">or continue with email</Box>
        <Box as="form" onSubmit={submit}>
          {signup && <Box className="auth-b-name-row"><Field label="First name" name="first_name" autoComplete="given-name" required/><Field label="Last name" name="last_name" autoComplete="family-name" required/></Box>}
          <Field label="Email"><TextInput name="email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required/></Field>
          <Field label="Password"><TextInput name="password" type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder={signup ? 'Choose a password' : 'Your password'} autoComplete={signup ? 'new-password' : 'current-password'} required/></Field>
          {signup ? <>
            <Box as="ul" className="auth-b-checklist" aria-label="Password requirements">{rules.map(rule=><Box as="li" key={rule.label} className={rule.met ? 'met' : ''}>{rule.met ? <Check size={12} aria-hidden="true"/> : <Circle size={10} aria-hidden="true"/>}<Text as="span">{rule.label}{rule.met ? ' · met' : ''}</Text></Box>)}</Box>
            <Field label="Confirm password"><TextInput name="confirm_password" type="password" value={confirm} onChange={event=>setConfirm(event.target.value)} placeholder="Type it again" autoComplete="new-password" required/></Field>
            {confirm && <Text className={`auth-b-confirm${password===confirm ? ' matched' : ''}`} role="status">{password===confirm ? 'Passwords match' : 'Passwords do not match yet'}</Text>}
          </> : <Box as="a" href="#password-help" className="auth-b-forgot" onClick={event=>{event.preventDefault();setPasswordHelp(value=>!value);}} aria-expanded={passwordHelp}>Forgot password?</Box>}
          {passwordHelp && <Box id="password-help" role="status" className="auth-b-help">Password reset is not available yet. Sign in with your existing password; a reset flow is being developed.</Box>}
          {(localError || error) && <ErrorMessage message={localError || error}/>}
          <Button variant="primary" wide type="submit" disabled={loading}>{loading ? 'Connecting…' : signup ? 'Create account' : 'Log in'}</Button>
        </Box>
      </Box>
    </Box>
  </Box>;
}
