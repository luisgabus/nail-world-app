import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, RefreshCw, CheckCircle2, Image as ImageIcon } from 'lucide-react';

type Tab = 'camera' | 'gallery';

export function PlateScannerModal({
  onClose,
  onPhotoCaptured,
}: {
  onClose: () => void;
  onPhotoCaptured: (photoUrl: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('camera');
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    stopCamera();
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('No se pudo acceder a la cámara. Verifica permisos o usa Subir desde Galería.');
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play()
      .then(() => setCameraReady(true))
      .catch((err) => console.error('Video play error:', err));
  };

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const imageSrc = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(imageSrc);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.onerror = () => setError('No se pudo cargar la imagen.');
    reader.readAsDataURL(file);
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    if (tab === 'camera') {
      startCamera();
    } else {
      fileInputRef.current?.click();
    }
  }, [tab, startCamera]);

  const switchTab = useCallback((newTab: Tab) => {
    if (newTab === tab) return;
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setTab(newTab);
    if (newTab === 'camera') {
      startCamera();
    } else {
      fileInputRef.current?.click();
    }
  }, [tab, startCamera, stopCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
    }
  }, [capturedImage, onPhotoCaptured]);

  const showVideo = tab === 'camera' && !capturedImage;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-cyan-200 p-6 w-full max-w-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center">
              <Camera className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fotografía de Soporte</h2>
              <p className="text-sm text-slate-500">Toma una foto del cliente</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Preview area */}
        <div className="relative rounded-2xl overflow-hidden bg-[#F8FAFC] aspect-video mb-3">
          {/* Live video */}
          {showVideo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover"
            />
          )}
          {/* Captured / uploaded image */}
          {capturedImage && (
            <img src={capturedImage} alt="Foto de soporte" className="w-full h-full object-contain" />
          )}

          {/* Guide frame overlay (only during live camera) */}
          {showVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[80%] h-[60%] border-2 border-cyan-300 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-rose-300 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-rose-300 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-rose-300 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-rose-300 rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Camera not ready hint */}
          {showVideo && !cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-slate-500">Iniciando cámara...</p>
            </div>
          )}
        </div>

        {/* Main action button */}
        <div className="mb-3">
          {showVideo && (
            <button
              onClick={captureFrame}
              disabled={!cameraReady}
              className="action-control w-full py-4 bg-gradient-to-br from-cyan-500 to-rose-600 border border-rose-200/80 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" /> Capturar Foto
            </button>
          )}
          {capturedImage && (
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="action-control action-surface flex-1 py-3 border border-rose-200/80 text-slate-600 font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> {tab === 'camera' ? 'Tomar otra' : 'Cambiar'}
              </button>
              <button
                onClick={confirmPhoto}
                className="action-control flex-1 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-rose-200/80 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Usar esta Foto
              </button>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => switchTab('camera')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === 'camera'
                ? 'bg-cyan-50 text-rose-500 border border-cyan-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-4 h-4" /> Usar Cámara
          </button>
          <button
            onClick={() => switchTab('gallery')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === 'gallery'
                ? 'bg-cyan-50 text-rose-500 border border-cyan-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Subir desde Galería
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
