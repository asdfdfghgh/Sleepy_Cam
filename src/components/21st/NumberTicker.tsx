// Adapted from @codedthemes/uiable (MIT License) — CountUp / Number Ticker
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';
import { cn } from '../../lib/utils';

interface NumberTickerProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 0.55,
  className
}) => {
  const prevValueRef = useRef<number>(value);
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    const start = prevValueRef.current;
    prevValueRef.current = value;

    if (Math.abs(value - start) < 0.01) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(start, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest)
    });

    return () => controls.stop();
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString();

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
