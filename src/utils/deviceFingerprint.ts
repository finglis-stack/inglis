import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceFingerprint {
  visitorId: string;
  confidence: number;
  components: {
    userAgent: string;
    language: string;
    colorDepth: number;
    deviceMemory?: number;
    hardwareConcurrency: number;
    screenResolution: string;
    availableScreenResolution: string;
    timezoneOffset: number;
    timezone: string;
    sessionStorage: boolean;
    localStorage: boolean;
    indexedDb: boolean;
    addBehavior: boolean;
    openDatabase: boolean;
    cpuClass?: string;
    platform: string;
    plugins: string[];
    canvas: string;
    webgl: string;
    webglVendorAndRenderer: string;
    adBlock: boolean;
    hasLiedLanguages: boolean;
    hasLiedResolution: boolean;
    hasLiedOs: boolean;
    hasLiedBrowser: boolean;
    touchSupport: {
      maxTouchPoints: number;
      touchEvent: boolean;
      touchStart: boolean;
    };
    fonts: string[];
    audio: string;
  };
}

let fpPromise: Promise<any> | null = null;

export const initFingerprint = () => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
};

export const getDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const fp = await initFingerprint();
  const result = await fp.get();

  // Canvas fingerprinting
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasFingerprint = '';
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Q12x Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Q12x Fingerprint', 4, 17);
    canvasFingerprint = canvas.toDataURL();
  }

  // WebGL fingerprinting
  const webglCanvas = document.createElement('canvas');
  const gl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');
  let webglFingerprint = '';
  let webglVendor = '';
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + '~' + gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    webglFingerprint = gl.getParameter(gl.VERSION) + '~' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
  }

  // Audio fingerprinting
  let audioFingerprint = '';
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    gainNode.gain.value = 0;
    oscillator.type = 'triangle';
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(0);

    scriptProcessor.onaudioprocess = function(event) {
      const output = event.outputBuffer.getChannelData(0);
      audioFingerprint = Array.from(output.slice(0, 30)).join(',');
    };

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 100);
  } catch (e) {
    audioFingerprint = 'unavailable';
  }

  // Detect installed fonts
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino',
    'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Impact'
  ];
  const detectedFonts: string[] = [];
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const canvas2 = document.createElement('canvas');
  const ctx2 = canvas2.getContext('2d');
  
  if (ctx2) {
    const baseFontWidths: { [key: string]: number } = {};
    baseFonts.forEach(baseFont => {
      ctx2.font = testSize + ' ' + baseFont;
      baseFontWidths[baseFont] = ctx2.measureText(testString).width;
    });

    testFonts.forEach(font => {
      let detected = false;
      baseFonts.forEach(baseFont => {
        ctx2.font = testSize + ' ' + font + ', ' + baseFont;
        const width = ctx2.measureText(testString).width;
        if (width !== baseFontWidths[baseFont]) {
          detected = true;
        }
      });
      if (detected) {
        detectedFonts.push(font);
      }
    });
  }

  return {
    visitorId: result.visitorId,
    confidence: result.confidence.score,
    components: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenResolution: `${screen.width}x${screen.height}`,
      availableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionStorage: !!window.sessionStorage,
      localStorage: !!window.localStorage,
      indexedDb: !!window.indexedDB,
      addBehavior: !!(document.body as any).addBehavior,
      openDatabase: !!window.openDatabase,
      cpuClass: (navigator as any).cpuClass,
      platform: navigator.platform,
      plugins: Array.from(navigator.plugins).map(p => p.name),
      canvas: canvasFingerprint,
      webgl: webglFingerprint,
      webglVendorAndRenderer: webglVendor,
      adBlock: false, // Simplified, can be enhanced
      hasLiedLanguages: false,
      hasLiedResolution: false,
      hasLiedOs: false,
      hasLiedBrowser: false,
      touchSupport: {
        maxTouchPoints: navigator.maxTouchPoints,
        touchEvent: 'ontouchstart' in window,
        touchStart: 'ontouchstart' in window,
      },
      fonts: detectedFonts,
      audio: audioFingerprint,
    },
  };
};