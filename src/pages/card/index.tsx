import { useState } from 'react';
import fufuImg from '@/assets/img/fufu.png';
import './index.less';

interface CardTilt {
  rotateX: number;
  rotateY: number;
  scale: number;
  glareX: number;
  glareY: number;
  shadowX: number;
  shadowY: number;
  tiltStrength: number;
  isHovering: boolean;
}

const RESTING: CardTilt = {
  rotateX: 0,
  rotateY: 0,
  scale: 1,
  glareX: 50,
  glareY: 30,
  shadowX: 0,
  shadowY: 28,
  tiltStrength: 0,
  isHovering: false,
};

const Card = () => {
  const [tilt, setTilt] = useState<CardTilt>(RESTING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { width, height } = rect;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = (x - width / 2) / (width / 2);
    const yRatio = (y - height / 2) / (height / 2);

    const maxTilt = 14;
    const rotateY = xRatio * maxTilt;
    const rotateX = -yRatio * maxTilt;
    const tiltStrength = Math.sqrt(xRatio ** 2 + yRatio ** 2);

    setTilt({
      rotateX,
      rotateY,
      scale: 1.06,
      glareX: (x / width) * 100,
      glareY: (y / height) * 100,
      shadowX: -xRatio * 20,
      shadowY: -yRatio * 18 + 28,
      tiltStrength,
      isHovering: true,
    });
  };

  const handleMouseLeave = () => setTilt(RESTING);

  const cardTransform = `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`;

  const shadowBlur = 14 + tilt.tiltStrength * 18;
  const artDropShadow = `drop-shadow(${tilt.shadowX}px ${tilt.shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.5))`;

  const backgroundParallax = {
    transform: `translateZ(-32px) translateX(${tilt.rotateY * -0.6}px) translateY(${tilt.rotateX * 0.6}px)`,
  };

  const artLayerStyle = {
    transform: `translateZ(48px) translateX(${tilt.rotateY * 1.2}px) translateY(${tilt.rotateX * -1.2}px)`,
  };

  const glareStyle = {
    transform: `translateZ(72px) translateX(${tilt.rotateY * 1.8}px) translateY(${tilt.rotateX * -1.8}px)`,
    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 22%, transparent 55%)`,
  };

  const edgeGlowStyle = {
    transform: `translateZ(56px) translateX(${tilt.rotateY * 1.4}px) translateY(${tilt.rotateX * -1.4}px)`,
    opacity: 0.45 + tilt.tiltStrength * 0.4,
  };

  return (
    <div className="container">
      <div
        className="card-container"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`card ${tilt.isHovering ? 'card--active' : 'card--resting'}`}
          style={{ transform: cardTransform }}
        >
          {/* 背景层 translateZ(-32px)：退后的蓝色径向光晕，视差最慢，制造景深 */}
          {/* 背景层, 肉眼很难直接看出来，但是是整个卡片的基础，用于制造景深，让卡片看起来有层次感 */}
          <div
            className="card-layer card-layer--background"
            style={backgroundParallax}
          >
            <div className="card-bg-glow" />
          </div>

          {/* 人物层 translateZ(48px)：PNG 立绘主体，drop-shadow 按 alpha 轮廓投影 */}
          <div className="card-layer card-layer--art" style={artLayerStyle}>
            <img src={fufuImg} alt="fufu" style={{ filter: artDropShadow }} />
          </div>

          {/* 边缘辉光层 translateZ(56px)：四边镭射 + 彩虹渐变，倾斜越亮 */}
          {/* 阴影层 translateZ(64px)：仿 PS 内阴影，提供渐变厚度, 用于显示卡片边框，提升层次感 */}
          <div
            className="card-layer card-layer--edge-glow"
            style={edgeGlowStyle}
          />

          {/* 高光层 translateZ(72px)：最靠前，鼠标跟随的白色反光 */}
          <div className="card-layer card-layer--glare" style={glareStyle} />
        </div>
      </div>
    </div>
  );
};

export default Card;
