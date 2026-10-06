// Grabadora de la banda sonora y los efectos de dub-siege.html (la usa tools/rec_audio.py).
// Se evalua DENTRO del cierre del juego con DS.ev (pagina abierta con #debug), asi que ve
// AC, MZ, audioOn, mzSong, mzStep, mzBar, sfx, mode, run, bossMusic... tal cual.
// Cambia el AudioContext por un OfflineAudioContext y simula el reloj en vivo: suspende el
// render cada CH segundos, programa los pasos hasta now+MZ.LA (como sched()) y reanuda, para
// que la gestion de voces (mzSleep/mzWake, currentTime) se comporte como en el juego.
(function () {
  var SR = 44100, CH = 0.05, T0 = 0.1, XF = 0.04;
  // el juego queda congelado: solo nos interesa su motor de audio
  update = function () {}; draw = function () {};
  function ctxOf(len) {
    var realSI = window.setInterval;
    window.AudioContext = window.webkitAudioContext = function () { return new OfflineAudioContext(2, len, SR); };
    window.setInterval = function () { return 0; };     // sin sched() en tiempo real
    try { AC = null; MZ.mk = {}; MZ.cut = 0; MZ.lpd = 0; MZ.pz = false; SET.mute = false; audioOn(); }
    finally { window.setInterval = realSI; }
    MZ.mute = false;
    return AC;
  }
  function send(name, buf, from, n) {
    var ch = buf.numberOfChannels, L = buf.getChannelData(0), R = buf.getChannelData(ch > 1 ? 1 : 0);
    var out = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) { out[2 * i] = L[from + i] || 0; out[2 * i + 1] = R[from + i] || 0; }
    return fetch('/save?name=' + encodeURIComponent(name), { method: 'POST', body: out.buffer }).then(function (r) { return r.text(); });
  }
  // Semilla por compas: el azar del arreglo (dub, repetidor, matices) depende solo de la
  // cancion y del compas dentro del bucle, asi P1/P2/P3 toman las mismas decisiones y la
  // segunda vuelta repite la primera (bucle sin costura).
  var origBar = mzBar;
  function seedBar(song, loop) {
    mzBar = function (at) {
      var b = ((MZ.fb + 1) % loop + loop) % loop;
      MZ.rnd = mzRn((Math.imul(b + 1, -1640531535) ^ (song * 977 + 5)) | 0);
      origBar(at);
    };
  }
  // G: 'C' calma, 'P' juego (I=1..3), 'X' jefe. Graba pre compases de calentamiento (la cola del
  // final del bucle: eco, muelle, voces ligadas, filtro del dub) y despues el bucle; devuelve el bucle.
  function music(name, song, G, I, loop, pre) {
    var S = SONGS[song], sp = 60 / S.bpm / 4, bar = 16 * sp;
    var dur = T0 + (pre + loop) * bar + 0.3, len = Math.ceil(dur * SR);
    var ac = ctxOf(len);
    while (MZ.jobs.length) mzWork(1e9);
    mode = G === 'C' ? 'menu' : 'play'; run = { mult: I >= 3 ? 6 : I === 2 ? 3 : 1 }; bossMusic = G === 'X' ? 1 : 0; songIdx = song;
    mzSong(song);
    // ya estamos dentro del grupo (sin entrada): el compas siguiente es loop-pre
    MZ.G = G; MZ.fb = loop - pre - 1; MZ.lpd = 1;
    MZ.trim.gain.setValueAtTime(S.g * (G === 'C' ? S.gc || 1 : G === 'X' ? S.gx || 1 : 1), 0);
    seedBar(song, loop);
    MZ.stats.late = 0;
    nextStep = T0; MZ.k = 0;
    function tick() {
      var now = ac.currentTime;
      while (nextStep < now + MZ.LA) { mzStep(nextStep); nextStep += MZ.sp; stepN++; MZ.k = (MZ.k + 1) & 15; }
    }
    tick();
    for (var t = CH; t < dur - 0.01; t += CH) {
      ac.suspend(t).then(function () { tick(); ac.resume(); });
    }
    return ac.startRendering().then(function (buf) {
      mzBar = origBar;
      var from = Math.round((T0 + pre * bar) * SR), n = Math.round(loop * bar * SR);
      var late = MZ.stats.late, xf = Math.round(XF * SR);
      // n muestras del bucle + xf de lo que sigue (para fundir la costura en Python)
      return send(name, buf, from, n + xf).then(function () { return { name: name, n: n, xf: xf, from: from, late: late, bpm: S.bpm, bar: bar }; });
    });
  }
  function effect(name, k, secs) {
    var len = Math.ceil(secs * SR), ac = ctxOf(len);
    MZ.jobs = [];                      // los instrumentos de la musica no hacen falta
    mode = 'menu'; songIdx = 0;
    sfx(k);
    return ac.startRendering().then(function (buf) { return send(name, buf, 0, len).then(function () { return { name: name, n: len }; }); });
  }
  window.REC = { music: music, effect: effect, songs: SONGS.map(function (s) { return { bpm: s.bpm, fm: s.fm || 'ABAD' }; }) };
})();
