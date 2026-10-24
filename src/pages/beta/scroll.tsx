import React, { useState } from 'react';

const Item = ({ num }: { num: number }) => {
  return (
    <div
      style={{
        height: '50px',
        width: '50px',
        backgroundColor: '#ffff',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      {num}
    </div>
  );
};

const STRIDE = 60;
const STEP = 300;

const Scroll = () => {
  const content = Array.from({ length: 33 }, (_, i) => i);
  const loop = content.length * STRIDE;
  const [translate, setTranslate] = useState(-loop);

  const list = [...content, ...content, ...content];

  const shift = (delta: number) => {
    let next = translate + delta;
    if (next > -loop) next -= loop;
    else if (next <= -loop * 2) next += loop;
    setTranslate(next);
  };

  return (
    <div>
      <div style={{ overflow: 'hidden', width: '300px', marginBottom: '10px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            transform: `translateX(${translate}px)`,
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          {list.map((item, index) => (
            <Item key={index} num={item} />
          ))}
        </div>
      </div>
      <button onClick={() => shift(-STEP)}>Left</button>
      <button onClick={() => shift(STEP)}>Right</button>
    </div>
  );
};

export default React.memo(Scroll);
