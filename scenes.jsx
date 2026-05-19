// scenes.jsx — Quota-share payment flow animation
// 3 consecutive payments using the diagram in assets/quota-share.png as backdrop.

// ─── Brand tokens ───────────────────────────────────────────────────────────
const QS_COLORS = {
  darkPurple: '#470A68',
  purple: '#831FBF',
  vividPurple: '#B029FF',
  lightPurple: '#CF7FFF',
  pastelPurple: '#B49EB5',
  warmOrange: '#F15B40',
  lightOrange: '#FD9352',
  offWhite: '#F5F5F5',
  black: '#0A0A0A',
  blueGreen: '#003342',
};

const QS_FONT = "'Be Vietnam Pro', system-ui, sans-serif";

// ─── Layout positions (stage 1920×1521, matches background image v2) ──────
const POS = {
  carrier:   [{x: 185, y: 205}, {x: 684, y: 205}, {x: 1163, y: 205}],
  funding:   [{x: 200, y: 486}, {x: 686, y: 486}, {x: 1163, y: 486}],
  pctHex:    [{x: 295, y: 774}, {x: 688, y: 774}, {x: 1070, y: 774}],
  tpa:       {x: 172, y: 1071},
  tpaTail:   {x: 490, y: 1071},  // where TPA arrow points
  payment:   {x: 686, y: 1089},
  claimant:  {x: 686, y: 1479},
  arrowSwap: {x: 916, y: 1071}, // purple double-arrow on diagram
  table: {
    headerY: 862,
    rowsY: [929, 994, 1063, 1131, 1198],   // S1..S5
    colsX: [1434, 1624, 1808],             // value cols for Carrier 1/2/3
    labelX: 1233,
    x0: 1125, y0: 831, w: 780, h: 405,     // bounding box
    rowH: 60,
  },
};

// All 5 row keys in display order
const ROWS = ['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5'];

// ─── Payment scenarios ──────────────────────────────────────────────────────
// 3 consecutive payments. Each picks a row in the table (1–5) and an amount.
const PAYMENTS = [
  { section: 'Section 3', rowIndex: 2, amount: 4800,  pct: [25, 25, 50], color: QS_COLORS.purple },
  { section: 'Section 1', rowIndex: 0, amount: 12750, pct: [null, 60, 40], color: QS_COLORS.purple },
  { section: 'Section 5', rowIndex: 4, amount: 6200,  pct: [5, 10, 90], color: QS_COLORS.purple },
];

const CYCLE_DUR = 11; // seconds per payment
const INTRO_DUR = 0.6;
const OUTRO_DUR = 1.0;
const TOTAL_DUR = INTRO_DUR + PAYMENTS.length * CYCLE_DUR + OUTRO_DUR;

const fmt = (n) => '$' + n.toLocaleString('en-US');

// ─── Helpers ───────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;

// Fade window: returns 0..1 ramp in [0, fadeIn] and back to 0 in last [fadeOut].
function envelope(p, fadeIn = 0.08, fadeOut = 0.1) {
  if (p < 0 || p > 1) return 0;
  if (p < fadeIn)    return p / fadeIn;
  if (p > 1 - fadeOut) return (1 - p) / fadeOut;
  return 1;
}

// ─── Background diagram ────────────────────────────────────────────────────
function Backdrop() {
  return (
    <img
      src="assets/quota-share_v2.png"
      alt=""
      draggable="false"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'fill', pointerEvents: 'none', userSelect: 'none',
      }}
    />
  );
}

// ─── Cycle label (small upper-left badge) ───────────────────────────────────
// ─── Cycle label (below TPA) ────────────────────────────────────────────────
function CycleBadge({ index, payment }) {
  const { progress } = useSprite();
  const op = envelope(progress, 0.04, 0.06);
  return (
    <div style={{
      position: 'absolute', left: 40, top: 1240,
      opacity: op,
      transform: `translateY(${(1 - op) * -6}px)`,
      fontFamily: QS_FONT, letterSpacing: '-0.01em',
    }}>
      <div style={{ fontSize: 14, color: QS_COLORS.purple, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 500 }}>
        Payment
      </div>
      <div style={{ fontSize: 36, color: QS_COLORS.darkPurple, fontWeight: 700, marginTop: 6, lineHeight: 1 }}>
        {fmt(payment.amount)}
      </div>
      <div style={{ fontSize: 20, color: QS_COLORS.black, fontWeight: 500, marginTop: 6, opacity: 0.8 }}>
        Ref: <span style={{ fontWeight: 600, opacity: 1, color: QS_COLORS.black }}>{payment.section}</span>
      </div>
    </div>
  );
}

// ─── Instruction card travelling TPA → Payment Account ──────────────────────
function InstructionCard({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        // Phase 1 (0→0.15): pop in at TPA
        // Phase 2 (0.15→0.85): travel from TPA to Payment Account along arrow
        // Phase 3 (0.85→1): absorb into Payment Account
        let x, y, scale, opacity;
        if (progress < 0.15) {
          const t = Easing.easeOutBack(progress / 0.15);
          x = POS.tpa.x + 70;
          y = POS.tpa.y - 90;
          scale = 0.4 + 0.6 * t;
          opacity = t;
        } else if (progress < 0.85) {
          const t = Easing.easeInOutCubic((progress - 0.15) / 0.70);
          x = lerp(POS.tpa.x + 70, POS.payment.x, t);
          y = lerp(POS.tpa.y - 90, POS.payment.y - 90, t);
          scale = 1;
          opacity = 1;
        } else {
          const t = (progress - 0.85) / 0.15;
          x = POS.payment.x;
          y = lerp(POS.payment.y - 90, POS.payment.y - 30, Easing.easeInQuad(t));
          scale = 1 - 0.4 * t;
          opacity = 1 - t;
        }
        return (
          <div style={{
            position: 'absolute', left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center',
            opacity,
            background: QS_COLORS.offWhite,
            border: `1px solid ${QS_COLORS.darkPurple}`,
            borderRadius: 14,
            padding: '14px 22px 16px',
            minWidth: 200,
            boxShadow: '0 16px 40px rgba(71,10,104,0.18)',
            fontFamily: QS_FONT, letterSpacing: '-0.01em', textAlign: 'left',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: QS_COLORS.purple,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: 999,
                background: QS_COLORS.warmOrange,
              }} />
              Payment instruction
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: QS_COLORS.darkPurple, marginTop: 6 }}>
              {fmt(payment.amount)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: QS_COLORS.black, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: QS_COLORS.black, opacity: 0.55, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Ref</span>
              {payment.section}
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ─── Payment Account pulse when instruction lands & at end of cycle ─────────
function PaymentPulse({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const t = Easing.easeOutCubic(progress);
        const r = 92 + t * 80;
        const op = (1 - progress) * 0.55;
        return (
          <div style={{
            position: 'absolute',
            left: POS.payment.x, top: POS.payment.y,
            width: r, height: r,
            transform: 'translate(-50%, -50%)',
            border: `2px solid ${QS_COLORS.vividPurple}`,
            borderRadius: 999,
            opacity: op,
            pointerEvents: 'none',
          }} />
        );
      }}
    </Sprite>
  );
}

// ─── "Looking up section…" label near Payment Account ───────────────────────
function LookupLabel({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const op = envelope(progress, 0.08, 0.12);
        return (
          <div style={{
            position: 'absolute',
            left: POS.payment.x + 145, top: POS.payment.y - 28,
            opacity: op,
            fontFamily: QS_FONT, letterSpacing: '-0.01em',
            background: QS_COLORS.darkPurple,
            color: QS_COLORS.offWhite,
            padding: '12px 20px',
            borderRadius: 999,
            fontSize: 18, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 12,
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 28px rgba(71,10,104,0.32)',
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: 999,
              background: QS_COLORS.lightOrange,
              animation: 'qsPulse 1.1s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span>Looking up <strong style={{ fontWeight: 700, fontSize: 22, marginLeft: 4 }}>{payment.section}</strong></span>
          </div>
        );
      }}
    </Sprite>
  );
}

// ─── Scanning beam over the table ──────────────────────────────────────────
function TableScan({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        // Sweep from header down past the target row, then settle on it.
        const settleAt = 0.7;
        const targetY = POS.table.rowsY[payment.rowIndex];
        const sweepFrom = POS.table.headerY - 10;
        const sweepTo   = targetY;

        let y;
        if (progress < settleAt) {
          const t = Easing.easeInOutCubic(progress / settleAt);
          y = lerp(sweepFrom, sweepTo, t);
        } else {
          y = sweepTo;
        }
        const op = envelope(progress, 0.06, 0.08);

        return (
          <React.Fragment>
            <div style={{
              position: 'absolute',
              left: POS.table.x0, top: y,
              width: POS.table.w, height: 60,
              transform: 'translateY(-50%)',
              background: `linear-gradient(180deg, transparent 0%, rgba(176,41,255,0.18) 50%, transparent 100%)`,
              opacity: op,
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
            }} />
            <div style={{
              position: 'absolute',
              left: POS.table.x0, top: y,
              width: POS.table.w, height: 2,
              transform: 'translateY(-1px)',
              background: QS_COLORS.vividPurple,
              opacity: op * 0.8,
              boxShadow: `0 0 12px ${QS_COLORS.vividPurple}`,
              pointerEvents: 'none',
            }} />
          </React.Fragment>
        );
      }}
    </Sprite>
  );
}

// ─── Row highlight that snaps in once scan settles ─────────────────────────
function RowHighlight({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const y = POS.table.rowsY[payment.rowIndex];
        const op = envelope(progress, 0.06, 0.1);
        return (
          <React.Fragment>
            <div style={{
              position: 'absolute',
              left: POS.table.x0, top: y - 30,
              width: POS.table.w, height: 60,
              border: `2px solid ${QS_COLORS.vividPurple}`,
              borderRadius: 6,
              opacity: op,
              boxShadow: `0 0 0 4px rgba(176,41,255,0.12)`,
              pointerEvents: 'none',
            }} />
            {/* tiny chevron pointer left of the row */}
            <div style={{
              position: 'absolute',
              left: POS.table.x0 - 26, top: y,
              transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderLeft: `9px solid ${QS_COLORS.vividPurple}`,
              opacity: op,
            }} />
          </React.Fragment>
        );
      }}
    </Sprite>
  );
}

// ─── Percent tokens flying from row → % hexagons ──────────────────────────
function PercentTravel({ payment, start, end }) {
  return (
    <React.Fragment>
      {[0, 1, 2].map((i) => {
        const v = payment.pct[i];
        if (v == null) return null; // dash in table — carrier doesn't participate
        const offset = i * 0.12;
        return (
          <Sprite key={i} start={start + offset} end={end}>
            {({ progress }) => {
              const src = { x: POS.table.colsX[i], y: POS.table.rowsY[payment.rowIndex] };
              const dst = POS.pctHex[i];
              // Arc through the purple double arrow point for visual flow
              const via = { x: POS.arrowSwap.x, y: POS.arrowSwap.y };

              // 3-phase: lift out, travel arc, snap into hex
              let x, y, scale, opacity;
              if (progress < 0.12) {
                const t = Easing.easeOutCubic(progress / 0.12);
                x = src.x;
                y = src.y - 4 * t;
                scale = 0.6 + 0.4 * t;
                opacity = t;
              } else if (progress < 0.78) {
                const t = Easing.easeInOutCubic((progress - 0.12) / 0.66);
                // Quadratic bezier through `via`
                const oneMinusT = 1 - t;
                x = oneMinusT * oneMinusT * src.x + 2 * oneMinusT * t * via.x + t * t * dst.x;
                y = oneMinusT * oneMinusT * src.y + 2 * oneMinusT * t * via.y + t * t * dst.y;
                scale = 1;
                opacity = 1;
              } else {
                const t = (progress - 0.78) / 0.22;
                x = dst.x;
                y = dst.y;
                scale = 1 + 0.15 * (1 - t) - 0;
                opacity = 1;
              }

              return (
                <div style={{
                  position: 'absolute',
                  left: x, top: y,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  background: QS_COLORS.darkPurple,
                  color: QS_COLORS.offWhite,
                  fontFamily: QS_FONT,
                  letterSpacing: '-0.01em',
                  fontSize: 18,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 999,
                  opacity,
                  boxShadow: '0 6px 16px rgba(71,10,104,0.32)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>
                  {v}%
                </div>
              );
            }}
          </Sprite>
        );
      })}
    </React.Fragment>
  );
}

// ─── Persistent percent labels in the % hexagons ───────────────────────────
function PercentLocked({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const op = envelope(progress, 0.04, 0.18);
        return (
          <React.Fragment>
            {[0, 1, 2].map((i) => {
              const v = payment.pct[i];
              const label = v == null ? '—' : `${v}%`;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: POS.pctHex[i].x, top: POS.pctHex[i].y,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: QS_FONT, letterSpacing: '-0.01em',
                  fontSize: v == null ? 28 : 22, fontWeight: 700,
                  color: QS_COLORS.darkPurple,
                  opacity: op * (v == null ? 0.45 : 1),
                  pointerEvents: 'none',
                }}>
                  {label}
                </div>
              );
            })}
          </React.Fragment>
        );
      }}
    </Sprite>
  );
}

// ─── Money flowing from each funding account → payment account ─────────────
function MoneyFlow({ payment, start, end }) {
  return (
    <React.Fragment>
      {[0, 1, 2].map((i) => {
        const v = payment.pct[i];
        if (v == null || v === 0) return null;
        const amount = Math.round(payment.amount * v / 100);
        const offset = i * 0.10;
        return (
          <Sprite key={i} start={start + offset} end={end}>
            {({ progress }) => {
              const src = POS.funding[i];
              const mid = POS.pctHex[i];
              const dst = POS.payment;

              // Two-phase travel: FA → % hex → Payment
              let x, y, opacity, scale;
              if (progress < 0.10) {
                const t = Easing.easeOutCubic(progress / 0.10);
                x = src.x;
                y = src.y + 80 * t;
                opacity = t;
                scale = 0.6 + 0.4 * t;
              } else if (progress < 0.55) {
                const t = Easing.easeInOutCubic((progress - 0.10) / 0.45);
                x = lerp(src.x, mid.x, t);
                y = lerp(src.y + 80, mid.y, t);
                opacity = 1;
                scale = 1;
              } else if (progress < 0.95) {
                const t = Easing.easeInOutCubic((progress - 0.55) / 0.40);
                x = lerp(mid.x, dst.x, t);
                y = lerp(mid.y, dst.y, t);
                opacity = 1;
                scale = 1;
              } else {
                const t = (progress - 0.95) / 0.05;
                x = dst.x;
                y = dst.y;
                opacity = 1 - t;
                scale = 1 - 0.25 * t;
              }

              return (
                <div style={{
                  position: 'absolute',
                  left: x, top: y,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  background: QS_COLORS.warmOrange,
                  color: QS_COLORS.offWhite,
                  fontFamily: QS_FONT, letterSpacing: '-0.01em',
                  fontSize: 17, fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: 999,
                  opacity,
                  boxShadow: '0 8px 18px rgba(241,91,64,0.32)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>
                  {fmt(amount)}
                </div>
              );
            }}
          </Sprite>
        );
      })}
    </React.Fragment>
  );
}

// ─── Combined payment from Payment Account → Claimant ──────────────────────
function ClaimantPayout({ payment, start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const src = POS.payment;
        const dst = POS.claimant;

        // Hold briefly at Payment Account (merging), then drop.
        let x, y, scale, opacity;
        if (progress < 0.18) {
          const t = Easing.easeOutBack(progress / 0.18);
          x = src.x;
          y = src.y;
          scale = 0.5 + 0.5 * t;
          opacity = Math.min(1, progress / 0.10);
        } else if (progress < 0.82) {
          const t = Easing.easeInOutCubic((progress - 0.18) / 0.64);
          x = src.x;
          y = lerp(src.y, dst.y, t);
          scale = 1;
          opacity = 1;
        } else {
          const t = (progress - 0.82) / 0.18;
          x = dst.x;
          y = dst.y;
          scale = 1 - 0.25 * t;
          opacity = 1 - t * 0.8;
        }

        return (
          <div style={{
            position: 'absolute',
            left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            background: QS_COLORS.darkPurple,
            color: QS_COLORS.offWhite,
            fontFamily: QS_FONT, letterSpacing: '-0.01em',
            fontSize: 22, fontWeight: 700,
            padding: '12px 22px',
            borderRadius: 999,
            opacity,
            boxShadow: '0 14px 30px rgba(71,10,104,0.36)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: 999,
              background: QS_COLORS.lightOrange,
            }} />
            {fmt(payment.amount)}
          </div>
        );
      }}
    </Sprite>
  );
}

// ─── Claimant "paid" confirmation flash ────────────────────────────────────
function PaidPing({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const t = Easing.easeOutCubic(progress);
        const r = 70 + 80 * t;
        return (
          <div style={{
            position: 'absolute',
            left: POS.claimant.x, top: POS.claimant.y,
            width: r, height: r,
            transform: 'translate(-50%, -50%)',
            border: `2px solid ${QS_COLORS.warmOrange}`,
            borderRadius: 999,
            opacity: (1 - progress) * 0.7,
            pointerEvents: 'none',
          }} />
        );
      }}
    </Sprite>
  );
}

// ─── "Paid" success badge — appears after combined payment lands ───────────
function SuccessSign({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const op = envelope(progress, 0.14, 0.20);
        const popT = Easing.easeOutBack(Math.min(1, progress / 0.18));
        const scale = 0.4 + 0.6 * popT;
        return (
          <div style={{
            position: 'absolute',
            left: POS.claimant.x + 280, top: POS.claimant.y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center',
            opacity: op,
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#1F8A5B',
            color: QS_COLORS.offWhite,
            padding: '12px 22px 12px 16px',
            borderRadius: 999,
            fontFamily: QS_FONT, letterSpacing: '-0.01em',
            fontSize: 22, fontWeight: 600,
            boxShadow: '0 14px 30px rgba(31,138,91,0.36)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <circle cx="13" cy="13" r="13" fill="rgba(255,255,255,0.18)"/>
              <path d="M7 13.5 L11 17.5 L19 8.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span>Paid</span>
          </div>
        );
      }}
    </Sprite>
  );
}

// ─── Timestamp label updater (data-screen-label on root) ───────────────────
function TimestampTagger({ rootRef }) {
  const time = useTime();
  const lastRef = React.useRef(-1);
  React.useEffect(() => {
    const sec = Math.floor(time);
    if (sec !== lastRef.current && rootRef.current) {
      lastRef.current = sec;
      rootRef.current.setAttribute('data-screen-label', `t=${sec}s`);
    }
  }, [time, rootRef]);
  return null;
}

// ─── A full payment cycle ──────────────────────────────────────────────────
function PaymentCycle({ payment, index, baseStart }) {
  // Cycle-relative offsets (within a CYCLE_DUR-second window)
  const T = (off) => baseStart + off;

  return (
    <React.Fragment>
      <Sprite start={baseStart + 0.0} end={baseStart + CYCLE_DUR - 0.2}>
        <CycleBadge index={index} payment={payment} />
      </Sprite>

      {/* 0.3 → 2.2 : instruction card travels TPA → Payment Account */}
      <InstructionCard payment={payment} start={T(0.3)} end={T(2.2)} />

      {/* 2.0 → 2.9 : payment account absorbs the instruction */}
      <PaymentPulse start={T(2.05)} end={T(2.85)} />

      {/* 2.3 → 5.7 : look up section in table (lookup label visible) */}
      <LookupLabel payment={payment} start={T(2.3)} end={T(5.6)} />

      {/* 2.6 → 4.6 : scan beam sweeps and settles */}
      <TableScan payment={payment} start={T(2.6)} end={T(4.6)} />

      {/* 4.0 → 7.4 : the row stays highlighted */}
      <RowHighlight payment={payment} start={T(4.0)} end={T(7.4)} />

      {/* 4.5 → 6.4 : percentage tokens fly from row → % hexagons */}
      <PercentTravel payment={payment} start={T(4.5)} end={T(6.4)} />

      {/* 6.0 → 9.6 : percentages locked into % hexagons */}
      <PercentLocked payment={payment} start={T(6.0)} end={T(9.8)} />

      {/* 6.5 → 8.7 : carrier funds flow through % hexagons → payment account */}
      <MoneyFlow payment={payment} start={T(6.5)} end={T(8.7)} />

      {/* 8.5 → 9.0 : payment account pulses as funds combine */}
      <PaymentPulse start={T(8.4)} end={T(9.05)} />

      {/* 8.7 → 10.6 : single combined payment drops to claimant */}
      <ClaimantPayout payment={payment} start={T(8.7)} end={T(10.6)} />

      {/* 10.3 → 10.9 : paid confirmation ping at claimant */}
      <PaidPing start={T(10.3)} end={T(10.95)} />

      {/* 10.4 → 11.0 : success "Paid" badge near claimant */}
      <SuccessSign start={T(10.4)} end={T(11.0)} />
    </React.Fragment>
  );
}

// ─── Intro / outro ─────────────────────────────────────────────────────────
function IntroTitle({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ progress }) => {
        const op = envelope(progress, 0.2, 0.3);
        return (
          <div style={{
            position: 'absolute', left: 1150, top: 880,
            fontFamily: QS_FONT,
            opacity: op,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 500, letterSpacing: '0.20em',
              textTransform: 'uppercase', color: QS_COLORS.purple,
            }}>
              Quota share
            </div>
            <div style={{
              fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em',
              color: QS_COLORS.black, marginTop: 6,
            }}>
              Automated split &amp; payout
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

Object.assign(window, {
  QS_COLORS, QS_FONT, POS, PAYMENTS, CYCLE_DUR, INTRO_DUR, OUTRO_DUR, TOTAL_DUR,
  Backdrop, PaymentCycle, TimestampTagger, IntroTitle,
});
