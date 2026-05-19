// app.jsx — root component

function App() {
  const rootRef = React.useRef(null);
  const PAD = 80;
  const CONTENT_W = 1920;
  const CONTENT_H = 1521;
  const STAGE_W = CONTENT_W + PAD * 2;
  const STAGE_H = CONTENT_H + PAD * 2;
  return (
    <div ref={rootRef} data-screen-label="t=0s" style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        @keyframes qsPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.5); opacity: 0.4; }
        }
      `}</style>
      <Stage
        width={STAGE_W}
        height={STAGE_H}
        duration={TOTAL_DUR}
        background="#FFFFFF"
        persistKey="qs-flow"
      >
        {/* Inset content panel — padding gives the diagram breathing room from the stage edges */}
        <div style={{
          position: 'absolute',
          left: PAD, top: PAD,
          width: CONTENT_W, height: CONTENT_H,
          background: '#FFFFFF',
          overflow: 'hidden',
        }}>
          <Backdrop />
          <TimestampTagger rootRef={rootRef} />

          {PAYMENTS.map((p, i) => (
            <PaymentCycle
              key={i}
              payment={p}
              index={i}
              baseStart={INTRO_DUR + i * CYCLE_DUR}
            />
          ))}
        </div>
      </Stage>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
