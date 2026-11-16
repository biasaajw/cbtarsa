// src/lib/cameraDetector.ts

export class CameraProctor {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private checkInterval: any = null;
  private audioContext: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private darkFrameCount: number = 0;

  // Callback ketika terjadi pelanggaran
  private onViolation: (reason: string) => void;

  constructor(onViolationCallback: (reason: string) => void) {
    this.onViolation = onViolationCallback;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.canvasElement = document.createElement('canvas');
  }

  // 1. Jalankan Pengawasan Kamera
  async startMonitoring() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: 15 }
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // Cek jika kamera mati/terputus dari peramban
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.triggerAlarm("Akses kamera terputus atau dimatikan!");
        };
        videoTrack.onmute = () => {
          this.triggerAlarm("Kamera di-mute atau tidak mengirimkan gambar!");
        };
      }

      // Mulai pemeriksaan frame secara berkala (tiap 500 ms)
      this.checkInterval = setInterval(() => this.analyzeFrame(), 500);

    } catch (err) {
      this.triggerAlarm("Kamera tidak diizinkan atau tidak ditemukan!");
    }
  }

  // 2. Analisis Frame (Deteksi Gelap Total / Kamera Ditutup Fisik)
  private analyzeFrame() {
    if (!this.videoElement || this.videoElement.readyState !== 4) return;

    const width = 80;
    const height = 60;
    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalBrightness = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Formula Kecerahan (Luminance)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / totalPixels;

    // Nilai kecerahan < 12 dikategorikan sebagai gelap total (tertutup)
    if (avgBrightness < 12) {
      this.darkFrameCount++;
      // Jika gelap bertahan ~2 detik (4 kali pemeriksaan berturut-turut)
      if (this.darkFrameCount >= 4) {
        this.triggerAlarm("Kamera terdeteksi ditutup secara fisik (gelap total)!");
      }
    } else {
      this.darkFrameCount = 0;
      if (this.isAlarmPlaying) {
        this.stopAlarm();
      }
    }
  }

  // 3. Membunyikan Alarm Sirine (Web Audio API)
  public triggerAlarm(reason: string) {
    this.onViolation(reason);

    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const alarmLoop = () => {
        if (!this.isAlarmPlaying || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // Frekuensi nada tinggi (A5)
        osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.5);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.8);
      };

      alarmLoop();
      const intervalId = setInterval(() => {
        if (!this.isAlarmPlaying) {
          clearInterval(intervalId);
          return;
        }
        alarmLoop();
      }, 1000);

    } catch (e) {
      console.error("Gagal memutar alarm audio:", e);
    }
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;
  }

  // Hentikan pengawasan saat keluar dari halaman ujian
  public stopMonitoring() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.stopAlarm();
  }
}
