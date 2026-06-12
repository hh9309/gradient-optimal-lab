/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math?: string;
  text?: string;
  block?: boolean;
}

export function MathRenderer({ math, text, block = false }: MathRendererProps) {
  // 1. If explicit math formula is provided
  if (math !== undefined) {
    const html = useMemo(() => {
      try {
        return katex.renderToString(math, {
          displayMode: block,
          throwOnError: false,
        });
      } catch (e) {
        return math;
      }
    }, [math, block]);

    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className={block ? "block my-2 overflow-x-auto text-center font-normal" : "inline-block px-0.5 font-normal"}
      />
    );
  }

  // 2. If text containing embedded math ($...$ or $$...$$) is provided
  if (text !== undefined) {
    const renderedParts = useMemo(() => {
      const parts: React.ReactNode[] = [];
      let currentIndex = 0;

      // Match $$ block math or $ inline math
      const regex = /(\$\$(.*?)\$\$)|(\$(.*?)\$)/gs;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const matchIndex = match.index;

        // Push plain text prior to the match
        if (matchIndex > currentIndex) {
          parts.push(text.slice(currentIndex, matchIndex));
        }

        const isBlock = !!match[1];
        const rawMath = isBlock ? match[2] : match[4];

        try {
          const html = katex.renderToString(rawMath.trim(), {
            displayMode: isBlock,
            throwOnError: false,
          });
          parts.push(
            <span
              key={matchIndex}
              dangerouslySetInnerHTML={{ __html: html }}
              className={isBlock ? "block my-2 py-1 overflow-x-auto text-center" : "inline-block px-0.5"}
            />
          );
        } catch (e) {
          parts.push(
            <code key={matchIndex} className="bg-slate-100 text-rose-500 px-1 rounded font-mono text-[11px]">
              {rawMath}
            </code>
          );
        }

        currentIndex = regex.lastIndex;
      }

      if (currentIndex < text.length) {
        parts.push(text.slice(currentIndex));
      }

      return parts;
    }, [text]);

    return <>{renderedParts}</>;
  }

  return null;
}
