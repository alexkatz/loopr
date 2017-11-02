
// Ported this over from DSP.js - ak

// Copyright (c) 2010 Corban Brook

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

export class FFT {
  private bufferSize: number;
  private sampleRate: number;
  private bandWidth: number;

  private spectrum: Float32Array;
  private real: Float32Array;
  private imag: Float32Array;

  private peakBand: number;
  private peak: number;

  private reverseTable: Uint32Array;

  private sinTable: Float32Array;
  private cosTable: Float32Array;

  constructor(bufferSize: number, sampleRate: number) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandWidth = 2 / bufferSize * sampleRate / 2;
    this.spectrum = new Float32Array(bufferSize / 2);
    this.real = new Float32Array(bufferSize);
    this.imag = new Float32Array(bufferSize);
    this.peakBand = 0;
    this.peak = 0;
    this.reverseTable = new Uint32Array(bufferSize);

    let limit = 1;
    let bit = bufferSize >> 1;
    while (limit < bufferSize) {
      for (let i = 0; i < limit; i += 1) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit <<= 1;
      bit >>= 1;
    }

    this.sinTable = new Float32Array(bufferSize);
    this.cosTable = new Float32Array(bufferSize);

    for (let i = 0; i < bufferSize; i += 1) {
      this.sinTable[i] = Math.sin(-Math.PI / i);
      this.cosTable[i] = Math.cos(-Math.PI / i);
    }
  }

  public forward = (buffer: Float32Array) => {
    const bufferSize = this.bufferSize;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;
    const reverseTable = this.reverseTable;
    const real = this.real;
    const imag = this.imag;
    const spectrum = this.spectrum;
    const k = Math.floor(Math.log(bufferSize) / Math.LN2);

    if (Math.pow(2, k) !== bufferSize) { throw new Error('Invalid buffer size, must be a power of 2.'); }
    if (bufferSize !== buffer.length) { throw new Error('Supplied buffer is not the same size as defined FFT. FFT Size: ' + bufferSize + ' Buffer Size: ' + buffer.length); }

    let halfSize = 1;
    let phaseShiftStepReal;
    let phaseShiftStepImag;
    let currentPhaseShiftReal;
    let currentPhaseShiftImag;
    let off;
    let tr;
    let ti;
    let tmpReal;

    for (let i = 0; i < bufferSize; i += 1) {
      real[i] = buffer[reverseTable[i]];
      imag[i] = 0;
    }

    while (halfSize < bufferSize) {
      phaseShiftStepReal = cosTable[halfSize];
      phaseShiftStepImag = sinTable[halfSize];

      currentPhaseShiftReal = 1;
      currentPhaseShiftImag = 0;

      for (let fftStep = 0, i = fftStep; fftStep < halfSize; fftStep += 1, i = fftStep) {
        while (i < bufferSize) {
          off = i + halfSize;
          tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
          ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;

          i += halfSize << 1;
        }

        tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
        currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
      }

      halfSize = halfSize << 1;
    }

    this.calculateSpectrum();
  }

  public inverse = (real: Float32Array, imag: Float32Array, buffer: Float32Array) => {
    const bufferSize = this.bufferSize;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;
    const reverseTable = this.reverseTable;
    const spectrum = this.spectrum;

    real = real || this.real;
    imag = imag || this.imag;

    let halfSize = 1;
    let phaseShiftStepReal;
    let phaseShiftStepImag;
    let currentPhaseShiftReal;
    let currentPhaseShiftImag;
    let off;
    let tr;
    let ti;
    let tmpReal;

    for (let i = 0; i < bufferSize; i += 1) {
      imag[i] *= -1;
    }

    const revReal = new Float32Array(bufferSize);
    const revImag = new Float32Array(bufferSize);

    for (let i = 0; i < real.length; i += 1) {
      revReal[i] = real[reverseTable[i]];
      revImag[i] = imag[reverseTable[i]];
    }

    real = revReal;
    imag = revImag;

    while (halfSize < bufferSize) {
      phaseShiftStepReal = cosTable[halfSize];
      phaseShiftStepImag = sinTable[halfSize];
      currentPhaseShiftReal = 1;
      currentPhaseShiftImag = 0;

      for (let fftStep = 0, i = fftStep; fftStep < halfSize; fftStep += 1, i = fftStep) {
        while (i < bufferSize) {
          off = i + halfSize;
          tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
          ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;

          i += halfSize << 1;
        }

        tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
        currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
      }

      halfSize = halfSize << 1;
    }

    for (let i = 0; i < bufferSize; i += 1) {
      buffer[i] = real[i] / bufferSize;
    }
  }

  private calculateSpectrum = () => {
    const N = this.bufferSize / 2;
    const spectrum = this.spectrum;
    const real = this.real;
    const imag = this.imag;
    const bSi = 2 / this.bufferSize;
    const sqrt = Math.sqrt;
    let rval;
    let ival;
    let mag;
    for (let i = 0, N; i < N; i++) {
      rval = real[i];
      ival = imag[i];
      mag = bSi * sqrt(rval * rval + ival * ival);
      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }
      spectrum[i] = mag;
    }
  }
}
