# FRA-132 browser pronunciation feasibility

Open `/pronunciation-spike` while signed in on the PR preview. The route is deliberately absent from navigation and never uploads audio. It is a **feasibility test**, not learner feedback: decoded phonemes alone are not a pronunciation grade.

The worker pins `qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX` at revision `d2987af7ae07d53eafee15dc7190479062faa1e8`, downloads its q4 model (241 MB), and uses Transformers.js on WASM. Recording decoding and resampling produce 16 kHz mono PCM. The worker runs greedy CTC decoding (argmax, collapse repeats, then remove blank) and reports model load and inference times. The model and metadata may be cached by the browser; Safari may evict them. The current Read Aloud path and Groq fallback are untouched.

## Required device test before integration

1. On Samyak's iPhone in Safari, use Wi-Fi and open the PR preview's `/pronunciation-spike` route. Check the download box and analyze a 3-second French recording. Record cold load time, inference time, and whether Safari stays responsive. Reload and repeat to verify the model cache.
2. Repeat with 1-second and 5-second clips. Use Safari Web Inspector or Instruments from a Mac to measure peak memory; browser JavaScript cannot reliably report Safari's process memory. The ticket's gates are about 8 seconds for a 3-second clip and about 400 MB peak memory.
3. Run the twelve clips from the original spike report, including `ouais_en`, `merci_bad`, and `bonjour_bad`. Compare detected phone substitutions against the Python reference. The report and clips were not available in this workspace, so this parity check remains open.
4. Repeat one 3-second clip in desktop Chrome. Test quiet and very short recordings; the page must show an error rather than phoneme output.

If the iPhone gates fail, stop the browser route and evaluate the server option. If they pass, the next implementation must add offline espeak-ng reference phonemes to content revisions, CTC forced alignment against those references, calibrated per-phone and per-word feedback on real learner audio, and an opt-in download and fallback in the Read Aloud exercise. Recognition output from this spike must not be used as a score. The model's published q4 accuracy comparison used two non-French clips, so it does not validate French learner feedback.
