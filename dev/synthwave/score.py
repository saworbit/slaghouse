"""SLAGHOUSE soundtrack: original synthwave / darksynth compositions.

Every track is built from per-bar chords, a bass pattern, arps, pads, a lead melody and drum lanes. Times are
in 16th-note steps until Track.notes() converts them to seconds.

Melody syntax: 'note/len' (len in 16ths, sticky), 'r' rest, '-' tie (extends the previous note), '|' bar line;
every bar must add up to 16.
"""

PC = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'maj7': (0, 4, 7, 11),
        'sus2': (0, 2, 7), 'sus4': (0, 5, 7), 'dim': (0, 3, 6), 'add9': (0, 4, 7, 14), 'madd9': (0, 3, 7, 14),
        '5': (0, 7), 'b9': (0, 4, 7, 13)}


def midi(tok):
    n, i = PC[tok[0].lower()], 1
    while i < len(tok) and tok[i] in '#b':
        n += 1 if tok[i] == '#' else -1
        i += 1
    return n + 12 * (int(tok[i:]) + 1)


def chord(sym):
    root, i = PC[sym[0].lower()], 1
    while i < len(sym) and sym[i] in '#b':
        root += 1 if sym[i] == '#' else -1
        i += 1
    return root % 12, QUAL[sym[i:]]


def melody(s, name=''):
    """-> [[midi, start_step, len_steps], ...] relative to the phrase start."""
    out, t, ln = [], 0, 4
    for bi, bar in enumerate(s.strip().strip('|').split('|')):
        bt = 0
        for tok in bar.split():
            if '/' in tok:
                tok, l = tok.split('/')
                ln = int(l)
            if tok == '-':
                out[-1][2] += ln
            elif tok != 'r':
                out.append([midi(tok), t, ln])
            t += ln
            bt += ln
        if bt != 16:
            raise ValueError(f'{name} bar {bi + 1}: {bt} steps')
    return out


def voicing(root, ivs, prev, lo=52, hi=77):
    """Close voicing of the chord nearest the previous one (smooth pad voice leading)."""
    base = sorted(48 + root + i for i in ivs)
    cands = []
    for sh in (-12, 0, 12):
        v = [p + sh for p in base]
        for _ in range(len(v)):
            if v[0] >= lo and v[-1] <= hi:
                cands.append(list(v))
            v = sorted(v[1:] + [v[0] + 12])
    if not cands:
        cands = [base]
    ref = prev or [62] * len(base)
    def dist(c):
        return sum(min(abs(p - q) for q in ref) for p in c) + abs(sum(c) / len(c) - 63) * 0.3
    return min(cands, key=dist)


BASS = {   # per bar: (step, len, semitones, vel)
    'pump8': [(s, 2, 0, 1.0 if s % 4 == 0 else 0.8) for s in range(0, 16, 2)],
    'oct16': [(s, 1, 12 if s % 4 == 2 else 0, 1.0 if s % 4 == 0 else 0.75) for s in range(16)],
    'drive16': [(s, 1, 0, (1.0, 0.6, 0.8, 0.65)[s % 4]) for s in range(16)],
    'gallop': [x for b in range(0, 16, 4) for x in ((b, 2, 0, 1.0), (b + 2, 1, 0, 0.7), (b + 3, 1, 12, 0.8))],
    'growl16': [(s, 1, (0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 12, 0, 0, 7, 0, 12)[s], (1.0, 0.6, 0.85, 0.6)[s % 4]) for s in range(16)],
    'whole': [(0, 16, 0, 1.0)],
    'half': [(0, 8, 0, 1.0), (8, 8, 0, 0.85)],
    'hits': [(0, 3, 0, 1.0), (6, 2, 0, 0.8), (10, 3, 0, 0.9)],
}


class Track:
    def __init__(self, name, title, bpm, bars, loop=True, tail=3.0):
        self.name, self.title, self.bpm, self.bars, self.loop, self.tail = name, title, bpm, bars, loop, tail
        self.step = 60.0 / bpm / 4
        self.parts = {}            # part -> [(midi, start_step, len_steps, vel)]
        self.patch = {}            # part -> (kind 'poly'|'mono', patch name)
        self.mix = {}              # part -> dict(rev, dly, chorus, sc, gain, pan)
        self.drums = []            # (kind, step, vel)
        self.chords = [None] * bars
        self.master = dict(rev_rt=2.6, dly=3)      # hall rt60, delay in 16ths

    # -- harmony
    def set_chords(self, spec):
        bars = [b for b in spec.replace('|', ' ').split()]
        assert len(bars) == self.bars, (self.name, len(bars))
        self.chords = [[chord(c) for c in b.split(',')] for b in bars]

    def _chords_in(self, bar):
        cs = self.chords[bar]
        L = 16 // len(cs)
        return [(i * L, L, r, iv) for i, (r, iv) in enumerate(cs)]

    def add(self, part, kind, patch, **mix):
        self.parts.setdefault(part, [])
        self.patch[part] = (kind, patch)
        self.mix[part] = dict(dict(rev=0.0, dly=0.0, chorus=0.0, sc=0.0, gain=1.0), **mix)

    # -- writers (bars are 0-based ranges)
    def pad(self, part, bars, vel=0.8, oct=0):
        prev = None
        for b in bars:
            for s, L, r, iv in self._chords_in(b):
                v = voicing(r, iv, prev)
                prev = v
                for p in v:
                    self.parts[part].append((p + 12 * oct, b * 16 + s, L, vel))

    def bass(self, part, bars, pattern, vel=1.0, oct=0):
        for b in bars:
            for s0, L, r, iv in self._chords_in(b):
                root = 33 + (r - 9) % 12                       # A1 .. G#2
                for s, l, semi, v in BASS[pattern]:
                    if s0 <= s < s0 + L:
                        self.parts[part].append((root + semi + 12 * oct, b * 16 + s, min(l, s0 + L - s), v * vel))

    def arp(self, part, bars, style='up', rate=1, base=57, octaves=2, vel=0.8, gate=0.9):
        k = 0
        for b in bars:
            for s0, L, r, iv in self._chords_in(b):
                pcs = {(r + i) % 12 for i in iv}
                tones = [p for p in range(base, base + 12 * octaves + 1) if p % 12 in pcs]
                seq = tones + tones[-2:0:-1] if style == 'updown' else tones
                for s in range(s0, s0 + L, rate):
                    acc = 1.0 if (s % 4 == 0) else 0.75
                    self.parts[part].append((seq[k % len(seq)], b * 16 + s, rate * gate, vel * acc))
                    k += 1

    def stabs(self, part, bars, rhythm, vel=0.9, oct=0):
        """rhythm: 16-char string, 'x' = chord hit lasting until the next hit or '.' gap of 2."""
        prev = None
        for b in bars:
            hits = [i for i, ch in enumerate(rhythm) if ch in 'xo']
            for j, s in enumerate(hits):
                cs = [c for c in self._chords_in(b) if c[0] <= s < c[0] + c[1]][0]
                v = voicing(cs[2], cs[3], prev)
                prev = v
                ln = (hits[j + 1] - s) if j + 1 < len(hits) else 16 - s
                for p in v:
                    self.parts[part].append((p + 12 * oct, b * 16 + s, max(1, min(ln, 3)) * 0.8, vel * (1 if rhythm[s] == 'x' else 0.6)))

    def lead(self, part, bar, mel, vel=0.9, oct=0):
        for m, s, l in melody(mel, f'{self.name}/{part}'):
            self.parts[part].append((m + 12 * oct, bar * 16 + s, l, vel))

    def beat(self, bars, **lanes):
        for b in bars:
            for kind, pat in lanes.items():
                assert len(pat) == 16, (self.name, kind, pat)
                for s, ch in enumerate(pat):
                    if ch != '.':
                        self.drums.append((kind, b * 16 + s, {'x': 1.0, 'o': 0.6, 'g': 0.35}[ch]))

    def fx(self, kind, bar, step=0, vel=1.0, dur_steps=16):
        self.drums.append((kind, bar * 16 + step, vel, dur_steps))


R = range
TRACKS = {}


def track(fn):
    t = fn()
    TRACKS[t.name] = t
    return fn


# =================================================================================================
@track
def stage1():
    """MELT FLOOR - A minor, 118 BPM. Classic driving synthwave: pumping bass, plucked arps, a big singing lead."""
    t = Track('stage1', 'MELT FLOOR', 118, 32)
    t.set_chords('Am F C G Am F C G | Am F C G Am F C G | F G Em Am F G Esus4 E | Am F C G Am F C G')
    t.add('pad', 'poly', 'pad', rev=0.35, chorus=0.6, sc=0.6, gain=0.9)
    t.add('bass', 'mono', 'bass', sc=0.45)
    t.add('arp', 'poly', 'arp', rev=0.2, dly=0.35, sc=0.3, gain=0.9)
    t.add('lead', 'mono', 'lead', rev=0.28, dly=0.3)
    t.add('lead2', 'mono', 'lead', rev=0.3, dly=0.3, gain=0.45)
    t.pad('pad', R(0, 32))
    t.bass('bass', R(0, 32), 'oct16')
    t.arp('arp', R(0, 16), 'up', base=57)
    t.arp('arp', R(16, 32), 'updown', base=60)
    A = """e5/3 e5/3 d5/2 e5/8 | f5/3 e5/3 d5/2 c5/8 | e5/3 e5/3 d5/2 e5/4 g5/4 | d5/12 b4/4 |
           e5/3 e5/3 d5/2 e5/8 | f5/3 e5/3 d5/2 c5/4 a4/4 | g4/4 c5/4 e5/4 g5/4 | b5/8 a5/4 g5/4"""
    B = """a5/12 g5/2 f5/2 | g5/8 d5/4 g5/4 | e5/12 d5/2 e5/2 | c5/8 e5/4 a5/4 |
           a5/8 c6/4 a5/4 | b5/8 d6/4 b5/4 | a5/16 | g#5/8 b5/4 e5/4"""
    t.lead('lead', 8, A)
    t.lead('lead', 16, B)
    t.lead('lead', 24, A)
    t.lead('lead2', 24, A, oct=1, vel=0.8)                # climax: octave double
    four = dict(k='x...x...x...x...', s='....x.......x...', c='....x.......x...', h='.o.x.o.x.o.x.o.x')
    t.beat(R(0, 8), k='x...x...x...x...', s='....x.......x...', h='..o...o...o...o.')
    t.beat(R(8, 16), **four)
    t.beat(R(16, 24), **dict(four, o='..x...x...x...x.', h='.o...o...o...o..'))
    t.beat(R(24, 31), **four)
    t.beat([31], k='x...x...x...x...', s='....x...x.o.xoxx', t='..........x.....', T='...........x..x.', h='.o.x.o.x........')
    for b in (0, 8, 16, 24):
        t.fx('C', b)
    t.fx('rise', 15, vel=0.8)
    t.fx('rise', 23, vel=0.9)
    t.fx('rise', 31, vel=0.7)
    return t


@track
def stage2():
    """SLAG RAIN - D minor, 126 BPM. Darksynth: distorted growl bass riff, brass stabs, colder lead."""
    t = Track('stage2', 'SLAG RAIN', 126, 32)
    t.set_chords('Dm Bb Gm A Dm Bb Gm A | Dm Bb Gm A Dm Bb Gm A | Bb C Dm Dm Gm A Bb A | Dm Bb Gm A Dm Bb Gm A7')
    t.add('pad', 'poly', 'darkpad', rev=0.4, chorus=0.5, sc=0.65, gain=0.75)
    t.add('bass', 'mono', 'growl', sc=0.35)
    t.add('stab', 'poly', 'stab', rev=0.3, dly=0.15, sc=0.2, gain=0.8)
    t.add('arp', 'poly', 'arp', rev=0.18, dly=0.4, sc=0.3, gain=0.7)
    t.add('lead', 'mono', 'lead', rev=0.3, dly=0.32, gain=0.95)
    t.add('lead2', 'mono', 'sqlead', rev=0.3, dly=0.25, gain=0.4)
    t.pad('pad', R(0, 32))
    t.bass('bass', R(0, 32), 'growl16')
    t.stabs('stab', R(0, 8), 'x.....x...x.....', vel=0.8)
    t.stabs('stab', R(24, 32), 'x.....x...x...o.', vel=0.9)
    t.arp('arp', R(8, 24), 'updown', base=62)
    A = """d5/2 d5/2 a5/4 g5/2 f5/2 e5/4 | f5/6 d5/2 bb4/8 | d5/2 d5/2 bb5/4 a5/2 g5/2 f5/4 | e5/8 c#5/4 e5/4 |
           d5/2 d5/2 a5/4 g5/2 f5/2 e5/4 | f5/4 g5/4 a5/4 bb5/4 | c6/6 bb5/2 a5/4 g5/4 | a5/12 g5/2 e5/2"""
    B = """f5/12 bb5/4 | g5/12 c6/4 | a5/16 | -/8 g5/4 f5/4 |
           g5/12 d5/4 | e5/8 a5/8 | bb5/8 a5/4 g5/4 | a5/4 g5/4 f5/4 e5/4"""
    t.lead('lead', 8, A)
    t.lead('lead', 16, B)
    t.lead('lead', 24, A)
    t.lead('lead2', 24, A, oct=-1, vel=0.8)
    hard = dict(k='x...x...x...x...', s='....x.......x...', c='....x.......x...', h='xoxoxoxoxoxoxoxo')
    t.beat(R(0, 8), k='x...x...x...x...', s='....x.......x...', h='..x...x...x...x.')
    t.beat(R(8, 15), **hard)
    t.beat([15], **dict(hard, s='....x.......x.xx'))
    t.beat(R(16, 24), **dict(hard, o='..x...x...x...x.', h='x...x...x...x...'))
    t.beat(R(24, 31), **dict(hard, k='x...x...x...x.x.'))
    t.beat([31], k='x...x...x...x...', s='....x.x.x.xxxxxx', T='............x.x.', h='xoxoxoxo........')
    for b in (0, 8, 16, 24):
        t.fx('C', b)
    t.fx('rise', 7, vel=0.6)
    t.fx('rise', 15, vel=0.8)
    t.fx('rise', 31, vel=0.8)
    return t


@track
def boss():
    """THE SMELTER - E minor / phrygian, 140 BPM. Galloping distorted bass, brass hits, a square-lead riff."""
    t = Track('boss', 'THE SMELTER', 140, 32)
    t.set_chords('Em Em F F Em Em C B | Em Em F F Em Em C B | Am B Em C Am B C B | Em Em F F Em Em C B')
    t.add('pad', 'poly', 'darkpad', rev=0.35, chorus=0.4, sc=0.7, gain=0.7)
    t.add('bass', 'mono', 'growl', sc=0.3)
    t.add('stab', 'poly', 'stab', rev=0.28, dly=0.12, sc=0.15, gain=0.95)
    t.add('arp', 'poly', 'arp', rev=0.15, dly=0.3, sc=0.25, gain=0.6)
    t.add('lead', 'mono', 'sqlead', rev=0.22, dly=0.22)
    t.add('lead2', 'mono', 'lead', rev=0.25, dly=0.25, gain=0.5)
    t.pad('pad', R(0, 32))
    t.bass('bass', R(0, 32), 'gallop')
    t.stabs('stab', R(0, 8), 'x..x..x...x..x..')
    t.stabs('stab', R(16, 24), 'x.......x.......', vel=0.8)
    t.stabs('stab', R(24, 32), 'x..x..x...x..x..')
    t.arp('arp', R(8, 32), 'up', base=64, octaves=2)
    A = """e5/2 r/2 e5/2 g5/2 f#5/2 e5/2 b4/4 | e5/2 r/2 e5/2 g5/2 a5/2 g5/2 f#5/4 |
           f5/2 r/2 f5/2 a5/2 g5/2 f5/2 c5/4 | f5/4 e5/4 f5/4 a5/4 |
           e5/2 r/2 e5/2 g5/2 f#5/2 e5/2 b4/4 | e5/2 r/2 e5/2 b5/2 c6/2 b5/2 g5/4 |
           c6/4 b5/4 g5/4 e5/4 | d#5/8 f#5/4 b5/4"""
    B = """c6/12 b5/2 a5/2 | b5/12 a5/2 f#5/2 | g5/12 f#5/2 e5/2 | e5/8 g5/4 c6/4 |
           c6/8 e6/8 | d#6/8 b5/8 | c6/4 b5/4 a5/4 g5/4 | f#5/4 d#5/4 b4/8"""
    t.lead('lead', 8, A)
    t.lead('lead', 16, B)
    t.lead('lead2', 16, B, oct=-1, vel=0.7)
    t.lead('lead', 24, A)
    t.lead('lead2', 24, A, oct=1, vel=0.65)
    heavy = dict(k='x..x..x.x..x..x.', s='....x.......x...', c='....x.......x...', h='x.x.x.x.x.x.x.x.')
    t.beat(R(0, 8), **dict(heavy, h='..x...x...x...x.'))
    t.beat(R(8, 15), **heavy)
    t.beat([15], **dict(heavy, s='....x.......xxxx'))
    t.beat(R(16, 24), **dict(heavy, k='x...x...x...x...', o='..x...x...x...x.', h='................'))
    t.beat(R(24, 31), **dict(heavy, h='xoxoxoxoxoxoxoxo'))
    t.beat([31], k='x..x..x.x.x.x.x.', s='....x...xxxxxxxx', t='..........x.x...', T='...........x.x.x')
    for b in (0, 8, 16, 24):
        t.fx('C', b)
    t.fx('rise', 15, vel=0.8)
    t.fx('rise', 31, vel=0.9)
    return t


@track
def title():
    """SLAGHOUSE - F minor, 96 BPM. Night-drive intro: dark pads, glassy arp, half-time gated drums, slow lead."""
    t = Track('title', 'SLAGHOUSE', 96, 16)
    t.set_chords('Fm Db Ab Eb Fm Db Bbm C | Fm Db Ab Eb Fm Db Bbm C')
    t.add('pad', 'poly', 'darkpad', rev=0.5, chorus=0.7, sc=0.35, gain=1.0)
    t.add('bass', 'mono', 'bass', sc=0.3, gain=0.9)
    t.add('arp', 'poly', 'glass', rev=0.4, dly=0.5, gain=0.9)
    t.add('lead', 'mono', 'lead', rev=0.45, dly=0.4, gain=0.95)
    t.pad('pad', R(0, 16))
    t.bass('bass', R(0, 16), 'pump8', vel=0.85)
    t.arp('arp', R(0, 16), 'up', rate=2, base=60, octaves=2, vel=0.7, gate=1.6)
    L = """c5/8 ab4/4 c5/4 | db5/8 f5/8 | eb5/12 c5/4 | bb4/16 |
           c5/8 f5/4 g5/4 | ab5/8 f5/4 db5/4 | f5/8 db5/4 bb4/4 | e5/8 g5/8"""
    t.lead('lead', 8, L)
    t.beat(R(0, 8), k='x.........x.....', s='........x.......', h='..o...o...o...o.')
    t.beat(R(8, 15), k='x.........x.....', s='........x.......', h='.o.o.o.o.o.o.o.o', o='......x.........')
    t.beat([15], k='x.........x.....', s='........x...x.xx', h='.o.o.o.o........')
    t.fx('C', 0, vel=0.7)
    t.fx('C', 8, vel=0.8)
    t.fx('rise', 7, vel=0.6)
    t.fx('rise', 15, vel=0.5)
    t.master['rev_rt'] = 3.4
    return t


@track
def win():
    """ARENA CLEARED - lift from the stage's A minor into a bright A major cadence."""
    t = Track('win', 'ARENA CLEARED', 118, 2, loop=False, tail=2.4)
    t.set_chords('F,G A')
    t.add('pad', 'poly', 'pad', rev=0.45, chorus=0.6, gain=1.0)
    t.add('bass', 'mono', 'bass', gain=0.9)
    t.add('arp', 'poly', 'arp', rev=0.3, dly=0.4, gain=0.8)
    t.add('lead', 'mono', 'lead', rev=0.4, dly=0.35)
    t.pad('pad', R(0, 2))
    t.bass('bass', [0], 'oct16', vel=0.9)
    t.bass('bass', [1], 'whole', vel=0.9)
    t.arp('arp', R(0, 2), 'up', base=64)
    t.lead('lead', 0, 'c5/2 d5/2 e5/2 g5/2 b5/2 c6/2 d6/2 b5/2 | c#6/16')
    t.beat([0], k='x...x...x...x...', s='....x.......x.xx', h='.o.x.o.x.o.x.o.x')
    t.beat([1], k='x...............', s='x...............')
    t.fx('C', 1)
    return t


@track
def lose():
    """YOU GOT GIBBED - a slow fall into the dark, then the tape stops."""
    t = Track('lose', 'YOU GOT GIBBED', 100, 2, loop=False, tail=0.8)
    t.set_chords('Fm,Db Bbm,C')
    t.add('pad', 'poly', 'darkpad', rev=0.5, chorus=0.6, gain=1.1)
    t.add('bass', 'mono', 'bass', gain=0.9)
    t.add('lead', 'mono', 'lead', rev=0.5, dly=0.4)
    t.pad('pad', R(0, 2))
    t.bass('bass', R(0, 2), 'half')
    t.lead('lead', 0, 'ab5/4 g5/4 f5/4 e5/4 | f5/16')
    t.beat([0], k='x.......x.......', s='........x.......')
    t.beat([1], k='x...............')
    t.fx('boom', 1)
    t.master['tapestop'] = (1.5, 1.4)       # bars in, seconds long
    return t
