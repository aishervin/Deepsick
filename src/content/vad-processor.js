export class VADProcessor {
  constructor(options = {}) {
    this.silenceTimeout = options.silenceTimeout || 1500;
    this.hangoverFrames = options.hangoverFrames || 8;
    this.minSpeechFrames = options.minSpeechFrames || 3;
    this.thresholdMultiplier = options.thresholdMultiplier || 1.5;
    this.minThreshold = options.minThreshold || 0.015;
    this.speechBandLow = options.speechBandLow || 300;
    this.speechBandHigh = options.speechBandHigh || 3400;

    this.state = 'silent';
    this.speechFrames = 0;
    this.silenceFrames = 0;
    this.lastSpeechTime = 0;
    this.noiseFloor = 0;
    this.isRunning = false;

    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onVADStop = null;
    this.onEnergyUpdate = null;

    this._audioContext = null;
    this._stream = null;
    this._source = null;
    this._analyser = null;
    this._rafId = null;
    this._stopped = false;
  }

  async start() {
    if (this.isRunning) return;

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._audioContext = new AudioContext();
    this._source = this._audioContext.createMediaStreamSource(this._stream);
    this._analyser = this._audioContext.createAnalyser();

    this._analyser.fftSize = 1024;
    this._analyser.smoothingTimeConstant = 0.8;

    this._source.connect(this._analyser);

    this.isRunning = true;
    this.state = 'silent';
    this.speechFrames = 0;
    this.silenceFrames = 0;
    this.lastSpeechTime = 0;
    this.noiseFloor = 0;
    this._stopped = false;

    this._processFrame();
  }

  stop() {
    this.isRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._audioContext) {
      this._audioContext.close().catch(() => {});
      this._audioContext = null;
    }
    this._source = null;
    this._analyser = null;
    this.state = 'silent';
    this.speechFrames = 0;
    this.silenceFrames = 0;
  }

  _processFrame() {
    if (!this.isRunning) return;

    const timeDomain = new Uint8Array(this._analyser.fftSize);
    const freqData = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteTimeDomainData(timeDomain);
    this._analyser.getByteFrequencyData(freqData);

    const rms = this._computeRMS(timeDomain);
    const speechEnergy = this._computeSpeechBandEnergy(freqData);
    const zcr = this._computeZCR(timeDomain);

    if (this.noiseFloor === 0) {
      this.noiseFloor = overallEnergy(rms, speechEnergy);
    } else {
      const e = overallEnergy(rms, speechEnergy);
      if (e < this.noiseFloor * 1.15) {
        this.noiseFloor += (e - this.noiseFloor) * 0.008;
      } else {
        this.noiseFloor += (e - this.noiseFloor) * 0.002;
      }
    }
    this.noiseFloor = Math.max(this.noiseFloor, 0.001);

    const threshold = Math.max(
      this.noiseFloor * this.thresholdMultiplier,
      this.minThreshold
    );

    const zcrInSpeechRange = zcr > 0.02 && zcr < 0.4;
    const isSpeech = (rms > threshold || speechEnergy > threshold * 0.75) && zcrInSpeechRange;

    const prevState = this.state;

    if (isSpeech) {
      this.speechFrames++;
      this.silenceFrames = 0;
      this.lastSpeechTime = performance.now();

      if (this.speechFrames >= this.minSpeechFrames && this.state === 'silent') {
        this.state = 'speaking';
        if (this.onSpeechStart) this.onSpeechStart();
      }
    } else {
      this.speechFrames = 0;

      if (this.state === 'speaking') {
        this.silenceFrames++;
        if (this.silenceFrames >= this.hangoverFrames) {
          this.state = 'silent';
          this.lastSpeechTime = performance.now();
          if (this.onSpeechEnd) this.onSpeechEnd();
        }
      }
    }

    if (this.state === 'silent' && this.lastSpeechTime > 0 && prevState === 'silent') {
      const silenceDuration = performance.now() - this.lastSpeechTime;
      if (silenceDuration >= this.silenceTimeout && !this._stopped) {
        this._stopped = true;
        if (this.onVADStop) this.onVADStop();
        this.stop();
        return;
      }
    }

    if (this.onEnergyUpdate) {
      this.onEnergyUpdate({
        rms,
        speechEnergy,
        zcr,
        threshold,
        noiseFloor: this.noiseFloor,
        isSpeech,
        state: this.state,
      });
    }

    this._rafId = requestAnimationFrame(() => this._processFrame());
  }

  _computeRMS(timeDomain) {
    let sumSquares = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const normalized = (timeDomain[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    return Math.sqrt(sumSquares / timeDomain.length);
  }

  _computeSpeechBandEnergy(freqData) {
    const sampleRate = this._audioContext ? this._audioContext.sampleRate : 48000;
    const nyquist = sampleRate / 2;
    const binLow = Math.floor((this.speechBandLow / nyquist) * freqData.length);
    const binHigh = Math.ceil((this.speechBandHigh / nyquist) * freqData.length) - 1;

    let sum = 0;
    let count = 0;
    for (let i = binLow; i <= binHigh && i < freqData.length; i++) {
      sum += freqData[i];
      count++;
    }
    return count > 0 ? sum / (count * 255) : 0;
  }

  _computeZCR(timeDomain) {
    let crossings = 0;
    for (let i = 1; i < timeDomain.length; i++) {
      if ((timeDomain[i] - 128) * (timeDomain[i - 1] - 128) < 0) {
        crossings++;
      }
    }
    return crossings / timeDomain.length;
  }
}

function overallEnergy(rms, speechEnergy) {
  return (rms * 0.5 + speechEnergy * 0.5);
}
