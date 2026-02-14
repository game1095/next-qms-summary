import { useEffect, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

const CountUp = ({ 
  end, 
  duration = 2000, 
  decimals = 0, 
  suffix = '', 
  prefix = '',
  className = '' 
}: CountUpProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
      
      setCount(end * ease(percentage));

      if (progress < duration) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  const formattedCount = count.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={className}>{prefix}{formattedCount}{suffix}</span>;
};

export default CountUp;
