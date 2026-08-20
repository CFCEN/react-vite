import { useState } from 'react';
import { Typography } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { shortenPath } from '@/utils/path';
import { getMessage } from '@/utils/antdApp';
import './index.less';

export interface CopyableTextProps {
  text: string;
  /** Display text (defaults to text) */
  display?: string;
  /** Max characters before ellipsis (CSS-based by default) */
  ellipsis?: boolean | { rows?: number };
  className?: string;
  mono?: boolean;
}

/**
 * Copyable text with one-click copy.
 *
 * @example
 * <CopyableText text={record.id.toString()} />
 */
export const CopyableText: React.FC<CopyableTextProps> = ({
  text,
  display,
  ellipsis = true,
  className,
  mono = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      getMessage().success('Copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      getMessage().error('Copy failed');
    }
  };

  const ellipsisProp =
    ellipsis === true
      ? { tooltip: text }
      : ellipsis === false
        ? false
        : { tooltip: text };

  return (
    <span className={`ldw-copyable${mono ? ' ldw-mono' : ''}${className ? ` ${className}` : ''}`}>
      <Typography.Text ellipsis={ellipsisProp} className="ldw-copyable-text">
        {display ?? text}
      </Typography.Text>
      <button
        type="button"
        className="ldw-copyable-btn ldw-clickable"
        onClick={handleCopy}
        aria-label="Copy"
      >
        {copied ? <CheckOutlined /> : <CopyOutlined />}
      </button>
    </span>
  );
};

export interface PathTextProps {
  path: string;
  /** Use shortenPath (~/...) */
  shorten?: boolean;
  /** Middle-ellipsis style for long paths */
  middleEllipsis?: boolean;
  className?: string;
}

/**
 * Path display — shorten + middle ellipsis + copy.
 *
 * @example
 * <PathText path={record.path} shorten />
 */
export const PathText: React.FC<PathTextProps> = ({
  path,
  shorten = true,
  middleEllipsis = true,
  className,
}) => {
  const display = shorten ? shortenPath(path) : path;

  const middle = (value: string) => {
    if (!middleEllipsis || value.length < 48) return value;
    const head = value.slice(0, 20);
    const tail = value.slice(-24);
    return `${head}…${tail}`;
  };

  return (
    <CopyableText
      text={path}
      display={middle(display)}
      mono
      className={`ldw-path-text${className ? ` ${className}` : ''}`}
    />
  );
};

export default CopyableText;
