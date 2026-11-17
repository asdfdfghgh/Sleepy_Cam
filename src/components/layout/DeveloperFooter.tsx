import React from 'react';

export const DeveloperFooter: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-black/10 dark:border-white/10 py-3.5 px-4 no-print">
      <p className="max-w-6xl mx-auto text-center text-[12px] sm:text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
          Made by Subhra Jyoti Mishra
        </strong>
        <span className="mx-1.5" aria-hidden="true">
          &middot;
        </span>
        <a
          href="mailto:subhra45.mishra@gmail.com"
          className="text-[#007a5f] dark:text-[#00ffc6] hover:underline break-all sm:break-normal"
        >
          subhrajyotimishra.official@gmail.com
        </a>
        <span className="mx-1.5" aria-hidden="true">
          &middot;
        </span>
        <span>Open to collaborations</span>
      </p>
    </footer>
  );
};
