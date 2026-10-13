import React from 'react';

type RecorderPhase = 'idle' | 'requesting' | 'recording' | 'ready' | 'uploading';
const FORMATS = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];
const MAX_BYTES = 8388608;

// Shared FRA-10 capture lifecycle. Speaking exercises keep their authenticated
// transcription path; Conversation uses the same capture for local listen-back.
export function useAudioRecorder(maxSeconds = 60) {
  const [phase,setPhase]=React.useState<RecorderPhase>('idle');
  const [recordingError,setRecordingError]=React.useState('');
  const [elapsed,setElapsed]=React.useState(0);
  const [blob,setBlob]=React.useState<Blob|null>(null);
  const [previewUrl,setPreviewUrl]=React.useState('');
  const mounted=React.useRef(true);
  const generation=React.useRef(0);
  const stream=React.useRef<MediaStream|null>(null);
  const recorder=React.useRef<MediaRecorder|null>(null);
  const preview=React.useRef<string|null>(null);
  const cutoff=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const interval=React.useRef<ReturnType<typeof setInterval>|null>(null);
  const browserSupported=window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder!=='undefined';
  const stopTracks=React.useCallback(()=>{
    if(cutoff.current) clearTimeout(cutoff.current);
    if(interval.current) clearInterval(interval.current);
    cutoff.current=null;interval.current=null;
    stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
  },[]);
  const releasePreview=React.useCallback(()=>{
    if(preview.current) URL.revokeObjectURL(preview.current);
    preview.current=null;
    if(mounted.current) {setPreviewUrl('');setBlob(null);}
  },[]);
  const cancelRecording=React.useCallback(()=>{
    generation.current++;
    if(recorder.current) {
      recorder.current.onstop=null;recorder.current.ondataavailable=null;
      if(recorder.current.state!=='inactive') recorder.current.stop();
    }
    recorder.current=null;stopTracks();releasePreview();
    if(mounted.current) {setPhase('idle');setElapsed(0);setRecordingError('');}
  },[stopTracks,releasePreview]);
  React.useEffect(()=>{
    mounted.current=true;
    return()=>{mounted.current=false;cancelRecording();};
  },[cancelRecording]);
  async function startRecording() {
    if(!browserSupported || phase==='requesting' || phase==='recording' || phase==='uploading') return;
    const request=++generation.current;
    setRecordingError('');releasePreview();setPhase('requesting');
    try {
      const microphone=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current || request!==generation.current) {microphone.getTracks().forEach(track=>track.stop());return;}
      stream.current=microphone;
      const mimeType=FORMATS.find(value=>MediaRecorder.isTypeSupported(value));
      const current=mimeType ? new MediaRecorder(microphone,{mimeType}) : new MediaRecorder(microphone);
      recorder.current=current;
      const chunks:Blob[]=[];
      current.ondataavailable=event=>{if(event.data?.size) chunks.push(event.data);};
      current.onstop=()=>{
        stopTracks();
        if(!mounted.current || request!==generation.current) return;
        const recorded=new Blob(chunks,{type:current.mimeType || mimeType || ''});
        if(!recorded.size || recorded.size>MAX_BYTES) {
          setRecordingError(recorded.size ? 'This recording is too large. Try a shorter sample.' : 'No audio was recorded. Please try again.');setPhase('idle');return;
        }
        preview.current=URL.createObjectURL(recorded);setPreviewUrl(preview.current);setBlob(recorded);setPhase('ready');
      };
      current.onerror=()=>{
        current.onstop=null;stopTracks();
        if(mounted.current && request===generation.current) {setRecordingError('The recording failed. Please try again.');setPhase('idle');}
      };
      current.start();const start=performance.now();setElapsed(0);setPhase('recording');
      interval.current=setInterval(()=>setElapsed(Math.min(maxSeconds,Math.floor((performance.now()-start)/1000))),250);
      cutoff.current=setTimeout(()=>{if(current.state==='recording') current.stop();},Math.max(100,maxSeconds*1000-500));
    } catch {
      stopTracks();
      if(mounted.current && request===generation.current) {setRecordingError('Microphone access was denied or unavailable.');setPhase('idle');}
    }
  }
  function stopRecording() {if(recorder.current?.state==='recording') recorder.current.stop();}
  return {phase,setPhase,recordingError,setRecordingError,elapsed,blob,previewUrl,browserSupported,mounted,startRecording,stopRecording,releasePreview,cancelRecording};
}
