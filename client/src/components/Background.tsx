import { motion } from 'framer-motion';

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="orb"
        style={{
          width: 520,
          height: 520,
          left: '-8%',
          top: '-12%',
          background: 'radial-gradient(circle at 30% 30%, #7C5CFF 0%, transparent 70%)',
        }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb"
        style={{
          width: 460,
          height: 460,
          right: '-6%',
          top: '15%',
          background: 'radial-gradient(circle at 50% 50%, #22D3EE 0%, transparent 70%)',
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb"
        style={{
          width: 600,
          height: 600,
          left: '20%',
          bottom: '-15%',
          background: 'radial-gradient(circle at 50% 50%, #F472B6 0%, transparent 70%)',
          opacity: 0.4,
        }}
        animate={{ x: [0, -40, 50, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(124,92,255,0.18), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(34,211,238,0.12), transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' stitchTiles=\'stitch\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/></svg>")',
        }}
      />
    </div>
  );
}
